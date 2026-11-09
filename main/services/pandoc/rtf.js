import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { firstLine } from '../../core/pandoc.js';
import { DocError } from '../fs/safe-path.js';
import { inDir, stem } from '../export/write.js';
import { FROM, NO_NET, messages } from './docx.js';
import { convert, detect } from './index.js';

// Save dialog first; Pandoc writes into a temp folder and the result is copied beside the destination, then renamed over it.
export async function exportRtf(event, p) {
  const sender = event.sender, info = await detect();
  if (!info.found || !info.supported) throw new DocError('E_PANDOC', info.message || 'Pandoc is not available.');
  const parent = BrowserWindow.fromWebContents(sender);
  const opts = { title: 'Export RTF', defaultPath: inDir(p.dir, `${stem(p.defaultName)}.rtf`), filters: [{ name: 'Rich Text Format', extensions: ['rtf'] }], properties: ['showOverwriteConfirmation'] };
  const pick = await (parent ? dialog.showSaveDialog(parent, opts) : dialog.showSaveDialog(opts));
  if (pick.canceled || !pick.filePath) return { canceled: true };
  const dest = /\.rtf$/i.test(pick.filePath) ? pick.filePath : `${pick.filePath}.rtf`;
  let dir = null, part = null;
  try {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'loto-rtf-'));
    const out = path.join(dir, 'out.rtf');
    let resourcePath;
    if (p.baseDir && path.isAbsolute(p.baseDir)) { try { if ((await fsp.stat(p.baseDir)).isDirectory()) resourcePath = p.baseDir; } catch { /* no image folder */ } }
    const r = await convert(sender, p.id, {
      from: FROM, to: 'rtf', input: p.markdown, output: out, sandbox: false, standalone: true, toc: p.toc === true, ...(p.toc && p.tocDepth ? { tocDepth: p.tocDepth } : {}),
      metadata: p.metadata, resourcePath, extraEnv: NO_NET,
    });
    if (r.canceled) return { canceled: true };
    if (r.timedOut) throw new DocError('E_PANDOC', 'Pandoc took longer than the time limit and was stopped.');
    if (!r.ok) throw new DocError('E_PANDOC', `Pandoc failed${firstLine(r.stderr) ? `: ${firstLine(r.stderr)}` : '.'}`);
    const size = (await fsp.stat(out)).size;
    part = `${dest}.${Date.now().toString(36)}.part`;
    await fsp.copyFile(out, part);
    await fsp.rename(part, dest);
    part = null;
    return { path: dest, size, pandocVersion: info.version, messages: messages(r.stderr) };
  } finally {
    if (part) await fsp.rm(part, { force: true }).catch(() => {});
    if (dir) await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
