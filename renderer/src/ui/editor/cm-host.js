import { store } from '../../state/store.js';
import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { getEntry, syncText, setEditorBridge, onRelease } from '../../services/documents.js';
import { isHeavy } from '../../core/documents/document.js';
import { invalidate } from '../../commands/registry.js';
import { createSetup } from './cm-setup.js';
import { docStats, selStats, optsFrom } from '../../core/text/stats.js';

const KEYS = ['lineNumbers', 'wordWrap', 'showWhitespace', 'tabSize', 'indentUnit', 'spellcheck'];
const readPrefs = () => Object.fromEntries(KEYS.map((k) => [k, getSetting(`editor.${k}`)]));
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));

export async function createEditorHost(parent, { onActivity = () => {}, slot = 0 } = {}) {
  const CM = await import('../../../vendor/codemirror.js');
  let current = null, timer = 0, calcT = 0, stats = { words: 0, chars: 0 }, sel = null, selKey = '', dirty = true;
  const key = (s) => s.selection.ranges.map((r) => `${r.from}-${r.to}`).join();
  const canDo = (d, f, st) => (d ? d(st) > 0 : f({ state: st, dispatch: () => {} }));
  let hu = null, hr = null;
  const hist = (st) => {
    const u = canDo(CM.undoDepth, CM.undo, st), r = canDo(CM.redoDepth, CM.redo, st);
    if (u !== hu || r !== hr) { hu = u; hr = r; invalidate('edit.undo'); invalidate('edit.redo'); }
  };
  const run = () => {
    const s = view.state, o = optsFrom(getSetting), parts = s.selection.ranges.filter((r) => !r.empty).map((r) => s.sliceDoc(r.from, r.to));
    if (dirty) { stats = docStats(s.doc.toString(), o); dirty = false; }
    sel = parts.length ? selStats(parts, o) : null; selKey = key(s);
    onActivity();
  };
  const schedule = (full, delay) => {
    if (full) { dirty = true; selKey = ''; }
    clearTimeout(calcT);
    const d = delay != null ? delay : (view.state.doc.length > 500000 ? 2500 : 400);
    calcT = setTimeout(() => idle(run, { timeout: 1200 }), d);
  };
  const setup = createSetup(CM, (u) => {
    if (u.docChanged) { clearTimeout(timer); timer = setTimeout(flush, 250); hist(u.state); }
    if (u.docChanged || u.selectionSet) { schedule(u.docChanged); if (!u.docChanged) onActivity(); }
  });
  const view = new CM.EditorView({ parent, state: CM.EditorState.create({ doc: '' }) });
  const slotDoc = (s) => { const g = s.editorGroups.groups[slot]; return g ? g.activeId : null; };
  const mine = () => { const g = store.get().editorGroups; return !!g.groups[slot] && g.groups[slot].id === g.activeGroupId; };

  function flush() {
    clearTimeout(timer); timer = 0;
    if (!current || !getEntry(current)) return;
    const text = view.state.doc.toString();
    syncText(current, text);
    onActivity();
  }

  function release() {
    flush();
    const e = current && getEntry(current);
    if (e) { e.state = view.state; e.scroll = view.scrollSnapshot(); }
  }

  function show(id) {
    if (timer) flush();
    const prev = current && getEntry(current);
    if (prev) { prev.state = view.state; prev.scroll = view.scrollSnapshot(); }
    const e = getEntry(id);
    current = e ? id : null;
    if (!e) return;
    const p = readPrefs();
    if (!e.state) { e.heavy = isHeavy(e.doc.text); e.state = setup.create(e.doc.text, p, e.heavy); if (e.caret != null) { e.state = e.state.update({ selection: { anchor: Math.min(e.caret, e.doc.text.length), head: e.head == null ? undefined : Math.min(e.head, e.doc.text.length) } }).state; e.caret = e.head = null; } }
    schedule(true, 0);
    view.setState(e.state);
    hist(view.state);
    view.dispatch({ effects: [...setup.effects(p, e.heavy), ...(e.scroll ? [e.scroll] : [])] });
    if (mine()) view.focus();
    onActivity();
  }

  const offs = [
    store.subscribe(slotDoc, show),
    onRelease(release),
    subscribeSettings(() => {
      const e = current && getEntry(current);
      if (e) { view.dispatch({ effects: setup.effects(readPrefs(), e.heavy) }); schedule(true); }
    }),
  ];
  const bridge = { undo: () => { CM.undo(view); view.focus(); }, redo: () => { CM.redo(view); view.focus(); }, flush: () => flush(), view: () => view,
    reload: (docId) => {
      clearTimeout(timer); timer = 0;
      const targetId = docId || current;
      const e = targetId && getEntry(targetId);
      if (!e) return;
      const p = readPrefs();
      e.heavy = isHeavy(e.doc.text);
      e.state = setup.create(e.doc.text, p, e.heavy);
      view.setState(e.state);
      view.dispatch({ effects: setup.effects(p, e.heavy) });
      hist(view.state);
      schedule(true, 0);
      onActivity();
    },
    selectAll: () => { if (!view.dom.offsetParent) return false; view.dispatch({ selection: { anchor: 0, head: view.state.doc.length }, userEvent: 'select' }); view.focus(); return true; },
    can: () => [canDo(CM.undoDepth, CM.undo, view.state), canDo(CM.redoDepth, CM.redo, view.state)] };
  if (!slot) setEditorBridge(bridge);
  show(slotDoc(store.get()));

  return {
    bridge, release,
    metrics() {
      const s = view.state, r = s.selection.main, l = s.doc.lineAt(r.head);
      return { ln: l.number, col: r.head - l.from + 1, sel: r.to - r.from, words: stats.words, chars: stats.chars, selWords: sel && selKey === key(s) ? sel.words : null, selChars: sel && selKey === key(s) ? sel.chars : null };
    },
    destroy() {
      clearTimeout(timer); clearTimeout(calcT);
      offs.forEach((f) => f());
      if (!slot) setEditorBridge(null);
      view.destroy();
    },
  };
}
