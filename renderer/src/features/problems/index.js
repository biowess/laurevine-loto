// Problems: debounced live refresh (rules run as idle-scheduled tasks), panel, editor squiggles (CSS Highlight API), undoable quick fixes, ribbon rule groups.
import { plan, finish, TITLES } from '../../core/problems/model.js';
import { setProblems, getProblems } from '../../services/problems.js';
import { extractHeadings } from '../../core/toc/headings.js';
import { grammarParts } from '../../services/grammar-client.js';
import { getSetting, setSetting, subscribeSettings } from '../../services/settings-client.js';
import { uiActions } from '../../state/slices/ui.js';
import { createView } from './view.js';
import { openRules } from './rules-dialog.js';

const SEV = ['error', 'warning', 'info'], OK = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 250 }) : setTimeout(r, 0)));
const parse = (s) => { try { return JSON.parse(s) || {}; } catch { return {}; } };
const VAL = {
  'val.syntax': ['Markdown Syntax', 'badge-check', 'markdown-syntax'], 'val.headings': ['Heading Hierarchy', 'list-tree', 'heading-structure'], 'val.links': ['Links', 'link', 'links'],
  'val.images': ['Images', 'image', 'images'], 'val.frontmatter': ['Frontmatter', 'braces', 'frontmatter'], 'val.tables': ['Table Structure', 'table', 'table-structure'],
  'val.compat': ['Compatibility', 'puzzle', 'extension-compatibility'],
};

