// Smart editing: formatting commands, Markdown keymap (Enter/Backspace/Tab, auto-pair), shortcuts, Home state. Every edit is one transaction.
import { toggleInline } from '../../core/text/inline.js';
import { setHeading, toggleQuote, toggleList, indent, outdent, insertHr } from '../../core/text/block.js';
import { clearFormatting } from '../../core/text/clear-format.js';
import { removeLink } from '../../core/text/link.js';
import { linkAt, linkDefaults, linkChange } from '../../core/text/link-edit.js';
import { enter, backspace, listy, pair, formatAt } from '../../core/text/smart.js';
import { setKeyHook } from '../../services/editor-hooks.js';
import { getSetting } from '../../services/settings-client.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';
import { openLinkPicker } from './link-picker.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const NO_LINK = 'Needs the caret inside a link in the Source or Split editor';
const CLOSERS = '([{"`)]}';

function shortcutId(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return '';
  const k = e.key.toLowerCase();
  if (e.shiftKey) return ({ x: 'fmt.strike', q: 'fmt.quote' })[k] || ({ Digit7: 'fmt.numbers', Digit8: 'fmt.bullets', Digit9: 'fmt.tasks' })[e.code] || '';
  const d = /^Digit([0-6])$/.exec(e.code);
  if (d) return d[1] === '0' ? 'fmt.paragraph' : 'fmt.h' + d[1];
  if (k === 'b') return 'fmt.bold';
  if (k === 'i') return 'fmt.italic';
  if (k === 'k') return 'fmt.link';
  if (k === '`' || e.code === 'Backquote') return 'fmt.code';
  if (k === ']' || e.code === 'BracketRight') return 'fmt.indent';
  if (k === '[' || e.code === 'BracketLeft') return 'fmt.outdent';
  return '';
}

