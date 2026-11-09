import { baseName } from '../../core/documents/paths.js';
import { hashText } from '../../core/documents/document.js';
import * as api from '../../services/doc-client.js';
import { confirmDialog, openPathDialog } from './dialogs.js';
import { mountCloseGuard } from './close-guard.js';
import { mountDrop } from './drop.js';
import { mountRename } from './rename.js';
import { mountTabCycle } from './tab-cycle.js';
import { mountEmptyState } from './empty-state.js';
import { mountNewDocument } from './new-document.js';
import { mountAutosave } from './autosave.js';
import { mountConflict } from './conflict.js';

export function register(ctx) {
  const { commands, store, ui } = ctx, D = ctx.services.documents;
  const active = () => { const id = store.get().documents.activeId; return id && D.getEntry(id) ? { id, e: D.getEntry(id) } : null; };
  const fmt = (d) => ({ text: d.text, encoding: d.encoding, bom: d.bom, eol: d.eol, dominantEol: d.dominantEol });
  const fail = (path, err) => ui.toast(`${path ? baseName(path) + ': ' : ''}${err.message || 'The operation failed.'}`, { timeout: 5000 });
  const ERR = (err) => (err && err.message) || 'The operation failed.';
  const failed = (a, kind, err) => {
    if (kind === 'copy') return fail(a.e.doc.path, err);
    D.updateDoc(a.id, { saveFailed: true });
    const t = ui.toast(`Save failed: ${ERR(err)} Retry, or use Save As to save it elsewhere.`, { timeout: 10000 });
    [['Retry', () => write(kind, a)], ['Save As…', () => write('as', a)]].forEach(([label, run]) => t.append(ui.h('button', { class: 'lv-toast__btn', onclick: () => { t.remove(); run(); } }, label)));
  };

  const show = (doc) => { const id = D.findByPath(doc.path); if (id) D.activate(id); else D.openDocument({ ...doc, name: baseName(doc.path), diskHash: doc.hash }); };
  async function openOne(p) {
    const id = D.findByPath(p);
    if (id) { D.activate(id); return null; }
    try { show((await api.openPath(p)).doc); return null; } catch (err) { return ERR(err); }
  }
  async function openPaths(paths) {
    for (const p of paths) { const m = await openOne(p); if (m) ui.toast(`${baseName(p)}: ${m}`, { timeout: 5000 }); }
  }

  async function openDialog() {
    const a = active();
    try {
      const r = await api.openDialog(a && a.e.doc.path ? a.e.doc.path.replace(/[\\/][^\\/]*$/, '') || undefined : undefined);
      r.docs.forEach(show);
      r.errors.forEach((x) => fail(x.path, x));
    } catch (err) { fail('', err); }
  }

  async function write(kind, a, force, auto) {
    ctx.services.documents.editorRun('flush');
    const d = a.e.doc, sent = d.text;
    if (kind === 'save' && d.deleted) kind = 'as';
    if (kind === 'save' && !force && d.conflict) { if (!auto) ctx.services.conflict.raise(a.id, true); return false; }
    try {
      if (kind === 'save') {
        D.updateDoc(a.id, { saving: true });
        const r = await api.saveDoc({ path: d.path, ...fmt(d), expectedHash: force || !d.diskHash ? undefined : d.diskHash });
        D.updateDoc(a.id, { diskHash: r.hash, savedHash: hashText(sent), dirty: hashText(a.e.doc.text) !== hashText(sent), saveFailed: false, saving: false, conflict: false });
        return true;
      }
      const r = await (kind === 'copy' ? api.saveCopy : api.saveAs)({ ...fmt(d), defaultPath: d.path || (/\.[^./\\]+$/.test(d.name || '') ? d.name : `${d.name || 'Untitled'}.${ctx.settings.get('files.newExtension') || 'md'}`) });
      if (r.canceled) return false;
      if (kind === 'copy') { ui.toast(`Saved a copy as ${baseName(r.path)}`); return true; }
      D.updateDoc(a.id, { path: r.path, name: baseName(r.path), deleted: false, diskHash: r.hash, savedHash: hashText(sent), dirty: hashText(a.e.doc.text) !== hashText(sent), saveFailed: false, conflict: false });
      return true;
    } catch (err) {
      if (kind === 'save') D.updateDoc(a.id, { saving: false });
      if (err.code === 'E_CONFLICT') {
        D.updateDoc(a.id, { conflict: true });
        ctx.services.conflict.raise(a.id, !auto);
        return false;
      }
      failed(a, kind, err);
      return false;
    }
  }
  const saveById = (id) => { const e = D.getEntry(id); return e ? write(e.doc.path ? 'save' : 'as', { id, e }) : true; };

  const save = () => { const a = active(); if (a) return a.e.doc.path ? write('save', a) : write('as', a); };
  const has = (f) => () => { const a = active(); return !!a && f(a.e.doc); };
  const def = (id, title, icon, shortcut, run, extra = {}) => commands.register({ id, title, icon, group: 'File', shortcut, run, ...extra });

  def('file.new', 'New', 'file-plus-2', 'Ctrl+N', () => { D.openDocument(); });
  def('file.open', 'Open…', 'file-up', 'Ctrl+O', openDialog);
  def('file.open-path', 'Open from Path…', 'folder-input', '', () => openPathDialog(ctx, openOne));
  def('file.save', 'Save', 'save', 'Ctrl+S', save, { enabled: has(() => true) });
  def('file.save-as', 'Save As…', 'save-all', 'Ctrl+Shift+S', () => { const a = active(); if (a) return write('as', a); }, { enabled: has(() => true) });
  def('file.save-copy', 'Save a Copy…', 'copy', '', () => { const a = active(); if (a) return write('copy', a); }, { enabled: has(() => true) });
  def('file.revert', 'Revert to Last Saved', 'rotate-ccw', '', async () => {
    const a = active();
    if (!a || !a.e.doc.path || !a.e.doc.dirty || !await confirmDialog(ctx, { title: 'Revert to Last Saved', text: `Discard unsaved changes to ${a.e.doc.name} and reload it from disk?`, label: 'Revert' })) return;
    try {
      const { doc } = await api.readPath(a.e.doc.path);
      D.reloadDocument(a.id, { ...doc, name: baseName(doc.path), diskHash: doc.hash });
      ui.toast(`Reverted ${baseName(doc.path)} to the last saved version.`);
    } catch (err) { fail(a.e.doc.path, err); }
  }, { enabled: has((d) => !!d.path && d.dirty), reason: 'No unsaved changes to revert' });
  def('file.reveal', 'Show in File Manager', 'folder-search', '', () => { const a = active(); if (a) return api.reveal(a.e.doc.path).catch((err) => fail(a.e.doc.path, err)); }, { enabled: has((d) => !!d.path), reason: 'Save the document first' });
  def('tab.save', 'Save', 'save', '', save, { enabled: has(() => true) });
  def('tab.save-as', 'Save As…', 'save-all', '', () => commands.execute('file.save-as'), { enabled: has(() => true) });

  const KEYS = { n: 'file.new', o: 'file.open', s: 'file.save', 'shift+s': 'file.save-as' };
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const id = KEYS[(e.shiftKey ? 'shift+' : '') + e.key.toLowerCase()];
    if (!id) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) commands.execute(id);
  }, true);

  D.onDocChange(() => ['file.save', 'file.save-as', 'file.save-copy', 'file.revert', 'file.reveal'].forEach((id) => commands.invalidate(id)));
  store.subscribe((s) => s.documents.activeId, () => ['file.save', 'file.save-as', 'file.save-copy', 'file.revert', 'file.reveal'].forEach((id) => commands.invalidate(id)));
  mountDrop(ctx, openPaths);
  mountRename(ctx, { active, write });
  def('file.open-recent', 'Open Recent', 'file-up', '', (p) => (typeof p === 'string' ? openPaths([p]) : undefined));
  def('file.open-paths', 'Open Paths', 'file-up', '', (paths) => (Array.isArray(paths) ? openPaths(paths) : typeof paths === 'string' ? openPaths([paths]) : undefined));

  mountTabCycle(ctx);
  mountEmptyState(ctx);
  mountNewDocument(ctx);
  mountCloseGuard(ctx, saveById);
  mountAutosave(ctx, write);
  mountConflict(ctx, write);
}