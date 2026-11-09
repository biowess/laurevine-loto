import { $, $$ } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { WIDTH } from '../../core/layout-state.js';

export function mountGrips(root = $('#md')) {
  const offs = $$('.md-grip', root).map((g) => {
    const down = (e) => {
      const side = g.dataset.grip, left = side === 'left', x0 = e.clientX, w0 = store.get().ui.widths[side];
      const move = (m) => store.dispatch(uiActions.width(side, w0 + (left ? 1 : -1) * (m.clientX - x0)));
      const up = () => { root.classList.remove('is-resizing'); removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
      e.preventDefault();
      root.classList.add('is-resizing');
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    };
    const reset = () => store.dispatch(uiActions.width(g.dataset.grip, WIDTH.def));
    g.addEventListener('mousedown', down); g.addEventListener('dblclick', reset);
    return () => { g.removeEventListener('mousedown', down); g.removeEventListener('dblclick', reset); };
  });
  return () => offs.forEach((f) => f());
}
