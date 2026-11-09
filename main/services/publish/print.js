import { randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserWindow } from 'electron';
import { pagedHtml } from '../../../shared/paged-html.js';
import { RENDERER_DIR, SHARED_DIR } from '../../app/paths.js';
import { DocError } from '../fs/safe-path.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const INFO = "[document.documentElement.dataset.paged || '', document.documentElement.dataset.pagedError || '']";

// Open OS print dialog for the given publication HTML.
// Paginates in a hidden window just like pdf export (same HTML, same scripts).
// Never modifies the document.
export async function printDoc(event, { html }) {
  let win = null, dir = null;
  try {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'loto-print-'));
    const scripts = [path.join(SHARED_DIR, 'paged-boot.js'), path.join(RENDERER_DIR, 'vendor', 'pagedjs', 'paged.polyfill.js')].map((f) => pathToFileURL(f).href);
    const file = path.join(dir, 'index.html');
    await fsp.writeFile(file, pagedHtml(html, scripts), 'utf8');
    const parent = BrowserWindow.fromWebContents(event.sender);
    win = new BrowserWindow({ show: false, width: 1100, height: 1500, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: `print-${randomBytes(6).toString('hex')}`, spellcheck: false, backgroundThrottling: false } });
    win.webContents.session.webRequest.onBeforeRequest((d, cb) => { if (!/^(file|data|blob):/i.test(d.url)) { cb({ cancel: true }); } else { cb({}); } });
    await win.loadFile(file);
    const t0 = Date.now();
    for (;;) {
      const [state, message] = await win.webContents.executeJavaScript(INFO);
      if (state === 'done') break;
      if (state === 'error') throw new Error(message || 'pagination failed');
      if (Date.now() - t0 > 120000) throw new Error('pagination timed out');
      await sleep(150);
    }
    // webContents.print returns a promise in Electron 31+; resolve 'canceled' correctly
    const ok = await new Promise((resolve, reject) => {
      win.webContents.print({ printBackground: true, silent: false }, (success, reason) => {
        if (success) resolve(true);
        else if (reason === 'Print job canceled') resolve(false);
        else reject(new Error(reason || 'print failed'));
      });
    });
    return ok ? {} : { canceled: true };
  } catch (err) {
    throw err instanceof DocError ? err : new DocError('E_IO', `Print failed: ${err.message}`);
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    if (dir) await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
