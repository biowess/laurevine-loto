import { $ } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { runCommand } from './panels.js';

export function mountKeys(root = document) {
  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return;
      const { backstage, studio } = store.get().ui;
      if (studio.open) runCommand('studio.close');
      else if (backstage.open) store.dispatch(uiActions.backstage(false));
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      const input = $('.titlebar__search input');
      if (input) { e.preventDefault(); input.focus(); input.select(); }
    }
  };
  root.addEventListener('keydown', onKey);
  return () => root.removeEventListener('keydown', onKey);
}
