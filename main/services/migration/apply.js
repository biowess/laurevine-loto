import { promises as fsp, constants as K } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { CH } from '../../../shared/channels.js';
import { DocError } from '../fs/safe-path.js';
import { isIgnored, within } from '../fs/tree.js';
import { transactions } from '../transactions/index.js';
import { workspaceRegistry } from '../workspace/index.js';
import { extractZip, safeEntryName, unwrap } from './extract.js';
import { isPicked } from './index.js';
import { classify } from '../../../renderer/src/core/migration/report.js';
import { MAX_DOC, planConversions, planCopy } from '../../../renderer/src/core/migration/convert.js';

const dests = new Set(), made = new Map(), running = new Map();
const CHUNK = 500, MAX_FILES = 100000, LOG_FILE = '.laurevine/migration-log.json';
const key = (id, p) => `${id}:${p}`;
const rel = (r) => r.split('/');

export async function pickDest(event, mode) {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const opts = { title: mode === 'new' ? 'Choose an empty folder for the new workspace' : 'Choose where to put the copy', properties: ['openDirectory', 'createDirectory'] };
  const r = await (parent ? dialog.showOpenDialog(parent, opts) : dialog.showOpenDialog(opts));
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  const p = await fsp.realpath(r.filePaths[0]);
  dests.add(key(event.sender.id, p));
  return { path: p, name: path.basename(p) || p, empty: (await fsp.readdir(p)).length === 0 };
}

export function cancelCopy(wcId) {
  const c = running.get(wcId);
  if (c) c.canceled = true;
}

async function walk(root, cur) {
  const files = [], queue = [['', 0]];
  for (let n = 0; n < queue.length && files.length < MAX_FILES; n++) {
    const [dir, depth] = queue[n];
    let ents;
    try { ents = await fsp.readdir(path.join(root, dir), { withFileTypes: true }); } catch { continue; }
    for (const d of ents) {
      const r = dir ? `${dir}/${d.name}` : d.name;
      if (cur.canceled) return files;
      if (isIgnored(d.name) || d.name.toLowerCase() === '.trash' || r === '.obsidian' || d.isSymbolicLink()) continue;
      if (d.isDirectory()) { if (depth < 40) queue.push([r, depth + 1]); continue; }
      if (!d.isFile()) continue;
      const st = await fsp.stat(path.join(root, r)).catch(() => null);
      if (st) files.push({ path: r, size: st.size });
    }
  }
  return files;
}

