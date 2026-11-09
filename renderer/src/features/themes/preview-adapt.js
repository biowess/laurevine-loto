import { contrastRatio } from '../../core/themes/colour.js';

// Derives the preview's link, quote, rule, code and stripe colours from the applied theme and the
// preview's actual background, so any theme/preset pairing stays legible. Writes only inline --pv-* vars.
const applied = new WeakMap();
const pick = (bg, list, min) => {
  let top = null, best = 0;
  for (const c of list) {
    const r = c && contrastRatio(c, bg);
    if (r == null) continue;
    if (r >= min) return c;
    if (r > best) { best = r; top = c; }
  }
  return top || list[list.length - 1];
};

export function adaptPreview(p) {
  if (!p) return;
  const cs = getComputedStyle(p), v = (n) => cs.getPropertyValue(n).trim();
  let bg = cs.backgroundColor;
  if (!contrastRatio(bg, '#000') || /rgba\(.*,\s*0\)$/.test(bg)) bg = v('--paper');
  const text = v('--text'), tok = (...n) => n.map(v);
  const next = {
    '--pv-hc': pick(bg, [text, ...tok('--t-head')], 4.5),
    '--pv-link': pick(bg, tok('--accent-d', '--accent', '--t-link', '--accent-l').concat(text), 4.5),
    '--pv-quote': pick(bg, tok('--accent', '--accent-l', '--accent-d', '--border-2'), 3),
    '--pv-rule': `color-mix(in srgb,${text} 18%,${bg})`,
    '--pv-code-bg': `color-mix(in srgb,${text} 6%,${bg})`,
    '--pv-stripe': `color-mix(in srgb,${text} 4%,${bg})`,
  };
  const was = applied.get(p) || {};
  for (const [k, val] of Object.entries(next)) {
    if (was[k] !== val || !p.style.getPropertyValue(k)) p.style.setProperty(k, val);
  }
  applied.set(p, next);
}

export function watchPreview(getPrev) {
  const p = getPrev();
  if (!p) return;
  let raf = 0;
  new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => adaptPreview(p)); }).observe(p, { attributes: true, attributeFilter: ['data-pv-theme'] });
}
