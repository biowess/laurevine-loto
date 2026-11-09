import { randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserWindow, dialog } from 'electron';
import { CH } from '../../../shared/channels.js';
import { pagedHtml } from '../../../shared/paged-html.js';
import { RENDERER_DIR, SHARED_DIR } from '../../app/paths.js';
import { DocError } from '../fs/safe-path.js';
import { embeddedFonts } from '../../../shared/font-embed.js';
import { addOutline } from './outline.js';

const jobs = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NATIVE_OUTLINE = Number(process.versions.electron.split('.')[0]) >= 32;
const INFO = "[document.documentElement.dataset.paged || '', document.documentElement.dataset.pagedError || '', document.querySelectorAll('.pagedjs_page').length]";
const DONE = `({
  fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '')))],
  headings: [...document.querySelectorAll('.pagedjs_page')].flatMap((pg, i) => [...pg.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({ level: +h.tagName[1], title: h.textContent.trim().slice(0, 200), page: i })).filter((h) => h.title)),
})`;

export const cancelPdf = (sender, id) => { const stop = jobs.get(`${sender.id}:${id}`); if (stop) stop(); };

const batchDirs = new Set();
export const isBatchDir = (event, dir) => batchDirs.has(`${event.sender.id}:${dir}`);
const safeStem = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Document';

async function freePath(dir, name) {
  const stem = safeStem(name).replace(/\.pdf$/i, '');
  for (let n = 1; n < 1000; n++) {
    const file = path.join(dir, `${stem}${n > 1 ? ` (${n})` : ''}.pdf`);
    try { await fsp.access(file); } catch { return file; }
  }
  throw new DocError('E_EXISTS', 'Too many files with that name in the folder.');
}

export async function pickPdfDir(event) {
  const parent = BrowserWindow.fromWebContents(event.sender), opts = { title: 'Choose output folder', properties: ['openDirectory', 'createDirectory'] };
  const pick = await (parent ? dialog.showOpenDialog(parent, opts) : dialog.showOpenDialog(opts));
  if (pick.canceled || !pick.filePaths[0]) return { canceled: true };
  batchDirs.add(`${event.sender.id}:${pick.filePaths[0]}`);
  return { dir: pick.filePaths[0] };
}

// Save dialog first, then a hidden sandboxed window paginates the same publication HTML and polyfill as the preview and prints it.
// Temp files (HTML folder, output beside the destination) are removed on success, failure and cancel; the destination is replaced only by the final rename.
export async function exportPdf(event, p) {
  const sender = event.sender, key = `${sender.id}:${p.id}`;
  if (jobs.has(key)) throw new DocError('E_BUSY', 'This export is already running.');
  const emit = (phase, pct) => { if (!sender.isDestroyed()) sender.send(CH.PDF_PROGRESS, { id: p.id, phase, pct }); };
  let dest;
  if (p.dir) {
    if (!batchDirs.has(`${sender.id}:${p.dir}`)) throw new DocError('E_PATH', 'Choose the output folder first.');
    dest = p.overwrite ? path.join(p.dir, `${safeStem(p.name || p.title).replace(/\.pdf$/i, '')}.pdf`) : await freePath(p.dir, p.name || p.title);
  } else {
    const parent = BrowserWindow.fromWebContents(sender);
    const opts = { title: 'Export PDF', defaultPath: `${p.title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim().slice(0, 100) || 'Document'}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }], properties: ['showOverwriteConfirmation'] };
    const pick = await (parent ? dialog.showSaveDialog(parent, opts) : dialog.showSaveDialog(opts));
    if (pick.canceled || !pick.filePath) return { canceled: true };
    dest = /\.pdf$/i.test(pick.filePath) ? pick.filePath : `${pick.filePath}.pdf`;
  }
  let win = null, dir = null, tmp = null, stopped = false;
  jobs.set(key, () => { stopped = true; if (win && !win.isDestroyed()) win.destroy(); });
  const live = () => { if (stopped) throw new Error('canceled'); };
  try {
    emit('prepare', 5);
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'loto-pdf-'));
    const scripts = [path.join(SHARED_DIR, 'paged-boot.js'), path.join(RENDERER_DIR, 'vendor', 'pagedjs', 'paged.polyfill.js')].map((f) => pathToFileURL(f).href);
    const file = path.join(dir, 'index.html');
    await fsp.writeFile(file, pagedHtml(p.html, scripts), 'utf8');
    live();
    win = new BrowserWindow({ show: false, width: 1100, height: 1500, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: `pdf-${randomBytes(6).toString('hex')}`, spellcheck: false, backgroundThrottling: false } });
    // shortcut: request interception is sync/cancel-only; a stricter assert would count intercepted requests, upgrade if needed.
    win.webContents.session.webRequest.onBeforeRequest((d, cb) => { if (!/^(file|data|blob):/i.test(d.url)) { cb({ cancel: true }); } else { cb({}); } });
    emit('fonts', 10);
    await win.loadFile(file);
    const t0 = Date.now();
    let pages = 0;
    for (;;) {
      live();
      const [state, message, n] = await win.webContents.executeJavaScript(INFO);
      if (state === 'done') { pages = n; break; }
      if (state === 'error') throw new Error(message || 'pagination failed');
      if (Date.now() - t0 > 180000) throw new Error('pagination timed out');
      emit('paginate', Math.min(70, 15 + n));
      await sleep(150);
    }
    const { fonts, headings } = await win.webContents.executeJavaScript(DONE);
    live();
    emit('print', 80);
    let buf = await win.webContents.printToPDF({ preferCSSPageSize: true, printBackground: true, ...(NATIVE_OUTLINE ? { generateDocumentOutline: true } : {}) });
    live();
    let outline = NATIVE_OUTLINE ? 'native' : 'none';
    if (!NATIVE_OUTLINE && headings.length) { emit('outline', 90); buf = await addOutline(buf, headings); outline = 'pdf-lib'; }
    emit('save', 95);
    const embedded = embeddedFonts(buf);
    const fileSize = buf.length;
    tmp = `${dest}.${randomBytes(4).toString('hex')}.tmp`;
    await fsp.writeFile(tmp, buf, { flag: 'wx' });
    live();
    await fsp.rename(tmp, dest);
    tmp = null;
    emit('save', 100);
    return { path: dest, pages, fonts, outline, embedded, fileSize };
  } catch (err) {
    if (stopped) return { canceled: true };
    throw err instanceof DocError ? err : new DocError('E_IO', `PDF export failed: ${err.message}`);
  } finally {
    jobs.delete(key);
    if (win && !win.isDestroyed()) win.destroy();
    if (dir) await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    if (tmp) await fsp.rm(tmp, { force: true }).catch(() => {});
  }
}
