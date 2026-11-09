import { registerGoto } from './goto.js';

const SPLIT = ['split', 'previewLeft', 'previewRight'];
const $ = (id) => document.getElementById(id);
const el = (n) => (n && n.nodeType === 1 ? n : n && n.parentElement);
const shown = (n) => n && n.clientHeight > 0;
const frames = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

export function register(ctx) {
  const { commands, settings } = ctx;
  commands.register({ id: 'nav.go-to-source', title: 'Go to Source', group: 'View', run: () => ctx.nav && ctx.nav.go() });
  commands.register({
    id: 'nav.caret-marker', title: 'Mark Caret Block in Preview', group: 'View',
    checked: () => settings.get('editor.caretMarker'),
    run: () => settings.set('editor.caretMarker', !settings.get('editor.caretMarker')),
  });
  registerGoto(ctx);
  setTimeout(() => mount(ctx), 0);
}

function mount(ctx) {
  const { store, settings, services: { documents }, ui: { h, runCommand } } = ctx;
  const src = $('src'), prev = $('prev');
  if (!src || !prev) return;
  const view = () => documents.editorRun('view');
  const scroller = () => src.querySelector('.cm-scroller');
  const id = () => store.get().documents.activeId;
  const mode = () => store.get().ui.mode;

  const blockOf = (n) => {
    let b = el(n) && el(n).closest('[data-src-line]');
    while (b && b.parentElement && b.parentElement.closest('[data-src-line]')) b = b.parentElement.closest('[data-src-line]');
    return b;
  };

  // Scroll positions per document, recorded only while a pane is visible.
  const pos = new Map();
  let quiet = 0, skip = false, last = null, back = null, backTimer = 0;
  const hold = () => { quiet++; frames(() => { quiet--; }); };
  const rec = (k, n) => { if (quiet || !shown(n)) return; const r = pos.get(id()) || {}; r[k] = n.scrollTop; pos.set(id(), r); };
  src.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('cm-scroller')) rec('src', e.target); }, true);
  prev.addEventListener('scroll', () => rec('prev', prev));

  let pending = 0;
  new MutationObserver(() => { if (pending) { pending = 0; const r = pos.get(id()); if (r && r.prev != null) prev.scrollTop = r.prev; } mark(); }).observe(prev, { childList: true });
  function restore() {
    hold();
    if (skip) { skip = false; return; }
    frames(() => {
      const r = pos.get(id()), sc = scroller();
      if (!r) return;
      if (sc && shown(sc) && r.src != null) sc.scrollTop = r.src;
      if (shown(prev) && r.prev != null) { prev.scrollTop = r.prev; pending = 1; setTimeout(() => { pending = 0; }, 600); }
    });
  }

  // Source -> preview caret marker.
  let marked = null, mraf = 0;
  function mark() {
    mraf = 0;
    const v = view();
    if (marked) { marked.classList.remove('nv-caret'); marked = null; }
    if (!v || !settings.get('editor.caretMarker') || !SPLIT.includes(mode())) return;
    const line = v.state.doc.lineAt(v.state.selection.main.head).number;
    let best = null;
    for (const b of prev.querySelectorAll('[data-src-line]')) {
      if (b.parentElement && b.parentElement.closest('[data-src-line]')) continue;
      const a = Number(b.dataset.srcLine), z = Number(b.dataset.srcEnd);
      if (a <= line && (!best || a >= Number(best.dataset.srcLine))) best = b;
      if (a <= line && line <= z) break;
    }
    if (best) {
      const inner = Array.from(best.querySelectorAll('[data-src-line]')).filter((n) => n.tagName !== 'TR' && Number(n.dataset.srcLine) <= line && line <= Number(n.dataset.srcEnd)).pop();
      if (inner) best = inner;
      best.classList.add('nv-caret'); marked = best;
    }
  }
  const queue = () => { if (!mraf) mraf = requestAnimationFrame(mark); };
  document.addEventListener('selectionchange', () => { if (src.contains(document.activeElement)) queue(); });
  src.addEventListener('input', queue);

  // Preview -> source.
  const clearBack = () => { clearTimeout(backTimer); if (back) back.remove(); back = null; };
  function flash(v, from, to) {
    const d = v.state.doc;
    for (let n = d.lineAt(from).number, e = Math.min(d.lineAt(to).number, n + 200); n <= e; n++) {
      const dom = el(v.domAtPos(d.line(n).from).node), l = dom && dom.closest('.cm-line');
      if (l) { l.classList.remove('nv-flash'); void l.offsetWidth; l.classList.add('nv-flash'); }
    }
  }
  function go() {
    const b = blockOf(last), v = view();
    if (!b || !v) return;
    const d = v.state.doc, a = Math.min(d.lines, Number(b.dataset.srcLine)), z = Math.min(d.lines, Number(b.dataset.srcEnd));
    const from = d.line(a).from, to = d.line(z).to, wasPreview = mode() === 'preview';
    if (wasPreview) { skip = true; runCommand('view.mode-source'); }
    v.dispatch({ selection: { anchor: from, head: to } });
    frames(() => {
      v.dispatch({ effects: v.constructor.scrollIntoView(from, { y: 'start', yMargin: 40 }) });
      v.focus();
      flash(v, from, to);
      if (wasPreview) {
        clearBack();
        back = h('button', { type: 'button', class: 'nv-back', onclick: () => { clearBack(); runCommand('view.mode-preview'); } }, 'Back to preview');
        src.append(back);
        backTimer = setTimeout(clearBack, 10000);
      }
    });
  }
  ctx.nav = { go };
  const target = (e) => { last = e.target; };
  prev.addEventListener('contextmenu', target, true);
  prev.addEventListener('dblclick', (e) => { last = e.target; const s = window.getSelection(); if (s) s.removeAllRanges(); go(); });

  store.subscribe((s) => s.ui.mode, () => { clearBack(); restore(); queue(); });
  store.subscribe((s) => s.documents.activeId, () => { clearBack(); restore(); queue(); });
  queue();
}
