// Column layout CSS from ExportConfig.columns. Selectors use .lv-body prefix to outrank base rules.
export function columnsCss(k, t = {}) {
  const B = '.lv-body', av = (on) => (on ? 'avoid' : 'auto');
  const span = { none: '', h1: `${B} h1{column-span:all}`, h1h2: `${B} h1,${B} h2{column-span:all}` }[k.headingSpan];
  const img = { inline: '', span: `${B} figure,${B} p:has(>img:only-child){column-span:all}`, float: `${B} img{float:right;width:48%;margin:0 0 .5em .8em}` }[k.images];
  const tbl = { fit: `${B} table{width:100%;table-layout:fixed;word-break:break-word}`, span: `${B} table{column-span:all;width:100%}`, scale: `${B} table{width:100%;table-layout:fixed;font-size:.82em}` }[k.tables];
  const code = av(k.keepCode && !k.codeBreak);
  return [
    `.lv-body{column-count:${k.count};column-gap:${k.gap}em;column-fill:auto;--lv-bal:${k.balance && k.count > 1 ? 1 : 0};${k.rule && k.count > 1 ? `column-rule:${k.ruleWidth}px ${k.ruleStyle} ${k.ruleColor || 'var(--bd)'};` : ''}}`,
    k.count > 1 ? `.pagedjs_page_content .lv-body{height:100%}` : '',
    `${B} p,${B} li{orphans:${k.orphans};widows:${k.widows}${k.flow === 'keep' ? ';break-inside:avoid' : ''}}`,
    span, img, tbl,
    `${B} figure,${B} img{break-inside:${av(k.keepFigures)}}${B} table{break-inside:${av(k.keepTables)}}${B} .lt-callout{break-inside:${av(k.keepCallouts)}}${B} .lt-code{break-inside:${code}}`,
    `${B} h1,${B} h2,${B} h3,${B} h4,${B} h5,${B} h6{break-after:avoid}${B} .lv-span{column-span:all;width:100%;box-sizing:border-box}${B} .lt-span{display:none}`,
    k.count > 1 ? `${B} pre{white-space:pre-wrap;overflow-wrap:anywhere}${B} table{max-width:100%;overflow-wrap:anywhere}${B} img,${B} svg{max-width:100%;height:auto}` : '',
    ...(k.count > 1 ? [
      // Pro multi-column finish: aligned column tops, generated-section headings span all columns, narrow-measure typography.
      `${B}>.lv-section:first-child>:first-child,${B}>.lv-section:first-child>.lv-sec:first-child>:first-child{margin-top:0}`,
      `${B} .lt-bibliography>:is(h1,h2,.lt-bibliography-title),${B} .lt-footnotes>:is(h1,h2),${B} .lv-endnotes>h1{column-span:all;width:100%}`,
      `${B} figure{margin:.8em 0}${B} p>img:only-child,${B} figure>img{display:block;margin-inline:auto}${B} figcaption,${B} .lv-cap{text-align:center}`,
      `${B} ul,${B} ol{padding-inline-start:1.3em}${B} blockquote{margin-inline:.6em 0;break-inside:avoid}${B} dt,${B} tr,${B} .lt-callout{break-inside:avoid}`,
      `${B} p,${B} li,${B} dd{overflow-wrap:break-word;${t.align === 'justify' ? 'hyphens:auto;' : ''}}${B} h1,${B} h2,${B} h3,${B} h4,${B} h5,${B} h6{hyphens:manual;text-wrap:balance;text-align:start}`,
    ] : []),
    `${B} .lt-code pre{box-decoration-break:clone}${B} .lt-code[data-split-from] pre::before,${B} pre[data-split-from]::before{content:'\\21AA  continued';display:block;font:.75em sans-serif;opacity:.6;margin-bottom:.3em}`,
  ].filter(Boolean).join('\n');
}
