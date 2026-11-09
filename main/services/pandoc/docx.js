import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { buildReference } from '../../core/docx-reference.js';
import { firstLine, PROBE_TIMEOUT_MS } from '../../core/pandoc.js';
import { DocError } from '../fs/safe-path.js';
import { convert, detect } from './index.js';
import { runPandoc } from './runner.js';
import { inDir } from '../export/write.js';
import { isBatchDir } from '../publish/pdf.js';

export const FROM = 'markdown+lists_without_preceding_blankline+autolink_bare_uris+emoji-raw_tex-yaml_metadata_block';
export const NO_NET = { http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', no_proxy: '', NO_PROXY: '' };

export const messages = (stderr) => String(stderr || '').split(/\r?\n/).filter((l) => /^\[(WARNING|INFO)\]/.test(l)).slice(0, 30).map((l) => l.replace(/^\[\w+\]\s*/, '').slice(0, 300));

async function reference(info, dir, style) {
  if (!style) return null;
  try {
    const file = path.join(dir, 'reference.docx');
    const r = await runPandoc(info.path, ['-o', file, '--print-default-data-file', 'reference.docx'], { timeoutMs: PROBE_TIMEOUT_MS });
    if (!r.ok) return null;
    await fsp.writeFile(file, buildReference(await fsp.readFile(file), style));
    return file;
  } catch { return null; }
}

// Save dialog first; Pandoc writes into a temp folder and the result is copied beside the destination, then renamed over it.
export async function exportDocx(event, p) {
  const sender = event.sender, info = await detect();
  if (!info.found || !info.supported) throw new DocError('E_PANDOC', info.message || 'Pandoc is not available.');
  const parent = BrowserWindow.fromWebContents(sender);
  const name = p.defaultName.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim().slice(0, 100) || 'Document';
  let dest;
  if (p.batch) {
    if (!isBatchDir(event, p.dir)) throw new DocError('E_PATH', 'Choose the output folder first.');
    dest = path.join(p.dir, `${name}.docx`);
    for (let n = 2; !p.overwrite && n < 1000; n++) {
      try { await fsp.access(dest); } catch { break; }
      dest = path.join(p.dir, `${name} (${n}).docx`);
    }
  } else {
    const opts = { title: 'Export DOCX', defaultPath: inDir(p.dir, `${name}.docx`), filters: [{ name: 'Word document', extensions: ['docx'] }], properties: ['showOverwriteConfirmation'] };
    const pick = await (parent ? dialog.showSaveDialog(parent, opts) : dialog.showSaveDialog(opts));
    if (pick.canceled || !pick.filePath) return { canceled: true };
    dest = /\.docx$/i.test(pick.filePath) ? pick.filePath : `${pick.filePath}.docx`;
  }
  let dir = null, part = null;
  try {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'loto-docx-'));
    const out = path.join(dir, 'out.docx'), referenceDoc = await reference(info, dir, p.style);
    let resourcePath;
    if (p.baseDir && path.isAbsolute(p.baseDir)) { try { if ((await fsp.stat(p.baseDir)).isDirectory()) resourcePath = p.baseDir; } catch { /* no image folder */ } }
    const r = await convert(sender, p.id, {
      from: FROM, to: 'docx', input: p.markdown, output: out, sandbox: false, standalone: true, toc: p.toc === true, ...(p.toc && p.tocDepth ? { tocDepth: p.tocDepth } : {}),
      metadata: p.metadata, referenceDoc: referenceDoc || undefined, resourcePath, extraEnv: NO_NET,
    });
    if (r.canceled) return { canceled: true };
    if (r.timedOut) throw new DocError('E_PANDOC', 'Pandoc took longer than the time limit and was stopped.');
    if (!r.ok) throw new DocError('E_PANDOC', `Pandoc failed${firstLine(r.stderr) ? `: ${firstLine(r.stderr)}` : '.'}`);
    const size = (await fsp.stat(out)).size;
    part = `${dest}.${Date.now().toString(36)}.part`;
    await fsp.copyFile(out, part);
    await fsp.rename(part, dest);
    part = null;
    return { path: dest, size, reference: referenceDoc ? 'generated' : 'default', pandocVersion: info.version, messages: messages(r.stderr) };
  } finally {
    if (part) await fsp.rm(part, { force: true }).catch(() => {});
    if (dir) await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
