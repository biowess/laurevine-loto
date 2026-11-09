// WCAG contrast for the key colour pairs of an export palette. Pure.
import { checkPairs, parseColor, ratio } from '../a11y/contrast.js';

// [label, foreground role, background role, large (3:1)]
export const PAIRS = [['Main text', 'text', 'background'], ['Secondary text', 'textSecondary', 'background'], ['Headings', 'heading', 'background', 1], ['Links', 'link', 'background'],
  ['Accent', 'accent', 'background'], ['Text on code', 'text', 'codeBackground'], ['Text on table headers', 'text', 'tableHeader'], ['Text on callouts', 'text', 'calloutBackground']];

// Rows in checkPairs shape ({ name, fg, bg, ratio, need, pass, mode }) plus { key, against }; also what the accessibility contrast check reads.
export const paletteContrast = (p) => checkPairs(PAIRS.map(([name, key, against, large]) => ({ name, key, against, fg: p[key], bg: p[against], large: !!large, mode: p.scheme })));

const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
function nudge(fg, bg, need) {
  const to = ratio([0, 0, 0], bg) >= ratio([255, 255, 255], bg) ? 0 : 255;
  for (let t = 0.01; t <= 1; t += 0.01) {
    const c = [0, 1, 2].map((i) => Math.round(fg[i] + (to - fg[i]) * t));
    if (ratio(c, bg) >= need + 0.02) return hex(c);
  }
  return hex([to, to, to]);
}

// Moves only the foreground colour of each failing pair toward black or white, by the smallest step that passes.
export function autoFix(p) {
  const out = { ...p };
  for (let pass = 0; pass < 3; pass++) {
    for (const r of paletteContrast(out)) if (r.pass === false) out[r.key] = nudge(parseColor(out[r.key]), parseColor(out[r.against]), r.need);
  }
  return out;
}
