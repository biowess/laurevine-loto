import { Worker } from 'node:worker_threads';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { CH } from '../../../shared/channels.js';
import { DocError } from '../fs/safe-path.js';

const active = new Map(); // webContents id -> { w, id, tmp, settle }
const picked = new Set(); // `${webContents id}:${path}` of sources chosen in a dialog
let seq = 0;

const emit = (s, p) => { if (!s.isDestroyed()) s.send(CH.MIGRATION_PROGRESS, p); };

// Only a folder or .zip chosen in this window's dialog can be scanned.
export async function pickSource(event, kind) {
  const parent = BrowserWindow.fromWebContents(event.sender), zip = kind === 'zip';
  const opts = zip ? { title: 'Choose a Markdown archive', properties: ['openFile'], filters: [{ name: 'ZIP archive', extensions: ['zip'] }] } : { title: 'Choose a folder to scan', properties: ['openDirectory'] };
  const pick = await (parent ? dialog.showOpenDialog(parent, opts) : dialog.showOpenDialog(opts));
  if (pick.canceled || !pick.filePaths[0]) return { canceled: true };
  const p = pick.filePaths[0];
  picked.add(`${event.sender.id}:${p}`);
  return { path: p, kind: zip ? 'zip' : 'folder', name: path.basename(p) };
}

export const isPicked = (wcId, p) => picked.has(`${wcId}:${p}`);

export function cancelScan(wcId) {
  const cur = active.get(wcId);
  if (cur) cur.settle({ canceled: true });
}

// One scan per window; a new scan or cancel stops the previous worker and removes its temp folder. Progress arrives as migration:progress.
export async function startScan(sender, { path: source }) {
  cancelScan(sender.id);
  if (!picked.has(`${sender.id}:${source}`)) throw new DocError('E_PATH', 'Choose the source first.');
  let st;
  try { st = await fsp.stat(source); } catch { throw new DocError('E_NOENT', 'The source no longer exists.'); }
  const kind = st.isDirectory() ? 'folder' : st.isFile() && /\.zip$/i.test(source) ? 'zip' : null;
  if (!kind) throw new DocError('E_NOTFILE', 'Choose a folder or a .zip file.');
  const tmp = kind === 'zip' ? await fsp.mkdtemp(path.join(os.tmpdir(), 'loto-migrate-')) : null;
  return new Promise((resolve, reject) => {
    const id = ++seq, w = new Worker(new URL('./worker.js', import.meta.url)), cur = { w, id };
    const finish = (fn) => {
      if (active.get(sender.id) === cur) active.delete(sender.id);
      w.terminate().catch(() => {}).finally(async () => { if (tmp) await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {}); fn(); });
    };
    cur.settle = (v) => finish(() => resolve(v));
    active.set(sender.id, cur);
    w.on('message', (m) => {
      if (m.id !== id) return;
      if (m.type === 'progress') emit(sender, { id, files: m.files, documents: m.documents, bytes: m.bytes });
      else if (m.error) finish(() => reject(new DocError('E_IO', m.error)));
      else finish(() => resolve({ id, report: m.report }));
    });
    w.on('error', (e) => finish(() => reject(new DocError('E_IO', String((e && e.message) || e)))));
    w.postMessage({ id, source, kind, tmp });
  });
}
