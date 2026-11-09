import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from '../fs/safe-path.js';
import { writeJsonAtomic } from '../store/json-store.js';
import { LABELS, fileId, hashText, historyKey, prune, relinkKey, wantSnapshot } from '../../core/history/retention.js';

const DOC_MAX = 8e6;
const pub = ({ id, at, size, label, pinned }) => ({ id, at, size, label, pinned });
const exists = (p) => fsp.access(p).then(() => true, () => false);

// <dir>/<fileId>/index.json + <sha256>.md blobs (one blob per distinct content). Newest version is last.
export function createHistory({ dir, limits, now = Date.now }) {
  const files = new Map();
  let chain = Promise.resolve();
  const seq = (fn) => (chain = chain.then(fn, fn));
  const fdir = (f) => path.join(dir, f);
  const blob = (f, hash) => path.join(dir, f, `${hash}.md`);
  const locate = (p) => fileId(historyKey(p));
  const find = (p) => {
    const f = locate(p), v = files.get(f)?.versions.find((x) => x.id === p.id);
    if (!v) throw new DocError('E_NOENT', 'That version no longer exists.');
    return { f, v };
  };

  const commit = async (f) => {
    const d = files.get(f);
    if (!d.versions.length) { files.delete(f); return fsp.rm(fdir(f), { recursive: true, force: true }); }
    const used = new Set(d.versions.map((v) => `${v.hash}.md`));
    used.add('index.json');
    for (const n of await fsp.readdir(fdir(f))) if (!used.has(n)) await fsp.rm(path.join(fdir(f), n), { force: true });
    await writeJsonAtomic(path.join(fdir(f), 'index.json'), d);
  };

  const enforce = async () => {
    const items = [];
    for (const [f, d] of files) for (const v of d.versions) items.push({ f, v, at: v.at, size: v.size, pinned: v.pinned });
    const touched = new Set();
    for (const i of prune(items, { now: now(), ...limits() })) {
      const d = files.get(i.f);
      d.versions.splice(d.versions.indexOf(i.v), 1);
      touched.add(i.f);
    }
    for (const f of touched) await commit(f);
  };

  const init = () => seq(async () => {
    await fsp.mkdir(dir, { recursive: true });
    for (const f of await fsp.readdir(dir)) {
      if (!/^[0-9a-f]{32}$/.test(f)) continue;
      try {
        const d = JSON.parse(await fsp.readFile(path.join(dir, f, 'index.json'), 'utf8'));
        if (typeof d.key === 'string' && Array.isArray(d.versions)) files.set(f, d);
      } catch { /* unreadable history is skipped */ }
    }
    await enforce();
  });

  const snapshot = (p) => seq(async () => {
    if (!LABELS.includes(p.label)) throw new DocError('E_ARG', 'Unknown history label.');
    const size = Buffer.byteLength(p.text, 'utf8');
    if (size > DOC_MAX) return { skipped: true };
    const f = locate(p), d = files.get(f) ?? { key: historyKey(p), versions: [] };
    const hash = hashText(p.text), t = now(), last = d.versions.at(-1);
    if (!wantSnapshot(p.label, last, { hash, size, at: t }, limits())) return { skipped: true };
    await fsp.mkdir(fdir(f), { recursive: true });
    const b = blob(f, hash);
    if (!(await exists(b))) { await fsp.writeFile(`${b}.tmp`, p.text, 'utf8'); await fsp.rename(`${b}.tmp`, b); }
    const at = Math.max(t, (last?.at ?? 0) + 1), v = { id: at.toString(36), hash, at, size, label: p.label, pinned: false };
    d.versions.push(v);
    files.set(f, d);
    await commit(f);
    await enforce();
    return { skipped: false, id: v.id };
  });

  const list = (p) => seq(async () => ({ versions: [...(files.get(locate(p))?.versions ?? [])].reverse().map(pub) }));
  const read = (p) => seq(async () => { const { f, v } = find(p); return { version: pub(v), text: await fsp.readFile(blob(f, v.hash), 'utf8') }; });

  // Returns the version text; the caller applies it. The current text (if given) is kept first as "Before restore".
  const restore = async (p) => {
    const r = await read(p);
    if (typeof p.current === 'string') await snapshot({ path: p.path, docId: p.docId, text: p.current, label: 'Before restore' });
    return r;
  };

  const pin = (p) => seq(async () => { const { f, v } = find(p); v.pinned = p.pinned !== false; await commit(f); return { version: pub(v) }; });

  const remove = (p) => seq(async () => {
    const f = locate(p), d = files.get(f);
    if (!d) return { removed: 0 };
    const n = d.versions.length;
    if (p.id) { find(p); d.versions = d.versions.filter((v) => v.id !== p.id); } else d.versions = [];
    await commit(f);
    return { removed: n - d.versions.length };
  });

  const stats = (p) => seq(async () => {
    const only = p ? locate(p) : null, s = { files: 0, versions: 0, pinned: 0, bytes: 0, oldest: null };
    for (const [f, d] of files) {
      if (only && f !== only) continue;
      s.files++;
      for (const v of d.versions) { s.versions++; s.bytes += v.size; if (v.pinned) s.pinned++; if (s.oldest === null || v.at < s.oldest) s.oldest = v.at; }
    }
    return s;
  });

  // History follows a renamed or moved file (or folder); histories that collide are merged.
  const relink = (from, to) => seq(async () => {
    for (const [f, d] of [...files]) {
      const key = relinkKey(d.key, from, to), nf = key && fileId(key);
      if (!key || nf === f) continue;
      d.key = key;
      const dest = files.get(nf);
      if (!dest) {
        await fsp.rm(fdir(nf), { recursive: true, force: true });
        await fsp.rename(fdir(f), fdir(nf));
        files.delete(f);
        files.set(nf, d);
        await commit(nf);
        continue;
      }
      const ids = new Set(dest.versions.map((v) => v.id));
      for (const v of d.versions) {
        if (!(await exists(blob(nf, v.hash)))) await fsp.rename(blob(f, v.hash), blob(nf, v.hash));
        while (ids.has(v.id)) { v.at++; v.id = v.at.toString(36); }
        ids.add(v.id);
        dest.versions.push(v);
      }
      dest.versions.sort((a, b) => a.at - b.at);
      files.delete(f);
      await commit(nf);
      await fsp.rm(fdir(f), { recursive: true, force: true });
    }
  });

  const filesList = () => seq(async () => ({ files: [...files.values()].filter((d) => d.key.startsWith('p:') && d.versions.length).map((d) => ({ path: d.key.slice(2), versions: d.versions.length, last: d.versions.at(-1).at })) }));
  const clear = () => seq(async () => { const n = files.size; files.clear(); await fsp.rm(dir, { recursive: true, force: true }); await fsp.mkdir(dir, { recursive: true }); return { cleared: n }; });

  return { init, snapshot, list, read, restore, pin, remove, stats, relink, files: filesList, clear };
}