export function register(ctx) {
  const { commands, store, panels, ui: { h, openDialog, toast, kit }, services: { documents: D } } = ctx;
  const S = { sev: '', group: '', q: '', by: 'category', has: false, capped: false };
  const entry = () => { const id = store.get().documents.activeId; return id ? D.getEntry(id) : null; };
  const view = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  const text = () => { const v = view(), e = entry(); return v ? v.state.doc.toString() : e ? e.doc.text : null; };
  const hooked = new WeakSet();
  let token = 0, timer = 0, last = null, size = 0, raf = 0, V;

  const clear = () => { if (OK) SEV.forEach((s) => CSS.highlights.delete('lv-prob-' + s)); };
  const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };
  function paint() {
    clear();
    const v = view();
    if (!OK || !v || !getSetting('problems.squiggles')) return;
    if (!hooked.has(v)) { hooked.add(v); v.scrollDOM.addEventListener('scroll', soon, { passive: true }); }
    const { from, to } = v.viewport, len = v.state.doc.length, by = { error: [], warning: [], info: [] };
    let n = 0;
    for (const p of getProblems()) {
      if (p.to < from || p.from > to || n >= 1500) continue;
      const a = Math.min(p.from, len), b = Math.min(Math.max(p.to, a + 1), len);
      if (b <= a) continue;
      try {
        const x = v.domAtPos(a), y = v.domAtPos(b), r = document.createRange();
        r.setStart(x.node, x.offset); r.setEnd(y.node, y.offset);
        by[p.severity].push(r); n++;
      } catch { /* not rendered */ }
    }
    SEV.forEach((s) => { if (by[s].length) CSS.highlights.set('lv-prob-' + s, new Highlight(...by[s])); });
  }

  const cfg = () => ({ disabled: new Set(getSetting('problems.disabled').split(',').filter(Boolean)), severity: parse(getSetting('problems.severity')) });
  async function run() {
    const my = ++token, t = text();
    S.has = t != null;
    if (!S.has) { S.go = false; last = null; setProblems([], { error: 0, warning: 0, info: 0 }); return clear(); }
    const { disabled, severity } = cfg(), parts = [];
    last = t; size = t.length;
    for (const f of plan(t, { disabled })) {
      await idle();
      if (my !== token) return;
      try { parts.push(f()); } catch { /* a failing rule is skipped */ }
    }
    if (my !== token) return;
    if (!disabled.has('grammar')) parts.push(grammarParts(store.get().documents.activeId, t));
    const r = finish(t, parts, { severity });
    S.capped = r.total > r.list.length;
    setProblems(r.list, r.counts, r.total);
    paint();
    if (S.go) {
      S.go = false;
      const p = r.list.find((q) => q.cat === S.group);
      if (p) jump(p); else toast(`No ${TITLES[S.group] || 'matching'} issues found.`);
    }
  }
  const schedule = (ms) => {
    clearTimeout(timer);
    const delay = ms ?? Math.min(3000, 500 + Math.floor(size / 100));
    timer = setTimeout(() => {
      if (window.requestIdleCallback) window.requestIdleCallback(() => run(), { timeout: 1500 });
      else run();
    }, delay);
  };

  function jump(p) {
    const v = view();
    if (!v) return void commands.execute('search.reveal', { path: '', line: p.line, col: 0, len: 0 });
    const len = v.state.doc.length, a = Math.min(p.from, len), b = Math.min(Math.max(p.to, a), len);
    v.dispatch({ selection: { anchor: a, head: b }, effects: v.constructor.scrollIntoView(a, { x: 'center', y: 'center' }), userEvent: 'select.problem' });
    v.focus();
  }

  function goLine(line) {
    const v = view();
    if (!v) return void commands.execute('search.reveal', { path: '', line, col: 0, len: 0 });
    const l = v.state.doc.line(Math.min(Math.max(line, 1), v.state.doc.lines));
    v.dispatch({ selection: { anchor: l.from }, effects: v.constructor.scrollIntoView(l.from, { x: 'center', y: 'center' }), userEvent: 'select.problem' });
    v.focus();
  }

  function applyFix(p, insert) {
    const v = view(), f = p.fix;
    if (!v || !f) return toast('Open the document in Source or Split mode to apply fixes.');
    const d = v.state.doc;
    if (f.to > d.length || d.sliceString(f.from, f.to) !== f.was) { toast('The document changed. Problems refreshed.'); return schedule(0); }
    v.dispatch({ changes: { from: f.from, to: f.to, insert: insert ?? f.insert }, userEvent: 'input.fix' });
    v.focus();
    schedule(200);
  }

  function ask(p) {
    const inp = h('input', { type: 'text', class: 'pr__q', 'aria-label': 'Alt text' });
    inp.value = 'image description';
    openDialog({
      title: 'Add Alt Text', icon: 'image', width: 420, focus: 'input', body: [h('p', {}, 'Describe the image for readers who cannot see it.'), inp],
      buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: () => { const v = inp.value.replace(/[[\]\n]/g, ' ').trim(); if (!v) return false; applyFix(p, v); } }],
    });
  }

  V = createView(ctx, S, { jump, heading: (x) => goLine(x.line + 1), headings: () => extractHeadings(text() || ''), fix: (p) => (p.fix.prompt ? ask(p) : applyFix(p)) });
  const show = (o = {}) => {
    Object.assign(S, { sev: '', group: '', q: '', go: false }, o);
    ctx.ui.openPanel('right', 'problems');
    V.sync();
    schedule(0);
    requestAnimationFrame(() => V.focus());
  };

  const need = { enabled: () => !!entry(), reason: 'Needs an open document' };
  const def = (id, title, icon, run, extra) => commands.register({ id, title, icon, group: 'Problems', run, ...extra });
  def('problems.toggle', 'Problems', 'triangle-alert', () => { ctx.ui.openPanel('right', 'problems', true); V.sync(); });
  def('problems.show', 'Show Problems', 'triangle-alert', (s) => show({ sev: SEV.includes(s) ? s : '' }));
  def('problems.refresh', 'Refresh Problems', 'refresh-cw', () => schedule(0), need);
  def('problems.fix-here', 'Quick Fix at Cursor', 'triangle-alert', () => {
    const v = view(), pos = v && v.state.selection.main.head, p = getProblems().find((q) => q.fix && pos >= q.from && pos <= q.to);
    if (p) (p.fix.prompt ? ask(p) : applyFix(p)); else toast('No quick fix at the cursor.');
  }, { shortcut: 'Ctrl+.', enabled: () => !!view(), reason: 'Needs the source editor' });
  def('problems.settings', 'Problem Rules…', 'settings-2', () => openRules(ctx, () => { schedule(0); paint(); }));
  def('problems.group', 'Show Rule Group', 'triangle-alert', async (g) => {
    if (typeof g !== 'string' || !TITLES[g]) return;
    const off = cfg().disabled;
    if (off.has(g)) {
      off.delete(g);
      try { await setSetting('problems.disabled', [...off].join(',')); } catch { return toast('Could not turn on that rule group.'); }
      toast(`${TITLES[g]} turned on.`);
    }
    show({ group: g, go: true });
  }, need);
  for (const [id, [title, icon, g]] of Object.entries(VAL)) def(id, title, icon, () => commands.execute('problems.group', g), need);

  D.onDocChange(() => { const e = entry(); if (e && e.doc.text !== last) { clear(); schedule(); } });
  store.subscribe((s) => s.documents.activeId, () => { clear(); schedule(0); });
  store.subscribe((s) => s.ui.mode, () => setTimeout(paint, 60));
  subscribeSettings(() => paint());
  setTimeout(() => schedule(0), 0);

  return [panels.register({
    id: 'problems', side: 'right', icon: 'triangle-alert', title: 'Problems',
    actions: [kit.act('refresh-cw', 'problems.refresh'), kit.act('settings-2', 'problems.settings')],
    render: () => { V.sync(); return V.el; },
  })];
}