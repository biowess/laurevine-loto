// Test-only module hooks: replace Electron-bound modules with stubs driven by globalThis.__loto.
const STUBS = {
  '/main/services/fs/dialogs.js': 'export const pickOpen = async (e, o) => globalThis.__loto.pickOpen(o); export const pickSave = async (e, o) => globalThis.__loto.pickSave(o);',
  '/main/services/fs/index.js': 'export const recentsService = async () => globalThis.__loto.recents;',
  '/main/services/history/index.js': 'export const track = async (fn) => { try { await fn(globalThis.__loto.history); } catch {} };',
  '/main/services/workspace/index.js': 'export const activeRoot = () => globalThis.__loto.root;',
  '/main/services/publish/pdf.js': 'export const isBatchDir = (e, d) => globalThis.__loto.batch.has(d);',
};
const ELECTRON = `const L = () => globalThis.__loto;
export const shell = { openPath: (p) => L().shell.openPath(p), showItemInFolder: (p) => L().shell.showItem(p) };
export const dialog = { showSaveDialog: (...a) => L().dialog.save(...a), showOpenDialog: (...a) => L().dialog.open(...a) };
export const BrowserWindow = { fromWebContents: () => null };
export const app = { getPath: () => L().userData };`;

export async function resolve(spec, ctx, next) {
  if (spec === 'electron') return { url: 'loto-stub:electron', shortCircuit: true };
  const r = await next(spec, ctx);
  const k = Object.keys(STUBS).find((s) => r.url.endsWith(s));
  return k ? { url: `loto-stub:${k}`, shortCircuit: true } : r;
}

export async function load(url, ctx, next) {
  if (!url.startsWith('loto-stub:')) return next(url, ctx);
  const key = url.slice('loto-stub:'.length);
  return { format: 'module', source: key === 'electron' ? ELECTRON : STUBS[key], shortCircuit: true };
}
