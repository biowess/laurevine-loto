import { $ } from '../kit/dom.js';
import { rove } from '../kit/roving.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { panels, renderSidebar } from './panels.js';

export function mountWorkArea(root = $('#md')) {
  const els = { left: $('#left', root), right: $('#right', root) };
  const draw = (side) => {
    const p = store.get().ui.panels[side];
    root.dataset[side] = p.open ? 'on' : 'off';
    if (p.open) renderSidebar(els[side], side, p.view, (view) => store.dispatch(uiActions.panel(side, { view })));
  };
  const both = () => { draw('left'); draw('right'); };
  const mode = () => {}; // data-mode is per group, set by ui/editor/groups.js
  const subs = [
    store.subscribe((s) => s.ui.panels.left, () => draw('left')),
    store.subscribe((s) => s.ui.panels.right, () => draw('right')),
    store.subscribe((s) => s.ui.mode, mode),
    panels.onChange(both),
  ];
  const roves = [rove(els.left, '.md-sw [role="tab"]'), rove(els.right, '.md-sw [role="tab"]')];
  both(); mode();
  return () => { subs.forEach((f) => f()); roves.forEach((r) => r.destroy()); };
}
