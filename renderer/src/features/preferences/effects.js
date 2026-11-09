import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { setZoom } from '../../services/window-client.js';

const FONTS = { mono: 'var(--mono)', sans: 'var(--font)', serif: 'var(--serif)' };
const root = document.documentElement;
const css = (k, v) => root.style.setProperty(k, v);
const apply = {
  'appearance.density': (v) => { root.dataset.density = v; },
  'appearance.zoom': (v) => { Promise.resolve().then(() => setZoom(v / 100)).catch(() => {}); },
  'accessibility.reducedMotion': (v) => root.classList.toggle('reduce-motion', v),
  'accessibility.focusRing': (v) => root.classList.toggle('lv-focus-ring', v),
  'editor.fontFamily': (v) => css('--ed-font', FONTS[v]),
  'editor.fontSize': (v) => css('--ed-size', `${v}px`),
  'editor.lineHeight': (v) => css('--ed-lh', String(v)),
  'editor.caretStyle': (v) => { root.dataset.caret = v; },
};

export function mountEffects() {
  for (const k in apply) apply[k](getSetting(k));
  subscribeSettings((c) => { for (const k in apply) if (c && k in c) apply[k](c[k]); });
}
