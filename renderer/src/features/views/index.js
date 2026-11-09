import { snapshot, VIEWS } from '../../core/view-modes.js';
import { uiActions } from '../../state/slices/ui.js';

export function register(ctx) {
  const { commands, store, services, ui: kit } = ctx;
  const ui = () => store.get().ui;
  const send = (a) => { store.dispatch(a); };
  const root = () => document.getElementById('md');
  let view = '', saved = null, fs = false;
  const prior = {};

  const bar = kit.h('div', { class: 'rd-bar', role: 'toolbar', 'aria-label': 'Reading view' },
    kit.h('span', { class: 'rd-bar__t' }, 'Reading View'),
    kit.h('span', { class: 'rd-bar__k' }, 'Esc to exit'),
    kit.h('button', { type: 'button', class: 'rd-bar__x', title: 'Exit Reading View', onclick: () => kit.runCommand('view.reading-mode') }, 'Exit'));
  const edges = ['t', 'b', 'l', 'r'].map((s) => kit.h('div', { class: `md-edge md-edge--${s}`, 'aria-hidden': 'true' }));
  const mount = () => {
    const r = root(), ed = r && r.querySelector('.md-editor');
    if (!r) return;
    if (ed && !ed.querySelector('.rd-bar')) ed.prepend(bar);
    if (!r.querySelector('.md-edge')) r.append(...edges);
  };
  const paint = () => {
    mount();
    const r = root();
    if (view) r.dataset.view = view; else delete r.dataset.view;
    ['view.reading-mode', 'view.distraction-free'].forEach(commands.invalidate);
  };
  const enter = (v) => {
    if (!view) saved = snapshot(ui());
    view = v;
    if (v === VIEWS.reading) send(uiActions.mode('preview'));
    paint();
    const f = document.activeElement;
    if (f && f.closest && f.closest('.ribbon,.tabrow')) f.blur();
  };
  const exit = () => {
    if (!view) return;
    const s = saved;
    view = ''; saved = null;
    store.batch(() => { send(uiActions.layout(s.layout)); send(uiActions.mode(s.mode)); });
    paint();
  };
  const toggle = (v) => () => (view === v ? exit() : enter(v));
  const reg = (def) => commands.register({ group: 'Display', ...def });

  reg({ id: 'view.reading-mode', title: 'Reading View', icon: 'book-open', checked: () => view === VIEWS.reading, run: toggle(VIEWS.reading) });
  reg({ id: 'view.distraction-free', title: 'Distraction-Free View', icon: 'eye-off', checked: () => view === VIEWS.free, run: toggle(VIEWS.free) });
  reg({
    id: 'view.fullscreen', title: 'Full Screen', icon: 'maximize', shortcut: 'F11', checked: () => fs,
    run: async () => { const r = await services.window.setFullScreen(!fs); fs = !!r.fullScreen; commands.invalidate('view.fullscreen'); },
  });

  // Hides one pane and remembers the mode so showing it again restores the previous layout.
  const pane = (id, title, icon, hidden, visible) => reg({
    id, title, icon, checked: () => visible(ui().mode),
    run: () => {
      const m = ui().mode;
      if (visible(m)) { prior[id] = m; send(uiActions.mode(hidden)); }
      else send(uiActions.mode(prior[id] && visible(prior[id]) ? prior[id] : 'split'));
    },
  });
  pane('view.toggle-editor', 'Toggle Editor', 'code-xml', 'preview', (m) => m !== 'preview');
  pane('view.toggle-preview', 'Toggle Preview', 'eye', 'source', (m) => m !== 'source');

  const side = (id, title, icon, s, v) => reg({
    id, title, icon, checked: () => { const p = ui().panels[s]; return p.open && p.view === v; },
    run: () => kit.openPanel(s, v, true),
  });
  side('view.toggle-outline', 'Toggle Outline', 'list-tree', 'right', 'outline');
  side('view.toggle-search', 'Toggle Search Panel', 'search', 'left', 'search');

  const onKey = (e) => {
    if (e.key === 'F11') { e.preventDefault(); kit.runCommand('view.fullscreen'); }
    else if (e.key === 'Escape' && view && (!e.defaultPrevented || (e.target.closest && e.target.closest('.ribbon,.tabrow')))) {
      const { backstage, studio } = ui();
      if (!backstage.open && !studio.open) exit();
    }
  };
  document.addEventListener('keydown', onKey);
  addEventListener('resize', () => {
    const now = innerWidth === screen.width && innerHeight === screen.height;
    if (now !== fs) { fs = now; commands.invalidate('view.fullscreen'); }
  });
  mount();
}