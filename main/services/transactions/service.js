import { randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { canApply, canUndo, checkOps, prune, statusOf, TX_ID } from '../../../renderer/src/core/transactions/plan.js';
import { MAX_BYTES, hashBuffer, readDocument } from '../fs/read-document.js';
import { DocError } from '../fs/safe-path.js';
import { within } from '../fs/tree.js';
import { encode } from '../fs/write-document.js';
import { writeJsonAtomic } from '../store/json-store.js';

const readOrNull = (p) => fsp.readFile(p).catch((e) => { if (e.code === 'ENOENT') return null; throw e; });
const hashOf = (buf) => (buf ? hashBuffer(buf) : null);
const outside = () => new DocError('E_PATH', 'The file is outside the workspace.');

async function atomicWrite(file, buf) {
  const mode = await fsp.stat(file).then((s) => s.mode & 0o777, () => 0o644);
  const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  let fh = null;
  try {
    fh = await fsp.open(tmp, 'wx', mode);
    await fh.writeFile(buf);
    await fh.sync();
    await fh.close();
    fh = null;
    await fsp.rename(tmp, file);
  } catch (err) {
    await fh?.close().catch(() => {});
    await fsp.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

async function guard(root, p) {
  const abs = path.resolve(p);
  if (!path.isAbsolute(p) || p.includes('\0') || !within(root, abs)) throw outside();
  const parent = await fsp.realpath(path.dirname(abs)).catch(() => { throw new DocError('E_NOENT', 'Folder not found.'); });
  if (!within(await fsp.realpath(root), parent)) throw outside();
  const st = await fsp.lstat(abs).catch(() => null);
  if (st && !st.isFile()) throw new DocError('E_NOTFILE', 'The path is not a regular file.');
  return abs;
}

// dir: journal folder; limits(): { keep, maxMB }
export function createTransactions({ dir, limits }) {
  const mpath = (id) => path.join(dir, id, 'manifest.json');
  const bpath = (id, h) => path.join(dir, id, 'blobs', h);
  const save = (m) => writeJsonAtomic(mpath(m.id), m);

  async function putBlob(id, buf) {
    const f = bpath(id, hashBuffer(buf));
    if (await fsp.access(f).then(() => true, () => false)) return 0;
    await fsp.mkdir(path.dirname(f), { recursive: true });
    await atomicWrite(f, buf);
    return buf.length;
  }

  async function getBlob(id, h) {
    const buf = await fsp.readFile(bpath(id, h)).catch(() => null);
    if (!buf || hashBuffer(buf) !== h) throw new DocError('E_IO', 'The saved copy is missing or damaged.');
    return buf;
  }

  async function load(id, root) {
    let m = null;
    if (typeof id === 'string' && TX_ID.test(id)) m = await fsp.readFile(mpath(id), 'utf8').then(JSON.parse, () => null);
    if (!m) throw new DocError('E_NOENT', 'Unknown transaction.');
    if (root && m.root !== root) throw new DocError('E_PATH', 'The transaction belongs to another workspace.');
    return m;
  }

  async function all() {
    const ids = await fsp.readdir(dir).catch(() => []);
    return (await Promise.all(ids.filter((i) => TX_ID.test(i)).map((i) => load(i).catch(() => null)))).filter(Boolean);
  }

  async function retain(protect) {
    const { keep, maxMB } = limits();
    const drop = prune(await all(), keep, maxMB * 1048576, protect);
    await Promise.all(drop.map((i) => fsp.rm(path.join(dir, i), { recursive: true, force: true })));
  }

  async function preview(root, { ops, label = '' }) {
    const bad = checkOps(ops);
    if (bad) throw new DocError('E_PATH', bad);
    const id = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
    const m = { v: 1, id, root, label, createdAt: Date.now(), status: 'previewed', bytes: 0, entries: [] };
    try {
      for (const o of ops) {
        const abs = await guard(root, o.path);
        const cur = await readOrNull(abs);
        let after = null;
        if (o.op === 'rename') {
          const absNew = await guard(root, o.newPath);
          if (!cur) throw new DocError('E_NOENT', 'File not found.');
          const curNew = await readOrNull(absNew);
          if (curNew) throw new DocError('E_EXISTS', 'Destination file already exists.');
          m.entries.push({ op: 'rename', path: abs, newPath: absNew, before: hashOf(cur), after: hashOf(cur), state: 'pending' });
          continue;
        } else if (o.op === 'create') {
          if (cur) throw new DocError('E_EXISTS', 'The file already exists.');
          after = encode(o.text);
        } else {
          if (!cur) throw new DocError('E_NOENT', 'File not found.');
          if (o.op === 'write') after = encode(o.text, await readDocument(abs));
        }
        if (after && after.length > MAX_BYTES) throw new DocError('E_TOOBIG', 'The file is too large.');
        if (cur) m.bytes += await putBlob(id, cur);
        if (after) m.bytes += await putBlob(id, after);
        m.entries.push({ op: o.op, path: abs, before: hashOf(cur), after: hashOf(after), state: 'pending' });
      }
      await save(m);
    } catch (err) {
      await fsp.rm(path.join(dir, id), { recursive: true, force: true }).catch(() => {});
      throw err;
    }
    await retain(id);
    return { id, entries: m.entries.map(({ op, path: p, before, after }) => ({ op, path: p, before, after })) };
  }

  async function apply(root, id) {
    const m = await load(id, root);
    if (m.status !== 'previewed') throw new DocError('E_CONFLICT', 'The transaction was already applied.');
    m.status = 'applying';
    await save(m);
    const results = [];
    for (const e of m.entries) {
      const r = { op: e.op, path: e.path };
      try {
        const abs = await guard(root, e.path);
        if (e.op === 'rename') {
          const absNew = await guard(root, e.newPath);
          const cur = hashOf(await readOrNull(abs));
          const curNew = await readOrNull(absNew);
          if (cur !== e.before || curNew !== null) {
            e.state = 'skipped';
            Object.assign(r, { status: 'skipped', reason: 'changed' });
          } else {
            await fsp.mkdir(path.dirname(absNew), { recursive: true });
            await fsp.rename(abs, absNew);
            e.state = 'applied';
            r.status = 'applied';
          }
        } else if (!canApply(e, hashOf(await readOrNull(abs)))) {
          e.state = 'skipped';
          Object.assign(r, { status: 'skipped', reason: 'changed' });
        } else {
          if (e.op === 'delete') await fsp.unlink(abs);
          else await atomicWrite(abs, await getBlob(id, e.after));
          e.state = 'applied';
          r.status = 'applied';
        }
      } catch (err) {
        e.state = 'failed';
        Object.assign(r, { status: 'failed', error: err.code ?? 'E_IO' });
      }
      results.push(r);
      await save(m);
    }
    m.status = statusOf(m.entries);
    await save(m);
    await retain(id);
    return { id, status: m.status, results };
  }

  async function undo(root, id) {
    const m = await load(id, root);
    if (!m.entries.some((e) => e.state === 'applied')) throw new DocError('E_CONFLICT', 'Nothing to undo.');
    const results = [];
    for (const e of [...m.entries].reverse()) {
      if (e.state !== 'applied') continue;
      const r = { op: e.op, path: e.path };
      try {
        const abs = await guard(root, e.path);
        if (e.op === 'rename') {
          const absNew = await guard(root, e.newPath);
          const curNew = hashOf(await readOrNull(absNew));
          const cur = await readOrNull(abs);
          if (curNew !== e.after || cur !== null) {
            Object.assign(r, { status: 'skipped', reason: 'changed' });
          } else {
            await fsp.mkdir(path.dirname(abs), { recursive: true });
            await fsp.rename(absNew, abs);
            e.state = 'undone';
            r.status = 'restored';
          }
        } else if (!canUndo(e, hashOf(await readOrNull(abs)))) {
          Object.assign(r, { status: 'skipped', reason: 'changed' });
        } else {
          if (e.op === 'create') await fsp.unlink(abs);
          else await atomicWrite(abs, await getBlob(id, e.before));
          e.state = 'undone';
          r.status = 'restored';
        }
      } catch (err) {
        Object.assign(r, { status: 'failed', error: err.code ?? 'E_IO' });
      }
      results.push(r);
    }
    m.status = statusOf(m.entries);
    await save(m);
    return { id, status: m.status, results };
  }

  async function list(root) {
    const items = (await all()).filter((m) => m.root === root).sort((a, b) => b.createdAt - a.createdAt)
      .map(({ id, label, createdAt, status, bytes, entries }) => ({ id, label, createdAt, status, bytes, count: entries.length }));
    return { items };
  }

  return { preview, apply, undo, list };
}
