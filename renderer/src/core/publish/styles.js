import { columnsCss } from './columns.js';
import { FONT_STACKS, PALETTES, pageMm } from '../../../../shared/export-config.js';

const palVars = (p, bg) => `--bg:${bg || p.background};--tx:${p.text};--hd:${p.heading};--ln:${p.link};--ac:${p.accent};--cb:${p.codeBackground};--bd:${p.border};--t2:${p.textSecondary};--th:${p.tableHeader};--tb:${p.tableBorder};--co:${p.calloutBackground};--dv:${p.divider};--dc:${p.decoration}`;

// Publication stylesheet from an ExportConfig: colours, typography, page box, columns. Static rules only.
export function publicationCss(c, env = {}) {
  const { typography: t, palette: p, columns: k, page: g } = c;
  const [w, h] = pageMm(g), m = g.margins, bg = g.background || p.background;
  const size = g.orientation === 'landscape' ? `${h}mm ${w}mm` : `${w}mm ${h}mm`;
  const hs = (n) => `${(t.headingScale ** n).toFixed(3)}em`;
  const prefersDark = !!(c.html?.prefersColorScheme || c.palette?.prefersColorScheme || p.scheme === 'auto' || env.prefersColorScheme);
  const schemeVal = prefersDark ? 'light dark' : (p.scheme === 'auto' ? 'light dark' : p.scheme);
  const altPal = p.scheme === 'dark' ? PALETTES.paper : PALETTES.ink;
  const colorSchemeMedia = prefersDark ? `@media (prefers-color-scheme: ${p.scheme === 'dark' ? 'light' : 'dark'}){:root{color-scheme:${p.scheme === 'dark' ? 'light' : 'dark'};${palVars(altPal)}}}\n` : '';
  return `:root{color-scheme:${schemeVal};${palVars(p, bg)}}
${colorSchemeMedia}@page{size:${size};margin:${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;background:${bg}}${g.facing ? `\n@page:left{margin:${m.top}mm ${m.left}mm ${m.bottom}mm ${m.right}mm}` : ''}\npre,.lv-mx,.katex{direction:ltr;unicode-bidi:isolate}
*{box-sizing:border-box}
html{font-size:${t.fontSize}px}
body{margin:0;background:var(--bg);color:var(--tx);font:1rem/${t.lineHeight} ${FONT_STACKS[t.bodyFont]};text-align:start;hyphens:manual;overflow-wrap:break-word;font-kerning:normal;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
/* Justification applies to running prose only; last lines (and lines before a forced break) stay start-aligned, and cells, headings, captions, covers and callouts never stretch. */
:where(p,li,dd){text-align:${t.align === 'justify' ? 'justify' : 'start'};text-align-last:start;text-justify:inter-word;hyphens:${t.hyphenate ? 'auto' : 'manual'};hyphenate-limit-chars:6 3 3;hyphenate-limit-lines:2}
:where(blockquote,table,figure,.lv-cover,.lv-sec-cover,.lt-titlepage,.lt-callout,.lt-props,.lv-toc,.lt-footnotes,.lt-code) :where(p,li,dd){text-align:inherit;text-align-last:auto}
:where(td,th,caption,figcaption,.lv-meta,.lv-toc-entry){text-align-last:auto;hyphens:manual}
.lv-doc{max-width:min(${g.maxWidth}ch, 100%);margin:0 auto;padding:2.5rem 1.25rem}
@media (max-width:768px){.lv-doc{padding:1.5rem 1rem}.lv-cover{min-height:auto;padding:2rem 0}.lv-columns,[data-sec-cols]{column-count:1 !important}}
@media (max-width:480px){html{font-size:max(14px,calc(${t.fontSize}px * .9))}.lv-doc{padding:1rem .75rem}.lv-title{font-size:${hs(2.5)}}h1{font-size:${hs(2)}}h2{font-size:${hs(1.5)}}}
${columnsCss(k, t)}
.lv-cover{min-height:60vh;display:flex;flex-direction:column;justify-content:center;text-align:center;break-after:page}
.lv-title{font:700 ${hs(4)}/1.15 ${FONT_STACKS[t.headingFont]};color:var(--hd);margin:0 0 .5em}
.lv-meta{margin:.2em 0;color:var(--ac)}
.lv-toc{break-after:page;margin-bottom:2em}
.lv-toc-title{font:700 ${hs(2)} ${FONT_STACKS[t.headingFont]};color:var(--hd);margin-bottom:.5em}
.lv-toc ol{list-style:none;margin:0;padding:0}
.lv-toc li{margin:.15em 0}
.lv-toc.lv-toc-noindent .l2,.lv-toc.lv-toc-noindent .l3,.lv-toc.lv-toc-noindent .l4,.lv-toc.lv-toc-noindent .l5,.lv-toc.lv-toc-noindent .l6{margin-left:0}
.lv-toc .l2{margin-left:1.2em}.lv-toc .l3{margin-left:2.4em}.lv-toc .l4,.lv-toc .l5,.lv-toc .l6{margin-left:3.6em}
.lv-toc-entry{display:flex;align-items:baseline;gap:.3em;text-decoration:none;color:inherit;width:100%}
.lv-toc-text{flex:0 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lv-toc-leader{flex:1 0 1em;overflow:hidden;align-self:flex-end;padding-bottom:.15em}
.lv-toc-lead-dots .lv-toc-leader::after{content:"................................................................................................................";letter-spacing:.05em;font-size:.85em;color:var(--t2)}
.lv-toc-lead-line .lv-toc-leader::after{content:"";display:block;border-bottom:1px solid var(--bd);margin-bottom:.3em}
.lv-toc-lead-none .lv-toc-leader{display:none}
.lv-toc-page::after{content:target-counter(attr(href),page)}
.lv-toc-page{flex:0 0 auto;font-variant-numeric:tabular-nums}
.lv-pb{break-before:page}
.lv-num{margin-right:.5em;color:var(--ac)}
h1,h2,h3,h4,h5,h6{font-family:${FONT_STACKS[t.headingFont]};color:var(--hd);line-height:1.25;margin:1.6em 0 .5em;break-after:avoid}
h1{font-size:${hs(3)}}h2{font-size:${hs(2)}}h3{font-size:${hs(1)}}h4,h5,h6{font-size:1em}
p,ul,ol,dl,table,blockquote,pre{margin:0 0 ${t.paragraphSpacing}em}
a{color:var(--ln)}
blockquote{margin-left:0;padding:.1em 1em;border-left:3px solid var(--dc)}
code,pre{font-family:${FONT_STACKS[t.codeFont]};font-size:${t.codeSize}em}
:not(pre)>code{background:var(--cb);padding:.1em .3em;border-radius:3px}
.lt-code{border:1px solid var(--bd);border-radius:6px;background:var(--cb);margin:0 0 ${t.paragraphSpacing}em;overflow:auto;break-inside:avoid;text-align:left}
.lt-code-head{padding:.25em .8em;border-bottom:1px solid var(--bd);color:var(--ac);font:600 .75em ${FONT_STACKS.sans}}
.lt-code pre{margin:0;padding:.7em .9em;white-space:pre-wrap}
.lt-copy{display:none}
.hljs-keyword,.hljs-selector-tag,.hljs-built_in,.hljs-meta{color:var(--ac);font-weight:600}.hljs-string,.hljs-regexp,.hljs-template-variable,.hljs-addition{color:var(--ln)}.hljs-number,.hljs-literal,.hljs-symbol,.hljs-bullet,.hljs-attr{color:var(--ac)}.hljs-title,.hljs-function,.hljs-type,.hljs-tag,.hljs-name,.hljs-section{color:var(--hd);font-weight:600}.hljs-comment,.hljs-quote{color:var(--t2);font-style:italic;opacity:.75}.hljs-deletion{text-decoration:line-through;color:var(--t2)}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}
.lv-heading-anchor{opacity:0;margin-left:.35em;text-decoration:none;color:var(--ac);font-weight:400;font-size:.8em;line-height:1;user-select:none;transition:opacity .15s}
:is(h1,h2,h3,h4,h5,h6):hover .lv-heading-anchor,.lv-heading-anchor:focus{opacity:.85}
.lv-heading-anchor:hover{opacity:1;color:var(--hd)}
html[dir=rtl] .lv-heading-anchor{margin-left:0;margin-right:.35em}
.lv-layout--with-sidebar{display:flex;max-width:min(calc(${g.maxWidth}ch + 320px), 100%);margin:0 auto;padding:0 1rem}
.lv-sidebar{width:260px;flex-shrink:0;padding:2.5rem 1.25rem 2.5rem 0;position:sticky;top:0;max-height:100vh;overflow-y:auto;border-right:1px solid var(--bd)}
html[dir=rtl] .lv-sidebar{padding:2.5rem 0 2.5rem 1.25rem;border-right:none;border-left:1px solid var(--bd)}
.lv-layout--with-sidebar .lv-doc{flex:1 1 auto;min-width:0;padding:2.5rem 1.5rem}
.lv-toc--sidebar{margin-bottom:0}
.lv-toc--sidebar .lv-toc-title{font-size:${hs(1.25)};margin-top:0}
.lv-toc--sidebar .lv-toc-entry{font-size:.9em}
@media (max-width:860px){
  .lv-layout--with-sidebar{display:block;padding:0}
  .lv-sidebar{width:100%;position:static;max-height:none;border-right:none;border-left:none;border-bottom:1px solid var(--bd);padding:1.5rem 1rem}
  .lv-layout--with-sidebar .lv-doc{padding:1.5rem 1rem}
}
.lv-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 ${t.paragraphSpacing}em;max-width:100%}
.lv-table-wrap table{margin:0;width:100%}
table{border-collapse:collapse;width:100%;max-width:100%}th,td{border:1px solid var(--tb);padding:.3em .6em}th{background:var(--th)}
img,video{max-width:100%;height:auto}audio{width:100%}
hr{border:0;border-top:1px solid var(--dv);margin:2em 0}
.lt-props{border:1px solid var(--bd);background:var(--cb);padding:.5em 1em;margin-bottom:1.5em;font-size:.85em}
.lt-props dt{font-weight:700}.lt-props dd{margin:0 0 .3em}
.lt-pagebreak{display:none}
.lt-callout{background:var(--co);border-left:3px solid var(--dc);padding:.4em 1em;margin:0 0 1em;break-inside:avoid}.lt-callout-title{font-weight:700}
figcaption,caption{color:var(--t2)}
.lt-mermaid{margin:0 0 1em;text-align:center;break-inside:avoid}.lt-mm-scroll{overflow:auto}.lt-mm-scroll svg{max-width:100%;height:auto}
.lt-mm-err,.lv-math-error,.lt-missing{color:var(--ac);border:1px dashed var(--ac);padding:.1em .4em}
.lv-math--block{margin:0 0 1em;overflow:auto;text-align:center}
.lt-footnotes{font-size:.9em;color:var(--t2);border-top:1px solid var(--dv);margin-top:2em}
@media print{
  :root{color-scheme:light;--bg:#ffffff;--tx:#111111;--hd:#000000;--bd:#cccccc;--cb:#f4f4f5}
  body{background:#fff !important;color:#000 !important}
  .lv-doc{max-width:none !important;padding:0 !important;margin:0 !important}
  .lv-layout--with-sidebar{display:block !important;max-width:none !important;padding:0 !important}
  .lv-sidebar,.lv-heading-anchor{display:none !important}
  .lv-cover{min-height:auto;break-after:page;page-break-after:always}
  .lv-pb{break-before:page;page-break-before:always}
  .lv-pa{break-after:page;page-break-after:always}
  .lv-table-wrap{overflow:visible !important;margin:0 0 1em}
  table{page-break-inside:auto}
  tr{break-inside:avoid;page-break-inside:avoid}
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
  h1,h2,h3,h4,h5,h6{break-after:avoid;page-break-after:avoid}
  pre,blockquote,figure,.lt-callout{break-inside:avoid;page-break-inside:avoid}
  a{color:inherit;text-decoration:underline}
  .lt-copy,.lv-toast{display:none !important}
}`;
}
// TOC per-level typography overrides: only non-default values are emitted.
export function tocLevelCss(levels, fontStacks) {
  if (!levels) return '';
  const out = [];
  for (let i = 1; i <= 6; i++) {
    const r = levels[`l${i}`]; if (!r) continue;
    const sel = `.lv-toc .l${i} .lv-toc-entry`, d = [];
    if (r.font && fontStacks && fontStacks[r.font]) d.push(`font-family:${fontStacks[r.font]}`);
    if (r.size) d.push(`font-size:${r.size}em`);
    if (r.weight) d.push(`font-weight:${r.weight}`);
    if (r.italic && r.italic !== 'auto') d.push(`font-style:${r.italic}`);
    if (d.length) out.push(`${sel}{${d.join(';')}}`);
  }
  return out.join('\n');
}

