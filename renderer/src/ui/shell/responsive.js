import { $ } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';

const SIDES = ['left', 'right'];
export const COMPACT_WIDTH = 1000;
export const NARROW_WIDTH = 760;
const HYSTERESIS = 40;

// Below COMPACT_WIDTH sidebars float over the editor; below NARROW_WIDTH open sidebars close until the window is wide again.
// Auto-collapse is transient: layout-state skips persisting while data-auto is set, and any manual panel change takes over.
export function mountResponsive(root = $('#md')) {
  const closed = new Set();
  let busy = false;

  const setPanels = (open, sides) => {
    busy = true;
    try { for (const side of sides) store.dispatch(uiActions.panel(side, { open })); } finally { busy = false; }
  };

  const collapse = () => {
    const open = SIDES.filter((s) => store.get().ui.panels[s].open);
    root.dataset.auto = '1';
    closed.clear();
    open.forEach((s) => closed.add(s));
    setPanels(false, open);
  };

  const restore = () => {
    delete root.dataset.auto;
    const back = [...closed].filter((s) => !store.get().ui.panels[s].open);
    closed.clear();
    setPanels(true, back);
  };

  const apply = () => {
    const w = root.clientWidth, auto = root.dataset.auto === '1';
    root.dataset.compact = w < COMPACT_WIDTH ? 'on' : 'off';
    if (root.dataset.view) return;
    const narrow = w < (auto ? NARROW_WIDTH + HYSTERESIS : NARROW_WIDTH);
    if (narrow && !auto) collapse();
    else if (!narrow && auto) restore();
  };

  const offPanels = store.subscribe((s) => s.ui.panels, () => { if (!busy) closed.clear(); });
  const ro = new ResizeObserver(apply);
  ro.observe(root);
  apply();
  return () => { ro.disconnect(); offPanels(); };
}
