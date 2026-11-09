import { absPath } from '../../core/search/results-model.js';
import { samePath } from '../../core/documents/paths.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Opens the hit's file (path '' = the active document) and selects the exact match, scrolled into view even on very long lines.
export async function reveal({ store, commands, services: { documents } }, it) {
  const root = store.get().workspace.root;
  if (it.path) await commands.execute('file.open-recent', absPath(root, it.path));
  const cur = () => documents.getEntry(store.get().documents.activeId);
  if (it.path && !(cur() && cur().doc.path && samePath(cur().doc.path, absPath(root, it.path)))) return;
  if (!it.line) return;
  const src = () => { const v = documents.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  if (!src() && store.get().ui.mode === 'preview') await commands.execute('view.mode-source');
  let v = null;
  for (let i = 0; i < 24 && !(v = src()); i++) await wait(25);
  if (!v) return;
  await wait(30);
  v = src() || v;
  const d = v.state.doc, l = d.line(Math.min(Math.max(it.line, 1), d.lines));
  const a = Math.min(l.from + it.col, l.to), b = Math.min(a + Math.max(it.len, 0), l.to);
  v.dispatch({ selection: { anchor: a, head: b }, effects: v.constructor.scrollIntoView(a, { x: 'center', y: 'center' }), userEvent: 'select.search' });
  v.focus();
  requestAnimationFrame(() => v.dispatch({ effects: v.constructor.scrollIntoView(v.state.selection.main, { x: 'center', y: 'center' }) }));
}