async function freeDir(parent, base) {
  for (let i = 1; i < 100; i++) {
    const p = path.join(parent, i === 1 ? base : `${base}-${i}`);
    try { await fsp.mkdir(p); return p; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  throw new DocError('E_EXISTS', 'No free folder name was found in the destination.');
}

async function journal(target, copied, log) {
  const docs = [];
  for (const f of copied.filter((c) => classify(c.path) === 'document' && c.size <= MAX_DOC)) {
    const text = await fsp.readFile(path.join(target, ...rel(f.path)), 'utf8').catch(() => null);
    if (text !== null && !text.includes('\0')) docs.push({ path: f.path, text });
  }
  const plan = planConversions(docs, copied.map((c) => c.path));
  if (!plan.files.length) return null;
  const ids = [], parts = Math.ceil(plan.files.length / CHUNK);
  for (let i = 0; i < parts; i++) {
    const ops = plan.files.slice(i * CHUNK, (i + 1) * CHUNK).map((f) => ({ op: 'write', path: path.join(target, ...rel(f.path)), text: f.text }));
    ids.push((await transactions().preview(target, { ops, label: `Convert wiki-links to relative links${parts > 1 ? ` (${i + 1}/${parts})` : ''}` })).id);
  }
  log.push({ op: 'convert-planned', path: '', reason: `${plan.links} links in ${plan.files.length} documents, not applied yet` });
  return { ids, files: plan.files.length, links: plan.links, skipped: plan.skipped, samples: plan.files.slice(0, 8).map((f) => ({ path: f.path, count: f.count, examples: f.examples })) };
}

// Copies documents and attachments (never the source) into a new folder; originals are only read. ZIPs with unsafe entry names are rejected whole.
export async function startCopy(sender, p) {
  if (!isPicked(sender.id, p.source)) throw new DocError('E_PATH', 'Choose the source first.');
  if (!dests.has(key(sender.id, p.dest))) throw new DocError('E_PATH', 'Choose the destination first.');
  if (running.has(sender.id)) throw new DocError('E_IO', 'An import is already running.');
  const cur = { canceled: false }, log = [];
  running.set(sender.id, cur);
  let tmp = null, target = null, copied = [];
  try {
    const st = await fsp.stat(p.source).catch(() => { throw new DocError('E_NOENT', 'The source no longer exists.'); });
    const zip = st.isFile() && /\.zip$/i.test(p.source);
    if (!zip && !st.isDirectory()) throw new DocError('E_NOTFILE', 'Choose a folder or a .zip file.');
    const dest = await fsp.realpath(p.dest).catch(() => { throw new DocError('E_NOENT', 'The destination no longer exists.'); });
    let root = zip ? null : await fsp.realpath(p.source);
    if (root && (within(root, dest) || within(dest, root))) throw new DocError('E_PATH', 'The destination and the source cannot contain each other.');
    if (p.mode === 'new' && (await fsp.readdir(dest)).length) throw new DocError('E_EXISTS', 'The new workspace folder must be empty.');
    if (zip) {
      tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'loto-import-'));
      const x = await extractZip(p.source, tmp);
      if (x.skipped.some((s) => s.reason === 'unsafe path')) throw new DocError('E_PATH', 'The archive contains unsafe paths and was rejected. Nothing was imported.');
      log.push(...x.skipped.map((s) => ({ op: 'skip', path: s.path, reason: s.reason })));
      root = await unwrap(tmp);
    }
    const files = await walk(root, cur), list = planCopy(files);
    log.push(...files.filter((f) => !list.includes(f)).map((f) => ({ op: 'skip', path: f.path, reason: 'not a document or attachment' })));
    const name = String(p.name || path.basename(p.source).replace(/\.zip$/i, '') || 'notes').slice(0, 100);
    if (cur.canceled) return { canceled: true };
    target = p.mode === 'new' ? dest : await freeDir(dest, name.replace(/[^\w.-]+/g, '-').replace(/^[-.]+/, '') || 'notes');
    let bytes = 0, last = 0;
    for (const f of list) {
      if (cur.canceled) break;
      const parts = safeEntryName(f.path), out = parts && path.join(target, ...rel(parts));
      if (!out || !within(target, out)) { log.push({ op: 'skip', path: f.path, reason: 'unsafe path' }); continue; }
      try {
        await fsp.mkdir(path.dirname(out), { recursive: true });
        await fsp.copyFile(path.join(root, ...rel(parts)), out, K.COPYFILE_EXCL);
        copied.push(f);
        bytes += f.size;
        log.push({ op: 'copy', path: parts });
      } catch (e) { log.push({ op: 'skip', path: parts, reason: e.code === 'EEXIST' ? 'already exists, kept' : 'could not be copied' }); }
      if (Date.now() - last > 100 && !sender.isDestroyed()) { last = Date.now(); sender.send(CH.MIGRATION_PROGRESS, { phase: 'copy', done: copied.length, total: list.length, bytes }); }
    }
    if (cur.canceled) {
      for (const f of copied) await fsp.rm(path.join(target, ...rel(f.path)), { force: true }).catch(() => {});
      if (p.mode !== 'new') await fsp.rm(target, { recursive: true, force: true }).catch(() => {});
      return { canceled: true };
    }
    if (p.mode === 'new') {
      await fsp.mkdir(path.join(target, '.laurevine'), { recursive: true });
      await fsp.writeFile(path.join(target, '.laurevine', 'workspace.json'), JSON.stringify({ name: name.trim() || 'Workspace' }, null, 2), { flag: 'wx' });
      (await workspaceRegistry()).touch(target, name.trim() || 'Workspace');
    }
    const tx = p.convert ? await journal(target, copied, log) : null;
    if (tx) made.set(key(sender.id, target), tx.ids);
    await fsp.mkdir(path.join(target, '.laurevine'), { recursive: true });
    await fsp.writeFile(path.join(target, LOG_FILE), JSON.stringify({ version: 1, source: path.basename(p.source), mode: p.mode, date: new Date().toISOString(), entries: log }, null, 1), { flag: 'wx' }).catch(() => {});
    const skipped = log.filter((e) => e.op === 'skip').length;
    return { root: target, name, copied: copied.length, skipped, bytes, logFile: LOG_FILE, logTotal: log.length, log: log.slice(0, 500), tx };
  } finally {
    running.delete(sender.id);
    if (tmp) await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

async function runTx(sender, root, fn) {
  const ids = made.get(key(sender.id, root));
  if (!ids) throw new DocError('E_PATH', 'No conversion was prepared for this copy.');
  const total = { done: 0, skipped: 0, failed: 0 };
  for (const id of ids) {
    const r = await fn(root, id);
    for (const x of r.results) { if (x.status === 'applied' || x.status === 'restored') total.done++; else if (x.status === 'failed') total.failed++; else total.skipped++; }
  }
  return total;
}

export const applyConversion = (sender, { root }) => runTx(sender, root, (r, id) => transactions().apply(r, id));
export const revertConversion = (sender, { root }) => runTx(sender, root, (r, id) => transactions().undo(r, id));
