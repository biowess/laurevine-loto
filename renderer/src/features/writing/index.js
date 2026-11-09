import { focusRange, easeStep } from '../../core/writing/focus-range.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';
import { reducedMotion } from '../../ui/kit/a11y.js';

const $ = (id) => document.getElementById(id);
const PRESETS = [[60, 'ch'], [66, 'ch'], [72, 'ch'], [80, 'ch'], [720, 'px'], [900, 'px']];
const POS = [['Upper third', 33], ['Center', 50], ['Lower third', 66]];
const WHY = 'Typewriter Mode needs the source editor. Switch to Source or Split.';

export function register(ctx) {
  const { commands, settings, store, services: { documents }, ui } = ctx;
  const get = (k) => settings.get(`editor.${k}`);
  const set = (k, v) => settings.set(`editor.${k}`, v);
  const mode = () => store.get().ui.mode;
  const ids = [];
  const reg = (def) => { ids.push(def.id); commands.register({ group: 'Display', ...def }); };
  const anchor = () => { const e = document.activeElement; return e && e !== document.body && document.contains(e) ? e : $('src'); };
  const menu = (id, title, icon, items) => reg({ id, title, icon, run: () => ui.openMenu(anchor(), items()) });

  const width = (id, title, icon, v) => reg({ id, title, icon, checked: () => get('layoutWidth') === v, run: () => set('layoutWidth', v) });
  width('view.centered', 'Centered Column', 'align-center', 'centered');
  width('view.full-width', 'Full Width', 'move-horizontal', 'full');
  width('view.reading-width', 'Reading Width', 'book-open', 'reading');
  reg({
    id: 'view.content-width-set', title: 'Set Reading Width', icon: 'ruler',
    run: async (a = {}) => {
      const u = a.u === 'px' ? 'px' : 'ch', w = Math.round(Math.min(u === 'px' ? 2000 : 200, Math.max(u === 'px' ? 200 : 20, +a.w || 0)));
      await set('contentWidth', w); await set('contentWidthUnit', u); await set('layoutWidth', 'reading');
    },
  });
  const custom = () => {
    const { h } = ui;
    const n = h('input', { type: 'number', min: '20', max: '2000', value: String(get('contentWidth')), 'aria-label': 'Width', class: 'lv-in' });
    const u = h('select', { 'aria-label': 'Unit', class: 'lv-in' }, ...['ch', 'px'].map((x) => h('option', { value: x }, x)));
    u.value = get('contentWidthUnit');
    ui.openDialog({
      title: 'Reading width', icon: 'ruler', width: 360, body: h('div', { class: 'lv-row' }, n, u),
      buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: () => { commands.execute('view.content-width-set', { w: n.value, u: u.value }); } }],
    });
  };
  menu('view.content-width', 'Content Width', 'ruler', () => [
    ...PRESETS.map(([w, u]) => ({
      label: `${w} ${u}`, checked: () => get('layoutWidth') === 'reading' && get('contentWidth') === w && get('contentWidthUnit') === u,
      onSelect: () => commands.execute('view.content-width-set', { w, u }),
    })),
    '-', { label: 'Custom…', onSelect: custom },
  ]);

  reg({ id: 'view.focus', title: 'Focus Mode', icon: 'focus', checked: () => get('focusMode') === true, run: () => set('focusMode', !get('focusMode')) });
  reg({ id: 'view.focus-scope-set', title: 'Set Focus Scope', icon: 'focus', run: (s) => set('focusScope', s === 'sentence' ? 'sentence' : 'paragraph') });
  menu('view.focus-scope', 'Focus Scope', 'focus', () => ['paragraph', 'sentence'].map((s) => ({
    label: s === 'paragraph' ? 'Paragraph' : 'Sentence', checked: () => get('focusScope') === s, onSelect: () => commands.execute('view.focus-scope-set', s),
  })));

  reg({
    id: 'view.typewriter', title: 'Typewriter', icon: 'keyboard', reason: WHY,
    checked: () => get('typewriter') === true, enabled: () => mode() !== 'preview', run: () => set('typewriter', !get('typewriter')),
  });
  reg({ id: 'view.typewriter-position-set', title: 'Set Typewriter Position', icon: 'keyboard', run: (p) => set('typewriterPosition', Math.round(Math.min(80, Math.max(20, +p || 50)))) });
  menu('view.typewriter-position', 'Typewriter Position', 'keyboard', () => POS.map(([label, p]) => ({
    label, checked: () => get('typewriterPosition') === p, onSelect: () => commands.execute('view.typewriter-position-set', p),
  })));

  setTimeout(() => mount(ctx, ids), 0);
}

