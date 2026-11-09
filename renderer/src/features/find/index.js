// Find / replace bar for the source editor; search logic lives in core/search/text-search.js.
import { findAll, expand } from '../../core/search/text-search.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';
import { createBar } from './bar.js';
import { paint, clear } from './highlight.js';
import { createPreviewSearch } from './preview.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const NO_REPLACE = 'Replace needs Source or Split mode';

export function register(ctx) {
  const { commands, settings, store, services: { documents } } = ctx;
  settings.define('find', { history: { type: 'string', default: '[]', maxLength: 4000, category: 'Editor', label: 'Find history', description: 'Recent find terms.' } });
  const S = { open: false, rrow: false, q: '', rep: '', cs: false, ww: false, rx: false, sel: false, range: null, matches: [], cur: -1, err: null, trunc: false, pv: false, msg: '', hist: [], doc: null, origin: 0 };
  let bar = null, tid = 0, raf = 0, wired = new WeakSet();
  const view = () => { const v = documents.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  const prevEl = document.getElementById('prev'), srcEl = document.getElementById('src');
  const pv = () => store.get().ui.mode === 'preview' && !view();
  const P = createPreviewSearch(prevEl, () => { if (S.open && pv()) { clearTimeout(tid); tid = setTimeout(recompute, 120); } });
  const dock = () => { const h = pv() ? prevEl.parentElement : srcEl; h.classList.add('lv-find-host'); h.append(bar.el); };
  const run = (id) => commands.execute(id);
  const opts = () => ({ query: S.q, caseSensitive: S.cs, wholeWord: S.ww, regex: S.rx });
  const repaint = () => { const v = view(); if (S.open && pv()) P.paint(S.matches, S.cur); else if (v && S.open) paint(v, S.matches, S.cur); else clear(); };
  const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(repaint); };
  const curOf = (v) => { const s = v.state.selection.main; return S.matches.findIndex((m) => m.from === s.from && m.to === s.to); };
  const paintAll = (v) => { S.cur = v ? curOf(v) : -1; if (bar) bar.sync(); repaint(); };

  function recompute() {
    S.pv = pv();
    if (S.pv) {
      S.sel = false; S.rrow = false; S.cur = -1;
      const r = findAll(P.text(), opts(), {});
      S.matches = r.matches; S.err = r.error || null; S.trunc = !!r.truncated;
      if (bar) bar.sync();
      repaint();
      return;
    }
    const v = view();
    if (!v) { S.matches = []; S.cur = -1; if (bar) bar.sync(); clear(); return; }
    S.doc = v.state.doc;
    if (!wired.has(v)) { wired.add(v); v.scrollDOM.addEventListener('scroll', sched, { passive: true }); }
    const r = findAll(v.state.doc.toString(), opts(), S.sel && S.range ? S.range : {});
    S.matches = r.matches; S.err = r.error || null; S.trunc = !!r.truncated;
    paintAll(v);
  }
  const pick = (v, i) => {
    const m = S.matches[i];
    if (!v) { S.cur = i; S.msg = ''; if (bar) bar.sync(); repaint(); P.reveal(m); return; }
    v.dispatch({ selection: { anchor: m.from, head: m.to }, effects: v.constructor.scrollIntoView(m.from, { x: 'center', y: 'center' }), userEvent: 'select.search' });
    S.origin = m.from; S.msg = ''; paintAll(v);
  };
  function go(dir, focus) {
    const v = view();
    if (!v && pv()) {
      if (!S.matches.length || P.stale()) recompute();
      const n = S.matches.length;
      if (n) pick(null, S.cur < 0 ? (dir > 0 ? 0 : n - 1) : (S.cur + dir + n) % n);
      return;
    }
    if (!v) return;
    if (!S.matches.length || S.doc !== v.state.doc) recompute();
    const n = S.matches.length;
    if (!n) return;
    const s = v.state.selection.main;
    let i;
    if (dir > 0) { i = S.matches.findIndex((m) => m.from >= s.to); if (i < 0) i = 0; }
    else { i = -1; for (let k = n - 1; k >= 0; k--) if (S.matches[k].to <= s.from) { i = k; break; } if (i < 0) i = n - 1; }
    pick(v, i);
    if (focus) v.focus();
  }
  function remember() {
    if (!S.q) return;
    S.hist = [S.q, ...S.hist.filter((t) => t !== S.q)].slice(0, 20);
    while (JSON.stringify(S.hist).length > 3900) S.hist.pop();
    setSetting('find.history', JSON.stringify(S.hist)).catch(() => {});
    if (bar) bar.fillHistory();
  }
  function apply(changes, v, delta) {
    if (S.sel && S.range) S.range = { from: S.range.from, to: S.range.to + delta };
    v.dispatch({ changes, userEvent: 'input.replace' });
  }
  const text = (m) => (S.rx ? expand(S.rep, m) : S.rep);

  function ensure() {
    if (bar) return;
    bar = createBar(ctx, S, run);
    bar.q.addEventListener('input', () => {
      S.q = bar.q.value; S.msg = '';
      recompute();
      const v = view();
      if (v && S.matches.length) { const i = S.matches.findIndex((m) => m.from >= S.origin); pick(v, i < 0 ? 0 : i); }
      else if (!v && S.pv && S.matches.length) pick(null, 0);
    });
    bar.r.addEventListener('input', () => { S.rep = bar.r.value; });
    bar.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); run('find.close'); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.target === bar.r) run('find.replace-one');
        else { remember(); run(e.shiftKey ? 'edit.find-prev' : 'edit.find-next'); }
      }
    });
  }
  function open(replace) {
    const v = view();
    if (!v && !pv()) return;
    ensure(); dock();
    const s = v ? v.state.selection.main : { from: 0 }, t = v ? v.state.sliceDoc(s.from, s.to) : P.selected();
    if (!S.hist.length) { try { S.hist = JSON.parse(getSetting('find.history')) || []; } catch (e) { S.hist = []; } bar.fillHistory(); }
    if (t && t.length < 200 && !t.includes('\n') && !S.sel) { S.q = t; bar.q.value = t; }
    if (replace && v) S.rrow = true;
    S.open = true; S.origin = s.from; S.msg = '';
    recompute();
    const f = replace && S.q ? bar.r : bar.q;
    f.focus(); f.select();
  }
  function close() {
    S.open = false; S.msg = '';
    if (bar) bar.sync();
    clear();
    const v = view();
    if (v) v.focus();
  }
  const toggle = (k) => () => { S[k] = !S[k]; S.msg = ''; recompute(); bar.sync(); };
  const ready = () => !!view() || pv();
  const open_ = () => ready() && S.open;
  const C = (id, title, icn, shortcut, fn, extra = {}) => commands.register({ id, title, icon: icn, group: 'Find', shortcut, enabled: ready, reason: NO_EDITOR, run: fn, ...extra });

  C('edit.find', 'Find', 'search', 'Ctrl+F', () => open(false));
  C('edit.replace', 'Replace', 'replace', 'Ctrl+H', () => (S.open && S.rrow && bar.el.contains(document.activeElement) ? (S.rrow = false, bar.sync(), bar.q.focus()) : open(true)), { enabled: () => !!view(), reason: NO_REPLACE });
  C('edit.find-next', 'Find Next', 'chevron-down', 'F3', () => { if (S.open) go(1); else open(false); });
  C('edit.find-prev', 'Find Previous', 'chevron-up', 'Shift+F3', () => { if (S.open) go(-1); else open(false); });
  C('find.close', 'Close Find', 'x', 'Escape', close, { enabled: () => S.open });
  C('find.toggle-case', 'Match Case', 'case-sensitive', '', toggle('cs'), { enabled: open_, checked: () => S.cs });
  C('find.toggle-word', 'Whole Word', 'whole-word', '', toggle('ww'), { enabled: open_, checked: () => S.ww });
  C('find.toggle-regex', 'Regular Expression', 'regex', '', toggle('rx'), { enabled: open_, checked: () => S.rx });
  C('find.toggle-replace', 'Toggle Replace', 'replace', '', () => { S.rrow = !S.rrow; bar.sync(); if (S.rrow) bar.r.focus(); }, { enabled: () => open_() && !pv(), reason: NO_REPLACE, checked: () => S.rrow });
  C('find.toggle-selection', 'Find in Selection', 'text-select', '', () => {
    const v = view();
    if (S.sel) S.sel = false;
    else { const s = v.state.selection.main; if (s.empty) { S.msg = 'Select text first'; bar.sync(); return; } S.sel = true; S.range = { from: s.from, to: s.to }; }
    S.msg = ''; recompute(); bar.sync();
  }, { enabled: () => open_() && !pv(), reason: 'Find in selection needs Source or Split mode', checked: () => S.sel });
  C('find.replace-one', 'Replace', 'replace', '', () => {
    const v = view();
    if (S.doc !== v.state.doc) recompute();
    const i = curOf(v);
    if (i < 0) { go(1); return; }
    const m = S.matches[i], t = text(m);
    apply({ from: m.from, to: m.to, insert: t }, v, t.length - (m.to - m.from));
    v.dispatch({ selection: { anchor: m.from + t.length } });
    recompute(); go(1);
  }, { enabled: () => open_() && !pv() && !!S.matches.length, reason: NO_REPLACE });
  C('find.replace-all', 'Replace All', 'replace-all', '', () => {
    const v = view();
    if (S.doc !== v.state.doc) recompute();
    const ms = S.matches;
    if (!ms.length || S.trunc) { if (S.trunc) { S.msg = 'Too many matches'; bar.sync(); } return; }
    let d = 0;
    const ch = ms.map((m) => { const t = text(m); d += t.length - (m.to - m.from); return { from: m.from, to: m.to, insert: t }; });
    apply(ch, v, d);
    S.msg = `Replaced ${ms.length}`; recompute(); S.msg = `Replaced ${ms.length}`; bar.sync();
  }, { enabled: () => open_() && !pv() && !!S.matches.length, reason: NO_REPLACE });

  store.subscribe((s) => s.ui.mode, () => requestAnimationFrame(() => {
    ['edit.find', 'edit.replace', 'edit.find-next', 'edit.find-prev'].forEach((id) => commands.invalidate(id));
    if (S.open && bar) { dock(); recompute(); bar.sync(); }
  }));
  let lastDoc = null;
  const change = () => { const v = view(); if (!S.open) return; if (!v) { if (!pv()) clear(); return; } if (v.state.doc !== S.doc || v.state.doc !== lastDoc) { lastDoc = v.state.doc; clearTimeout(tid); tid = setTimeout(recompute, 120); } else { paintAll(v); } };
  onEditorActivity(change);
  documents.onDocChange(() => { if (S.open) { clearTimeout(tid); tid = setTimeout(recompute, 60); } });
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.altKey) return;
    const ed = document.querySelector('.md-editor');
    if (!ed || !(ed.contains(e.target) || (e.target === document.body && pv()))) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const id = mod && !e.shiftKey && k === 'f' ? 'edit.find' : mod && !e.shiftKey && k === 'h' ? 'edit.replace'
      : e.key === 'F3' && !mod ? (e.shiftKey ? 'edit.find-prev' : 'edit.find-next') : '';
    if (!id || !commands.canRun(id)) return;
    e.preventDefault(); e.stopPropagation(); commands.execute(id);
  }, true);
}
