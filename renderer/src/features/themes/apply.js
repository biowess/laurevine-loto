import { TOKENS, allThemes, isStock, parseLibrary, resolveSlot } from '../../core/themes/model.js';
import { resolveDark } from '../../core/window-chrome.js';
import { adaptPreview, watchPreview } from './preview-adapt.js';

export const CACHE_KEY = 'loto.themeVars';
export const SLOT = Object.freeze({ light: 'themes.light', dark: 'themes.dark' });

const PREVIEW = Object.freeze({
  '--pv-bg': 'var(--paper)', '--pv-hc': 'var(--text)', '--pv-link': 'var(--accent-d)', '--pv-quote': 'var(--accent)',
  '--pv-rule': 'var(--border)', '--pv-code-bg': 'var(--hover)', '--pv-stripe': 'color-mix(in srgb,var(--accent) 7%,transparent)',
});

export function paintVars(el, theme, extra) {
  if (!el) return;
  for (const t of TOKENS) el.style.removeProperty(`--${t.key}`);
  for (const k of Object.keys(PREVIEW)) el.style.removeProperty(k);
  el.style.removeProperty('color-scheme');
  if (!theme) return;
  for (const t of TOKENS) el.style.setProperty(`--${t.key}`, theme.vars[t.key]);
  el.style.setProperty('color-scheme', theme.base);
  for (const [k, v] of Object.entries(extra || {})) el.style.setProperty(k, v);
}

export function mountThemes(ctx) {
  const { store, settings } = ctx, mq = matchMedia('(prefers-color-scheme: dark)');
  const prev = () => document.getElementById('prev'), src = () => document.getElementById('src');

  function run() {
    const customs = parseLibrary(settings.get('themes.library')).themes;
    const slot = (base) => resolveSlot(customs, settings.get(SLOT[base]), base);
    const active = slot(resolveDark(store.get().ui.theme, mq.matches) ? 'dark' : 'light');
    const pick = (key) => allThemes(customs).find((t) => t.id === settings.get(key)) || null;
    paintVars(document.documentElement, isStock(active) ? null : active);
    paintVars(prev(), pick('themes.preview'), PREVIEW);
    adaptPreview(prev());
    paintVars(src(), null);
    if (src()) delete src().dataset.theme;
    const cache = Object.fromEntries(['light', 'dark'].map((b) => [b, isStock(slot(b)) ? null : slot(b).vars]));
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* storage unavailable */ }
  }

  run();
  watchPreview(prev);
  store.subscribe((s) => s.ui.theme, run);
  settings.subscribe((changed) => { if (Object.keys(changed).some((k) => k.startsWith('themes.'))) run(); });
  mq.addEventListener('change', run);
}
