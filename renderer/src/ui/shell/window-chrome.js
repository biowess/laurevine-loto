import { $ } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { getSetting, setSetting, subscribeSettings } from '../../services/settings-client.js';
import { setNativeTheme, toggleMaximize } from '../../services/window-client.js';
import { THEME_KEY, normalizeTheme, resolveDark, windowTitle } from '../../core/window-chrome.js';
import { mountColorPickers } from '../kit/color-picker.js';

const KEY = 'appearance.theme';
const soft = (fn) => Promise.resolve().then(fn).catch((e) => console.warn('[window]', e.message));

function paint(theme) {
  const root = document.documentElement;
  if (resolveDark(theme, matchMedia('(prefers-color-scheme: dark)').matches)) root.dataset.theme = 'dark'; else delete root.dataset.theme;
}

export function mountWindowChrome() {
  const offs = [], mq = matchMedia('(prefers-color-scheme: dark)');
  store.dispatch(uiActions.theme(normalizeTheme(getSetting(KEY))));
  paint(store.get().ui.theme);
  soft(() => setNativeTheme(store.get().ui.theme));

  offs.push(store.subscribe((s) => s.ui.theme, (theme) => {
    paint(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
    soft(() => setNativeTheme(theme));
    if (getSetting(KEY) !== theme) soft(() => setSetting(KEY, theme));
  }));
  offs.push(subscribeSettings((changed) => { if (KEY in changed) store.dispatch(uiActions.theme(normalizeTheme(changed[KEY]))); }));
  const onSystem = () => { if (store.get().ui.theme === 'system') paint('system'); };
  mq.addEventListener('change', onSystem);
  offs.push(() => mq.removeEventListener('change', onSystem));

  const title = () => { const { tabs, activeId } = store.get().documents, t = tabs.find((x) => x.id === activeId); document.title = windowTitle(t?.title, t?.dirty, store.get().workspace.name); };
  offs.push(store.subscribe((s) => s.documents, title), store.subscribe((s) => s.workspace.name, title));
  title();

  const bar = $('.titlebar');
  if (bar && document.documentElement.dataset.platform === 'linux') {
    const onDbl = (e) => { if (!e.target.closest('button, input, a, .search')) soft(toggleMaximize); };
    bar.addEventListener('dblclick', onDbl);
    offs.push(() => bar.removeEventListener('dblclick', onDbl));
  }
  const fill = (r) => { const lo = +r.min || 0, hi = r.max === '' ? 100 : +r.max; r.style.setProperty('--fill', `${hi > lo ? ((r.value - lo) / (hi - lo)) * 100 : 0}%`); };
  const onIn = (e) => { if (e.target.type === 'range') fill(e.target); };
  const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) (n.type === 'range' ? [n] : n.querySelectorAll('input[type=range]')).forEach(fill); })));
  document.addEventListener('input', onIn, true);
  mo.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll('input[type=range]').forEach(fill);
  offs.push(() => { document.removeEventListener('input', onIn, true); mo.disconnect(); }, mountColorPickers());
  return () => offs.forEach((f) => f());
}
