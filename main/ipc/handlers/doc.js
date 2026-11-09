import path from 'node:path';
import { shell } from 'electron';
import { pickOpen, pickSave } from '../../services/fs/dialogs.js';
import { recentsService } from '../../services/fs/index.js';
import { track } from '../../services/history/index.js';
import { readDocument } from '../../services/fs/read-document.js';
import { renameDocument } from '../../services/fs/rename-document.js';
import { DocError, safePath, toDocError } from '../../services/fs/safe-path.js';
import { writeDocument } from '../../services/fs/write-document.js';
import { writeExport } from '../../services/export/write.js';
import { existingIn, writeTree } from '../../services/export/tree.js';
import { within } from '../../services/fs/tree.js';
import { activeRoot } from '../../services/workspace/index.js';

const fail = (err) => {
  const e = toDocError(err);
  const known = e instanceof DocError;
  if (!known) console.error('[doc]', e);
  return { ok: false, error: known ? { code: e.code, message: e.message } : { code: 'E_IO', message: 'The operation failed.' } };
};
const run = async (fn) => {
  try { return { ok: true, ...(await fn()) }; } catch (err) { return fail(err); }
};
const remember = async (p) => {
  try { (await recentsService()).add(p); } catch (err) { console.error('[recents]', err.message); }
};
const fmt = (p) => ({ encoding: p.encoding, bom: p.bom, eol: p.eol, dominantEol: p.dominantEol });

export const open = ({ path, recent }) => run(async () => {
  const doc = await readDocument(path);
  if (recent !== false) await remember(doc.path);
  return { doc };
});

export async function openDialog(payload, event) {
  const paths = await pickOpen(event, payload ?? {});
  const docs = [], errors = [];
  for (const p of paths) {
    try {
      const doc = await readDocument(p);
      if (payload?.recent !== false) await remember(doc.path);
      docs.push(doc);
    } catch (err) {
      errors.push({ path: p, ...fail(err).error });
    }
  }
  return { ok: true, canceled: paths.length === 0, docs, errors };
}

export const save = (p) => run(async () => {
  const r = await writeDocument(p.path, p.text, { ...fmt(p), expectedHash: p.expectedHash });
  await track((h) => h.snapshot({ path: p.path, text: p.text, label: p.autosave === true ? 'Autosave' : 'Saved' }));
  return r;
});

const saveTo = (title, trackRecent) => (p, event) => run(async () => {
  let target = await pickSave(event, { defaultPath: p.defaultPath, title });
  if (!target) return { canceled: true };
  // Linux/macOS dialogs do not append the filter extension, so an extensionless name would be saved as-is: default to .md.
  if (!path.extname(target)) {
    target += '.md';
    if ((await safePath(target, { mustExist: false })).stat) throw new DocError('E_EXISTS', `${path.basename(target)} already exists. Choose another name or type the extension.`);
  }
  const r = await writeDocument(target, p.text, fmt(p));
  if (trackRecent) {
    await remember(r.path);
    await track((h) => h.snapshot({ path: r.path, text: p.text, label: 'Saved' }));
  }
  return { canceled: false, ...r };
});
export const saveAs = saveTo('Save As', true);
export const saveCopy = saveTo('Save a Copy', false);

export const stat = ({ path }) => run(async () => {
  try {
    const { stat: s } = await safePath(path, { mustExist: false });
    return s ? { exists: true, mtimeMs: s.mtimeMs, size: s.size, birthtimeMs: s.birthtimeMs } : { exists: false };
  } catch (err) {
    if (err.code === 'E_NOENT') return { exists: false };
    throw err;
  }
});

export const rename = (p) => run(async () => {
  const r = await renameDocument(p.path, p.name);
  if (r.path !== r.from) { try { (await recentsService()).rename(r.from, r.path); } catch (err) { console.error('[recents]', err.message); } await track((h) => h.relink(r.from, r.path)); }
  return { path: r.path };
});

export const reveal = ({ path: input }) => run(async () => {
  let p, stat = null;
  try { ({ path: p, stat } = await safePath(input, { dir: true })); } catch (err) { if (err.code !== 'E_NOENT') throw err; p = path.resolve(input); }
  const openDir = async (d) => { if (await shell.openPath(d)) throw new DocError('E_IO', 'The file manager could not be opened.'); };
  if (stat && stat.isDirectory()) await openDir(p);
  else if (stat && process.platform !== 'linux') shell.showItemInFolder(p);
  else await openDir(path.dirname(p));
  return {};
});

const RUNNABLE = /\.(exe|bat|cmd|com|msi|scr|pif|cpl|ps1|vbs|jse?|wsf|hta|lnk|reg|dll|app|sh|command|desktop|jar|appimage)$/i;
export const openExternal = ({ path }, event) => run(async () => {
  const root = activeRoot(event), p = (await safePath(path)).path;
  if (!root || !within(root, p) || RUNNABLE.test(p)) throw new DocError('E_PATH', 'That file cannot be opened from here.');
  if (await shell.openPath(p)) throw new DocError('E_IO', 'No application could open that file.');
  return {};
});

export const exportWrite = (p, event) => run(() => writeExport(event, p));

export const exportExists = (p, event) => run(async () => ({ exists: await existingIn(event, p) }));

export const exportTree = (p, event) => run(() => writeTree(event, p));