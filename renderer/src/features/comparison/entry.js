import { baseName } from '../../core/documents/paths.js';
import { readPath, pickText } from '../../services/doc-client.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const delta = (a, b) => {
  let p = 0, s = 0;
  while (p < a.length && a[p] === b[p]) p++;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return { from: p, to: a.length - s, insert: b.slice(p, b.length - s) };
};

export function mountEntry(ctx) {
  const { commands, store, ui } = ctx, D = ctx.services.documents;
  const activeId = () => store.get().documents.activeId;
  const docSide = (id) => { D.editorRun('flush'); const d = D.getEntry(id).doc; return { id, path: d.path, label: d.name, text: d.text }; };
  const fileSide = async (path) => {
    const id = D.findByPath(path);
    if (id) return docSide(id);
    const { doc } = await readPath(path);
    return { path, label: baseName(path), text: doc.text };
  };

  // One editor transaction = one undo step.
  const edit = async (id, cur, next) => {
    if (!D.getEntry(id)) { ui.toast('That document is closed.'); return false; }
    if (activeId() !== id) { D.activate(id); await sleep(120); }
    const v = activeId() === id ? D.editorRun('view') : null;
    if (!v) { ui.toast('Could not reach the document in the editor.'); return false; }
    const now = v.state.doc.toString();
    if (now !== cur) { ui.toast('The document changed since the comparison opened. Reopen the comparison.', { timeout: 5000 }); return false; }
    v.dispatch({ changes: delta(now, next), userEvent: 'input.replace' });
    D.syncText(id, next);
    D.editorRun('flush');
    return true;
  };
  const open = (s) => {
    if (s.id && D.getEntry(s.id)) D.activate(s.id);
    else if (s.path) commands.execute('file.open-recent', s.path);
    else { const d = D.openDocument({ text: s.text }); D.updateDoc(d.id, { dirty: true }); D.activate(d.id); }
  };
  const compare = (title, l, r, restoreLabel) => ctx.services.compare({
    title, oldText: l.text, newText: r.text, oldLabel: l.label, newLabel: r.label, restoreLabel,
    edit: { left: l.id && ((n, c) => edit(l.id, c, n)), right: r.id && ((n, c) => edit(r.id, c, n)), openLeft: () => open(l), openRight: () => open(r) },
  });
  ctx.services.compareSides = compare;

  const guard = (f) => async (a) => { try { await f(a); } catch (e) { ui.toast((e && e.message) || 'Could not compare.', { timeout: 5000 }); } };
  const def = (id, title, icon, run, extra) => commands.register({ id, title, icon, group: 'Compare', run, ...extra });
  const need = { enabled: () => !!activeId(), reason: 'No document is open' };
  const saved = () => { const e = activeId() && D.getEntry(activeId()); return !!e && !!e.doc.path && !e.doc.deleted; };

  def('cmp.with-saved', 'Compare with Saved Version', 'git-compare', guard(async () => {
    const r = docSide(activeId()), { doc } = await readPath(r.path);
    compare(`Compare — ${r.label}`, { path: r.path, label: 'Saved version (on disk)', text: doc.text }, { ...r, label: `${r.label} (Current in editor)` }, 'Restore Saved Version');
  }), { enabled: saved, reason: 'The document has not been saved to a file' });

  def('cmp.with-file', 'Compare with Another File…', 'file-diff', guard(async () => {
    const id = activeId(), r = await pickText(), p = r && r.docs && r.docs[0] && r.docs[0].path;
    if (!p) return;
    const [a, b] = [docSide(id), await fileSide(p)];
    compare(`Compare — ${a.label} / ${b.label}`, { ...a, label: `${a.label} (Current)` }, { ...b, label: `${b.label} (File)` });
  }), need);

  def('cmp.with-tab', 'Compare with Open Tab…', 'columns-2', (arg) => {
    const id = activeId();
    const other = store.get().documents.tabs.filter((t) => t.id !== id);
    if (!other.length) return ui.toast('Open a second document first.');
    const anchor = (arg && (arg.nodeType || (arg.x != null && arg.y != null) || arg.getBoundingClientRect))
      ? arg
      : (document.querySelector('[data-cmd="cmp.with-tab"]') || document.querySelector('.tab.is-active') || { x: 40, y: 80 });
    ui.openMenu(anchor, other.map((t) => ({
      label: t.title, onSelect: guard(() => {
        const a = docSide(id), b = docSide(t.id);
        compare(`Compare — ${a.label} / ${b.label}`, { ...a, label: `${a.label} (Active Tab)` }, { ...b, label: `${b.label} (Open Tab)` });
      }),
    })));
  }, { enabled: () => !!activeId() && store.get().documents.tabs.length > 1, reason: 'Open a second document first' });

  def('cmp.compare-paths', 'Compare Selected Files', 'file-diff', guard(async (paths) => {
    if (!Array.isArray(paths) || paths.length !== 2) return ui.toast('Select two files in the Explorer.');
    const [a, b] = await Promise.all(paths.map(fileSide));
    compare(`Compare — ${a.label} / ${b.label}`, a, b);
  }), { group: 'Explorer', enabled: () => !!store.get().workspace.root, reason: 'No workspace is open' });

  const sync = () => ['cmp.with-saved', 'cmp.with-file', 'cmp.with-tab'].forEach((id) => commands.invalidate(id));
  store.subscribe((s) => s.documents.activeId, sync);
  store.subscribe((s) => s.documents.tabs, sync);
}
