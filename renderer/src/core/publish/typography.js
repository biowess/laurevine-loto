import { BUNDLED, fontStack } from './font-catalog.js';
import { fontFaceCss } from './templates/index.js';

const HS = 'html h1,html h2,html h3,html h4,html h5,html h6';
const SEL = {
  body: 'html body,html .lv-doc',
  heading: `${HS},html .lv-toc-title`,
  title: 'html .lv-title',
  caption: 'html caption,html figcaption,html .lt-caption',
  table: 'html table',
  code: 'html code,html pre',
};

// Typography overrides appended after the template CSS: only values that differ from "template default" are emitted.
export function typographyCss(c, env = {}) {
  const t = c.typography, g = c.page, out = [], used = new Set(), vars = [`--lv-line:${t.lineHeight}`, `--lv-para:${t.paragraphSpacing}em`, `--lv-max:${g.maxWidth}ch`, `--lv-letter:${t.letterSpacing}em`];
  for (const [role, r] of Object.entries(t.roles)) {
    const d = [], stack = fontStack(r.font);
    if (stack) { d.push(`font-family:${stack}`); vars.push(`--lv-font-${role}:${stack}`); used.add(r.font); }
    if (r.size) d.push(`font-size:${r.size}em`);
    if (r.weight) d.push(`font-weight:${r.weight}`);
    if (r.italic !== 'auto') d.push(`font-style:${r.italic}`);
    if (d.length) out.push(`${SEL[role]}{${d.join(';')}}`);
  }
  if (t.letterSpacing) out.push(`html body{letter-spacing:${t.letterSpacing}em}`);
  if (t.headingBefore) out.push(`${HS}{margin-top:${t.headingBefore}em}`);
  if (t.headingAfter) out.push(`${HS}{margin-bottom:${t.headingAfter}em}`);
  const faces = fontFaceCss({ fonts: [...used].flatMap((n) => (BUNDLED[n] || []).map(([file, style, weight]) => ({ family: n, file, style, weight }))) }, env.fontData);
  return `${faces}\n:root{${vars.join(';')}}\n${out.join('\n')}`;
}
