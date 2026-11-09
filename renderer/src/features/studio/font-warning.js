import { fontStack } from '../../core/publish/font-catalog.js';
import { fontCoverage, missingChars } from '../../core/publish/font-coverage.js';

const SEL = { body: 'body', heading: 'h1,h2,h3,h4,h5,h6', title: '.lv-title', caption: 'caption,figcaption,.lt-caption', table: 'table', code: 'code,pre' };
let ctx;

// Installed fonts: a glyph is present when the width does not depend on the fallback font; null when the font is not installed.
function canvasCoverage(name) {
  ctx = ctx || document.createElement('canvas').getContext('2d');
  const w = (fb, ch) => { ctx.font = `32px '${name}',${fb}`; return ctx.measureText(ch).width; };
  const has = (cp) => { const ch = String.fromCodePoint(cp); return w('serif', ch) === w('sans-serif', ch); };
  return has(97) ? has : null;
}

// Warnings for roles whose chosen font lacks characters used in the publication HTML.
export function fontWarnings(cfg, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html'), out = [];
  for (const [role, r] of Object.entries(cfg.typography.roles)) {
    const has = r.font && (fontCoverage(r.font) || (fontStack(r.font).startsWith("'") ? canvasCoverage(r.font) : null));
    if (!has) continue;
    const m = missingChars([...doc.querySelectorAll(SEL[role])].map((n) => n.textContent).join(' '), has);
    if (m.length) out.push(`${role} font ${r.font} lacks ${m.length} character${m.length === 1 ? '' : 's'}: ${m.slice(0, 8).join(' ')}`);
  }
  return out;
}
