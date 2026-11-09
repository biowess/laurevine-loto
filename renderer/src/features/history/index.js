import * as api from '../../services/history-client.js';
import { baseName } from '../../core/documents/paths.js';
import { openHistory } from './dialog.js';
import { openRecover } from './recover.js';

export function register(ctx) {
  const { commands, store, ui } = ctx, D = ctx.services.documents;
  let dlg = null;
  const active = () => { const id = store.get().documents.activeId; return id ? D.getEntry(id) : null; };
  const def = (id, title, icon, run, extra = {}) => commands.register({ id, title, icon, group: 'History', run, ...extra });
  const show = (o) => { dlg = openHistory(ctx, { ...o, onClose: () => { dlg = null; } }); };
  const needDoc = { enabled: () => !!active(), reason: 'No document is open' };
  const live = { enabled: () => !!dlg && !!dlg.sel(), reason: 'Select a version first' };

  const open = () => {
    const e = active();
    if (!e) return;
    const { id, name } = e.doc, ref = e.doc.path ? { path: e.doc.path } : { docId: id };
    show({
      title: `Change History — ${name}`, ref, docId: id,
      current: () => { const v = store.get().documents.activeId === id ? D.editorRun('view') : null; return v ? v.state.doc.toString() : D.getEntry(id).doc.text; },
      async restore(vid) {
        const v = store.get().documents.activeId === id ? D.editorRun('view') : null;
        if (!v) { ui.toast('Open the document in the editor to restore a version.'); return false; }
        const r = await api.restore(ref, vid, v.state.doc.toString());
        v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: r.text }, userEvent: 'input.replace' });
        D.syncText(id, r.text);
        D.editorRun('flush');
        ui.toast(`Restored the ${new Date(r.version.at).toLocaleString()} version. Undo brings back the previous text.`, { timeout: 5000 });
        return true;
      },
    });
  };

  def('hist.changes', 'View Change History', 'history', open, needDoc);
  def('hist.restore', 'Restore Previous Version', 'undo-2', open, needDoc);
  def('hist.compare', 'Compare', 'git-compare', () => {
    if (dlg) return dlg.compare();
    const a = active();
    if (!a) return;
    return commands.execute(a.e.doc.path ? 'cmp.with-saved' : 'cmp.with-file');
  }, { enabled: () => !!dlg ? !!dlg.sel() : !!active(), reason: 'Select a version first' });
  def('hist.pin', 'Pin or Unpin Version', 'pin', () => dlg && dlg.pin(), live);
  def('hist.delete', 'Delete Version', 'trash-2', () => dlg && dlg.del(), live);
  def('hist.restore-version', 'Restore Selected Version', 'undo-2', () => dlg && dlg.restore(), live);
  def('hist.toggle-source', 'Show Source or Rendered Preview', 'file-code', () => dlg && dlg.toggleSource(), { enabled: () => !!dlg, reason: 'History is not open' });
  def('hist.recover-file', 'Recover Deleted File', 'archive-restore', (path) => {
    if (typeof path !== 'string') return;
    show({
      title: `Recover — ${baseName(path)}`, ref: { path }, label: 'Recover as New Document',
      async restore(vid) {
        const { text } = await api.read({ path }, vid), d = D.openDocument({ name: baseName(path), path: null, text });
        D.updateDoc(d.id, { dirty: true });
        D.activate(d.id);
        return true;
      },
    });
  });
  def('explorer.recover-deleted', 'Recover deleted…', 'archive-restore', () => openRecover(ctx), { group: 'Explorer', enabled: () => !!store.get().workspace.root, reason: 'No workspace is open' });
}
