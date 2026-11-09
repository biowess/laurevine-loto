import { FONT_STACKS } from '../../../../shared/export-config.js';

const ZONES = ['left', 'centre', 'right'];
const NONE = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((b) => `@${b}{content:none}`).join('');
const STYLE = { arabic: 'decimal', roman: 'lower-roman', alphabetic: 'lower-alpha', 'roman-arabic': 'lower-roman' };
const FLIP = { left: 'right', right: 'left', centre: 'centre' };
const TOKEN = /\{(title|author|date|page|pages|section|chapter)\}/g;
const q = (s) => `"${String(s).replace(/[\\\"]/g, '\\$&').replace(/\s*[\r\n]+\s*/g, ' ').replace(/</g, '\\3c ')}"`;

// Paged.js margin boxes from ExportConfig.headerFooter + numbering. {chapter}/{section} = running H1/H2 via string-set.
// meta = { title, author, date }. Returns '' when nothing is shown.
export function headerFooterCss(c, meta) {
  const f = c.headerFooter, n = c.numbering, t = c.typography, p = c.palette;
  if (!f.header.on && !f.footer.on && !n.on) return '';
  const [nr, nz] = n.position.split('-');
  const isRomanArabic = n.style === 'roman-arabic';
  // roman-arabic: front matter uses lower-roman; body uses decimal (reset to 1)
  const bodyStyle = isRomanArabic ? 'decimal' : (STYLE[n.style] || 'decimal');
  const tok = { title: q(meta.title), author: q(meta.author), date: q(meta.date), page: `counter(page,${bodyStyle})`, pages: 'counter(pages)', section: 'string(lvh2)', chapter: 'string(lvh1)' };
  const num = n.ofTotal ? [q('Page '), tok.page, q(' of '), tok.pages] : [tok.page];
  const font = { body: FONT_STACKS[t.bodyFont], heading: FONT_STACKS[t.headingFont], sans: FONT_STACKS.sans, mono: FONT_STACKS.mono }[f.font];
  const val = (s) => {
    const o = []; let i = 0;
    for (const m of s.matchAll(TOKEN)) { if (m.index > i) o.push(q(s.slice(i, m.index))); o.push(tok[m[1]]); i = m.index + m[0].length; }
    if (i < s.length) o.push(q(s.slice(i)));
    return o;
  };
  const region = (r, zs, flip) => {
    const on = f[r].on, here = n.on && nr === r;
    if (!on && !here) return '';
    const top = r === 'header', ruled = on && (f.rule === 'both' || f.rule === r);
    const style = `font-family:${font};font-size:${f.size}pt;font-style:${f.italic ? 'italic' : 'normal'};color:${f.color || p.textSecondary};${f.offset ? `transform:translateY(${top ? -f.offset : f.offset}mm);` : ''}${ruled ? `width:33.333%;border-${top ? 'bottom' : 'top'}:.5pt solid ${p.divider};` : ''}`;
    return ZONES.map((z) => {
      const o = on ? val(zs[z]) : [];
      if (here && (flip ? FLIP[nz] : nz) === z) o.push(...(o.length ? [q(' ')] : []), ...num);
      if (!o.length && ruled) o.push(q('\u00a0'));
      return o.length ? `@${top ? 'top' : 'bottom'}-${z === 'centre' ? 'center' : z}{content:${o.join(' ')};${style}}` : '';
    }).join('');
  };
  const pg = (sel, hd, ft, flip) => `@page${sel}{${region('header', hd, flip)}${region('footer', ft, flip)}}`;
  const cover = c.structure.cover && n.hideOnCover, start = cover ? n.start - 1 : n.start;
  const first = (n.on && start !== 1 ? `counter-reset:page ${start};` : '') + (f.firstDifferent ? NONE : '');
  // roman-arabic: front matter pages (cover, toc) are named "lvfront" with lower-roman counter; lv-body resets to arabic 1
  const romanArabicCss = isRomanArabic && n.on ? `.lv-cover,.lv-toc{page:lvfront}.lv-body{page:lvbody}@page lvfront{${region('header', f.header, false).replace(bodyStyle,'lower-roman').replace(/counter\(pages\)/g,'counter(pages,lower-roman)')}}@page lvbody{counter-reset:page 1}` : '';
  return `h1{string-set:lvh1 content(text)}h2{string-set:lvh2 content(text)}\n${f.oddEven ? pg(':right', f.header, f.footer, false) + pg(':left', f.headerEven, f.footerEven, true) : pg('', f.header, f.footer, false)}${first ? `@page:first{${first}}` : ''}${cover && !isRomanArabic ? `.lv-cover{page:lvcover}@page lvcover{${NONE}}` : ''}${romanArabicCss}`;
}
