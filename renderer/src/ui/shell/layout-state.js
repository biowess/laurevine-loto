import { $ } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { getSetting, setSetting, resetSetting, subscribeSettings } from '../../services/settings-client.js';
import { DEFAULT_LAYOUT, LAYOUT_KEYS, layoutFromSettings, settingsFromLayout } from '../../core/layout-state.js';
import { panels } from './panels.js';

const DEFAULTS = settingsFromLayout(DEFAULT_LAYOUT);
const soft = (fn) => Promise.resolve().then(fn).catch((e) => console.warn('[layout]', e.message));

export function mountLayoutState(root = $('#md')) {
  const saved = {}, offs = [];
  let timer = 0;
  const fromSettings = () => layoutFromSettings(getSetting, (side, id) => !!panels.get(side, id));
  const paint = ({ widths, statusBar }) => {
    root.style.setProperty('--lw', `${widths.left}px`);
    root.style.setProperty('--rw', `${widths.right}px`);
    root.dataset.status = statusBar ? 'on' : 'off';
  };
  const remember = () => Object.assign(saved, settingsFromLayout(store.get().ui));
  const flush = () => {
    timer = 0;
    const now = settingsFromLayout(store.get().ui);
    for (const k of LAYOUT_KEYS) {
      if (saved[k] === now[k]) continue;
      saved[k] = now[k];
      soft(() => (now[k] === DEFAULTS[k] ? resetSetting(k) : setSetting(k, now[k])));
    }
  };
  const onUi = (ui) => {
    paint(ui);
    if (root.dataset.auto === '1') return;
    const now = settingsFromLayout(ui);
    if (!timer && LAYOUT_KEYS.some((k) => saved[k] !== now[k])) timer = setTimeout(flush, 200);
  };

  try { store.dispatch(uiActions.layout(fromSettings())); } catch (e) { console.warn('[layout] restore failed', e.message); }
  remember();
  paint(store.get().ui);

  offs.push(store.subscribe((s) => s.ui, onUi));
  offs.push(subscribeSettings((changed) => {
    const mine = LAYOUT_KEYS.filter((k) => k in changed);
    if (timer || !mine.length || mine.every((k) => getSetting(k) === saved[k])) return; // skip echoes of our own writes (stale partial state reverted the panel view)
    try { store.dispatch(uiActions.layout(fromSettings())); remember(); } catch (e) { console.warn('[layout] sync failed', e.message); }
  }));
  const onHide = () => { if (timer) { clearTimeout(timer); flush(); } };
  addEventListener('pagehide', onHide);
  offs.push(() => removeEventListener('pagehide', onHide));
  return () => offs.forEach((f) => f());
}