function mount(ctx, ids) {
  const { commands, settings, store, services: { documents }, ui } = ctx;
  const src = $('src');
  if (!src) return;
  const get = (k) => settings.get(`editor.${k}`);
  const view = () => documents.editorRun('view');
  let raf = 0, byMouse = false, key = '', docId = store.get().documents.activeId, paintQ = 0, warned = false;

  const pad = () => {
    const v = view(), h = v ? v.scrollDOM.clientHeight : 0, p = get('typewriterPosition') / 100;
    src.style.setProperty('--lv-tw-t', `${Math.round(h * p)}px`);
    src.style.setProperty('--lv-tw-b', `${Math.round(h * (1 - p))}px`);
  };
  const twOn = () => get('typewriter') && store.get().ui.mode !== 'preview';
  const apply = () => {
    const w = get('layoutWidth');
    src.dataset.lv = w;
    src.style.setProperty('--lv-measure', w === 'centered' ? '80ch' : w === 'reading' ? `${get('contentWidth')}${get('contentWidthUnit')}` : 'none');
    src.classList.toggle('lv-focus', get('focusMode'));
    src.classList.toggle('lv-tw', twOn());
    pad();
  };

  const paint = () => {
    paintQ = 0;
    const v = view();
    if (!v) return;
    if (window.CSS && CSS.highlights) CSS.highlights.delete('lv-dim');
    const lines = v.contentDOM.querySelectorAll('.cm-line');
    if (!get('focusMode')) { lines.forEach((l) => l.classList.remove('lv-hot')); return; }
    const doc = v.state.doc, sentence = get('focusScope') === 'sentence';
    const [a, b] = focusRange(doc, v.state.selection.main.head, get('focusScope'));
    const dim = [], span = (f, t) => { const s = v.domAtPos(f), e = v.domAtPos(t), r = new Range(); r.setStart(s.node, s.offset); r.setEnd(e.node, e.offset); dim.push(r); };
    lines.forEach((el) => {
      const ln = doc.lineAt(v.posAtDOM(el)), hot = ln.from <= b && ln.to >= a;
      el.classList.toggle('lv-hot', hot);
      if (hot && sentence) { try { if (ln.from < a) span(ln.from, a); if (ln.to > b) span(b, ln.to); } catch { /* DOM not ready */ } }
    });
    if (dim.length && window.CSS && CSS.highlights) CSS.highlights.set('lv-dim', new Highlight(...dim));
  };
  const queuePaint = () => { if (!paintQ) paintQ = requestAnimationFrame(paint); };

  const glide = () => {
    cancelAnimationFrame(raf);
    const step = () => {
      const v = view();
      if (!v || !twOn() || byMouse) return;
      const sc = v.scrollDOM, c = v.coordsAtPos(v.state.selection.main.head);
      if (!c) return;
      const r = sc.getBoundingClientRect(), want = r.top + (r.height * get('typewriterPosition')) / 100;
      const goal = Math.min(sc.scrollHeight - sc.clientHeight, Math.max(0, sc.scrollTop + (c.top + c.bottom) / 2 - want));
      if (Math.abs(goal - sc.scrollTop) < 1) return;
      sc.scrollTop = reducedMotion() ? goal : easeStep(sc.scrollTop, goal);
      if (!reducedMotion() && Math.abs(goal - sc.scrollTop) >= 1) raf = requestAnimationFrame(step);
    };
    step();
  };

  src.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('.cm-content')) { byMouse = true; cancelAnimationFrame(raf); } }, true);
  src.addEventListener('keydown', () => { byMouse = false; }, true);
  src.addEventListener('beforeinput', () => { byMouse = false; }, true);
  src.addEventListener('wheel', () => cancelAnimationFrame(raf), { passive: true });
  src.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('cm-scroller') && get('focusMode')) queuePaint(); }, true);
  new ResizeObserver(pad).observe(src);

  onEditorActivity(() => {
    const v = view(), id = store.get().documents.activeId;
    if (!v) return;
    const k = `${v.state.selection.main.head}:${v.state.doc.length}`;
    const moved = k !== key && id === docId;
    key = k; docId = id;
    queuePaint();
    if (moved && twOn()) glide();
  });
  store.subscribe((s) => s.ui.mode, () => {
    apply(); queuePaint();
    if (get('typewriter') && store.get().ui.mode === 'preview') { if (!warned) { warned = true; ui.toast('Typewriter Mode is paused in preview-only mode.'); } } else { warned = false; glide(); }
    commands.invalidate('view.typewriter');
  });
  settings.subscribe(() => {
    apply(); queuePaint(); glide();
    ids.forEach((id) => commands.invalidate(id));
  });
  apply();
  queuePaint();
}