export function register(ctx) {
  const { commands, store, services: { documents }, ui } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  const snap = (v) => ({ text: v.state.doc.toString(), selections: v.state.selection.ranges.map((r) => ({ anchor: r.anchor, head: r.head })) });
  const unit = () => getSetting('editor.indentUnit');

  function commit(v, r, userEvent) {
    if (!r) return false;
    const S = v.state.selection.constructor;
    v.dispatch({ changes: r.changes, selection: S.create(r.selections.map((s) => S.range(s.anchor, s.head)), v.state.selection.mainIndex), userEvent, scrollIntoView: true });
    v.focus();
    return true;
  }

  let memo = null, memoState = null;
  const fa = () => {
    const v = ready() && view();
    if (!v) return {};
    if (memoState !== v.state) {
      const m = v.state.selection.main, a = Math.max(0, m.from - 8000), doc = v.state.doc;
      memo = formatAt(doc.sliceString(a, Math.min(doc.length, m.to + 8000)), { anchor: m.anchor - a, head: m.head - a });
      memoState = v.state;
    }
    return memo;
  };
  const linkHere = () => { const v = ready() && view(); if (!v) return false; const m = v.state.selection.main, a = Math.max(0, m.from - 8000); return !!linkAt(v.state.doc.sliceString(a, Math.min(v.state.doc.length, m.to + 8000)), { anchor: m.anchor - a, head: m.head - a }); };

  const def = (id, title, icon, group, shortcut, fn, event, extra) => commands.register({
    id, title, icon, group, shortcut, enabled: ready, reason: NO_EDITOR, run: () => { const v = view(); if (v) commit(v, fn(snap(v)), event); }, ...extra,
  });

  for (const [id, title, icon, key, sc] of [['bold', 'Bold', 'bold', 'bold', 'Ctrl+B'], ['italic', 'Italic', 'italic', 'italic', 'Ctrl+I'], ['strike', 'Strikethrough', 'strikethrough', 'strike', 'Ctrl+Shift+X'], ['code', 'Inline Code', 'code', 'code', 'Ctrl+`']]) {
    def(`fmt.${id}`, title, icon, 'Text', sc, (s) => toggleInline(s, key), 'input.format', { checked: () => !!fa()[key] });
  }
  def('fmt.clear', 'Clear Formatting', 'remove-formatting', 'Text', '', clearFormatting, 'input.format');
  def('fmt.remove-link', 'Remove Link', 'unlink', 'Text', '', removeLink, 'input.format', { enabled: () => ready() && linkHere(), reason: NO_LINK });

  def('fmt.paragraph', 'Paragraph', 'pilcrow', 'Structure', 'Ctrl+0', (s) => setHeading(s, 0), 'input.format', { checked: () => { const f = fa(); return 'level' in f && !f.level && !f.list && !f.quote; } });
  for (let n = 1; n <= 6; n++) def(`fmt.h${n}`, `Heading ${n}`, `heading-${n}`, 'Structure', `Ctrl+${n}`, (s) => setHeading(s, n), 'input.format', { checked: () => fa().level === n });
  def('fmt.heading', 'Heading', 'heading', 'Structure', '', (s) => setHeading(s, fa().level ? 0 : 1), 'input.format', { checked: () => fa().level > 0 });
  def('fmt.quote', 'Quote', 'quote', 'Structure', 'Ctrl+Shift+Q', toggleQuote, 'input.format', { checked: () => !!fa().quote });
  for (const [id, title, icon, kind, sc] of [['numbers', 'Numbered List', 'list-ordered', 'ol', 'Ctrl+Shift+7'], ['bullets', 'Bulleted List', 'list', 'ul', 'Ctrl+Shift+8'], ['tasks', 'Task List', 'list-checks', 'task', 'Ctrl+Shift+9']]) {
    def(`fmt.${id}`, title, icon, 'Structure', sc, (s) => toggleList(s, kind), 'input.format', { checked: () => fa().list === kind });
  }
  def('fmt.rule', 'Horizontal Rule', 'minus', 'Structure', '', insertHr, 'input.format', { portable: 'rule' });
  def('fmt.indent', 'Indent', 'indent', 'Structure', 'Ctrl+]', (s) => indent(s, unit()), 'input.indent');
  def('fmt.outdent', 'Outdent', 'outdent', 'Structure', 'Ctrl+[', (s) => outdent(s, unit()), 'delete.dedent');

  const link = (kind) => {
    const v = view();
    if (!v) return;
    const doc = v.state.doc, st = snap(v), d = linkDefaults(st.text, v.state.selection.main);
    const e = documents.getEntry(store.get().documents.activeId);
    openLinkPicker(ui, d, {
      apply: (vals) => { if (v.state.doc === doc) commit(v, linkChange(d, vals), 'input.link'); },
      remove: () => { if (v.state.doc === doc) commit(v, removeLink({ text: st.text, selections: [{ anchor: d.s + 1, head: d.s + 1 }] }), 'input.format'); },
    }, { kind, text: st.text, path: e && e.doc.path, strategy: getSetting('markdown.anchorStrategy') });
  };
  commands.register({ id: 'fmt.link', title: 'Link', icon: 'link', group: 'Text', shortcut: 'Ctrl+K', enabled: ready, reason: NO_EDITOR, checked: () => !!fa().link, run: () => link() });
  commands.register({ id: 'fmt.edit-link', title: 'Edit Link', icon: 'link-2', group: 'Text', enabled: () => ready() && linkHere(), reason: NO_LINK, run: () => link() });
  commands.register({ id: 'ins.link', title: 'Link', icon: 'link', group: 'Links', shortcut: 'Ctrl+K', enabled: ready, reason: NO_EDITOR, run: () => link() });
  for (const [id, title, icon, kind] of [['ins.file-link', 'File Link', 'file-symlink', 'file'], ['ins.heading-link', 'Heading Link', 'hash', 'heading'], ['ins.external-link', 'External', 'external-link', 'external'], ['ins.email', 'Email', 'mail', 'email']]) commands.register({ id, title, icon, group: 'Links', enabled: ready, reason: NO_EDITOR, run: () => link(kind) });

  setKeyHook((e, v) => {
    if (e.isComposing) return false;
    const id = shortcutId(e);
    if (id) { if (!commands.canRun(id)) return false; e.stopPropagation(); commands.execute(id); return true; }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const on = getSetting('editor.autoPair') === true;
    let r = null, ev = 'input.type';
    if (e.key === 'Enter' && !e.shiftKey) r = enter(snap(v));
    else if (e.key === 'Backspace') { r = backspace(snap(v), on); ev = 'delete.backward'; }
    else if (e.key === 'Tab') {
      const st = snap(v);
      if (!listy(st)) return false;
      r = (e.shiftKey ? outdent : indent)(st, unit());
      ev = 'input.indent';
    } else if (on && e.key.length === 1 && CLOSERS.includes(e.key)) r = pair(snap(v), e.key);
    return r ? commit(v, r, ev) : false;
  });

  const IDS = ['fmt.bold', 'fmt.italic', 'fmt.strike', 'fmt.code', 'fmt.link', 'fmt.heading', 'fmt.paragraph', 'fmt.h1', 'fmt.h2', 'fmt.h3', 'fmt.h4', 'fmt.h5', 'fmt.h6', 'fmt.quote', 'fmt.bullets', 'fmt.numbers', 'fmt.tasks', 'fmt.edit-link', 'fmt.remove-link'];
  let prev = {};
  const sync = () => {
    const next = {};
    for (const id of IDS) next[id] = `${commands.isChecked(id)}${commands.canRun(id)}`;
    for (const id of IDS) if (next[id] !== prev[id]) commands.invalidate(id);
    prev = next;
    const lv = String(fa().level || 0);
    document.querySelectorAll('[data-cmd="fmt.heading"]').forEach((b) => { b.dataset.level = lv; });
  };
  onEditorActivity(sync);
  store.subscribe((s) => s.ui.mode, sync);
}
