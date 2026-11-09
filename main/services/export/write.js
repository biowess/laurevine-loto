import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { writeZip } from '../../core/zip.js';
import { DocError } from '../fs/safe-path.js';

const MAX_BYTES = 400_000_000;
const LABEL = { png: 'PNG image', svg: 'SVG image', txt: 'Plain text', md: 'Markdown', html: 'HTML page', zip: 'Zip archive' };

export const stem = (s) => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim().slice(0, 100) || 'Document';
export const inDir = (dir, file) => (dir && path.isAbsolute(dir) ? path.join(dir, file) : file);

const show = (event, fn, opts) => { const w = BrowserWindow.fromWebContents(event.sender); return w ? fn(w, opts) : fn(opts); };
const free = async (p) => {
  for (let i = 0; ; i++) {
    const c = i ? `${p} (${i})` : p;
    try { await fsp.access(c); } catch { return c; }
  }
};

// Save dialog or folder dialog first; nothing is overwritten silently (folders get a free name, files go through the OS confirmation).
export async function writeExport(event, p) {
  const name = stem(p.defaultName), parts = [];
  let total = 0;
  for (const e of p.entries) {
    const data = e.text !== undefined ? Buffer.from(e.text, 'utf8') : Buffer.from(e.data, 'base64');
    total += data.length;
    if (total > MAX_BYTES) throw new DocError('E_TOOBIG', 'The export is too large.');
    parts.push([e.name.replace(/\\/g, '/'), data]);
  }
  if (new Set(parts.map(([n]) => n.toLowerCase())).size !== parts.length) throw new DocError('E_ARGS', 'The export contains duplicate file names.');

  if (p.kind === 'folder') {
    const pick = await show(event, dialog.showOpenDialog.bind(dialog), { title: 'Choose where to create the package folder', defaultPath: p.dir || undefined, properties: ['openDirectory', 'createDirectory'] });
    if (pick.canceled || !pick.filePaths[0]) return { canceled: true };
    const root = await free(path.join(pick.filePaths[0], name));
    for (const [n, data] of parts) {
      const f = path.join(root, ...n.split('/')), rel = path.relative(root, f);
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new DocError('E_PATH', 'A file name in the package is not allowed.');
      await fsp.mkdir(path.dirname(f), { recursive: true });
      await fsp.writeFile(f, data, { flag: 'wx' });
    }
    return { path: root, size: total, files: parts.length };
  }

  const ext = p.kind === 'zip' ? 'zip' : p.ext;
  const pick = await show(event, dialog.showSaveDialog.bind(dialog), { title: 'Export', defaultPath: inDir(p.dir, `${name}.${ext}`), filters: [{ name: LABEL[ext], extensions: [ext] }], properties: ['showOverwriteConfirmation'] });
  if (pick.canceled || !pick.filePath) return { canceled: true };
  const dest = new RegExp(`\\.${ext}$`, 'i').test(pick.filePath) ? pick.filePath : `${pick.filePath}.${ext}`;
  const body = p.kind === 'zip' ? writeZip(parts) : parts[0][1], tmp = `${dest}.${Date.now().toString(36)}.part`;
  try {
    await fsp.writeFile(tmp, body, { flag: 'wx' });
    await fsp.rename(tmp, dest);
  } catch (err) {
    await fsp.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
  return { path: dest, size: body.length, files: parts.length };
}
