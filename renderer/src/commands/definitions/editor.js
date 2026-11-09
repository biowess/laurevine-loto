import { register, invalidate, execute } from '../registry.js';
import { store } from '../../state/store.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { openDialog } from '../../ui/kit/dialog.js';
import { editorRun, openDocument, closeDocument } from '../../services/documents.js';

const toggle = (id, title, icon, key) => register({
  id, title, icon, group: 'Display', checked: () => getSetting(key) === true,
  run: async () => { await setSetting(key, !getSetting(key)); invalidate(id); },
});
toggle('view.word-wrap', 'Word Wrap', 'wrap-text', 'editor.wordWrap');
toggle('view.line-numbers', 'Line Numbers', 'list-ordered', 'editor.lineNumbers');
toggle('view.whitespace', 'Show Whitespace', 'pilcrow', 'editor.showWhitespace');

const vis = () => { const v = editorRun('view'); return v && v.dom.offsetParent ? v : null; };
const can = (i) => !!(vis() && editorRun('can')[i]);
register({ id: 'edit.undo', title: 'Undo', icon: 'undo-2', group: 'Editing', shortcut: 'Ctrl+Z', enabled: () => can(0), reason: 'Nothing to undo', run: () => editorRun('undo') });
register({ id: 'edit.redo', title: 'Redo', icon: 'redo-2', group: 'Editing', shortcut: 'Ctrl+Shift+Z', enabled: () => can(1), reason: 'Nothing to redo', run: () => editorRun('redo') });
register({
  id: 'edit.select-all', title: 'Select All', icon: 'text-select', group: 'Editing', shortcut: 'Ctrl+A',
  enabled: () => !!editorRun('view'), reason: 'Needs an open document',
  run: () => {
    if (editorRun('selectAll')) return;
    const s = getSelection(), r = document.createRange();
    r.selectNodeContents(document.getElementById('prev')); s.removeAllRanges(); s.addRange(r);
  },
});
store.subscribe((s) => s.ui.mode, () => requestAnimationFrame(() => ['edit.undo', 'edit.redo'].forEach(invalidate)));
register({ id: 'tab.new', title: 'New Tab', icon: 'plus', group: 'Tabs', run: () => execute('file.new-choose') });
register({
  id: 'tab.close', title: 'Close', icon: 'x', group: 'Tabs',
  run: async (id) => {
    editorRun('flush');
    const { tabs, activeId } = store.get().documents;
    const t = tabs.find((x) => x.id === (typeof id === 'string' ? id : activeId));
    if (!t) return;
    if (t.dirty && !(await new Promise((res) => { let ok = false; openDialog({ title: 'Close Tab', icon: 'triangle-alert', width: 420, body: `“${t.title}” has unsaved changes. Close it anyway?`, buttons: [{ label: 'Cancel' }, { label: 'Close Anyway', primary: true, onClick: () => { ok = true; } }], onClose: () => res(ok) }); }))) return;
    closeDocument(t.id);
  },
});
