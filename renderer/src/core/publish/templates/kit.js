// Shared building blocks for the pack templates: font stacks, palette/typography helpers and CSS fragments that keep tables, code, callouts, lists and TOC consistent. Pure strings, no state.
export const SERIF = (n) => `'${n}',Georgia,'Times New Roman',serif`;
export const SANS = (n) => `'${n}',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;
export const MONO = (n) => `'${n}',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

// Complete 13-role light palette so tables, callouts and rules never fall back to unrelated defaults.
export const palette = (o) => ({ preset: 'custom', scheme: 'light', ...o });
export const typo = (o) => ({ headingScale: 1.25, paragraphSpacing: 0.8, codeSize: 0.86, align: 'left', hyphenate: false, ...o });
export const page = (size, m, maxWidth, extra = {}) => ({ size, orientation: 'portrait', margins: { top: m[0], right: m[1], bottom: m[2], left: m[3] }, maxWidth, ...extra });

// Flow: widows/orphans, keep-together blocks, figures, lists. Uses logical properties so RTL documents mirror correctly.
export const flow = `p{orphans:3;widows:3}
h1,h2,h3,h4,h5,h6{break-after:avoid;break-inside:avoid;text-wrap:balance}
figure,.lt-callout,.lt-code,blockquote,tr,img{break-inside:avoid}
figure{margin:1.4em 0;text-align:center}figure img,img{display:block;margin:1.2em auto}figure img{margin:0 auto}
ul,ol{padding-inline-start:1.55em;margin-block:0 var(--lv-para,.8em)}li{margin:.22em 0}li::marker{color:var(--ac)}li>ul,li>ol{margin-block:.22em 0}
dt{font-weight:600}dd{margin:0 0 .5em;margin-inline-start:1.2em}
a{text-underline-offset:.15em;text-decoration-thickness:1px}
.lt-footnotes{font-size:.86em;color:var(--t2);border-top:1px solid var(--dv);padding-top:.6em}.lt-footnotes p{margin:0 0 .3em}
sup,sub{line-height:0}`;

// Tables: 'rules' (booktabs), 'grid', 'band' (filled header, zebra), 'plain'. Cells stay start-aligned and never hyphenate.
export const tables = (kind, head = 'inherit') => {
  const base = `table{width:100%;border-collapse:collapse;margin:1.3em 0;font-size:.92em;line-height:1.4;font-variant-numeric:tabular-nums lining-nums;table-layout:auto}
th,td{padding:.45em .7em;vertical-align:top;text-align:start;overflow-wrap:break-word}th{font-family:${head};font-weight:700}
thead{display:table-header-group}caption,figcaption,.lt-caption{caption-side:bottom;font-size:.86em;color:var(--t2);text-align:start;padding:.5em 0 0}`;
  const k = {
    rules: `table{border-top:1.5px solid var(--hd);border-bottom:1.5px solid var(--hd)}th,td{border:0;border-bottom:1px solid var(--tb)}th{background:transparent;border-bottom:1px solid var(--hd)}tbody tr:last-child td{border-bottom:0}`,
    grid: `table{border:1px solid var(--tb)}th,td{border:1px solid var(--tb)}th{background:var(--th);color:var(--hd)}`,
    band: `table{border-bottom:2px solid var(--th)}th,td{border:0}th{background:var(--th);color:var(--bg)}tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--co) 70%,transparent)}tbody td{border-bottom:1px solid var(--tb)}`,
    plain: `table{border-top:2px solid var(--hd)}th,td{border:0;border-bottom:1px solid var(--tb)}th{background:transparent;color:var(--hd);border-bottom:1px solid var(--hd)}`,
  };
  return `${base}\n${k[kind]}`;
};

// Code: inline chip plus block with optional header; 'bar' = accent edge, 'box' = framed.
export const code = (mono, kind = 'box', head = 'inherit') => `code,pre,kbd,samp{font-family:${mono};font-variant-ligatures:none;hyphens:none;text-align:start;direction:ltr;unicode-bidi:isolate}
:not(pre)>code{background:var(--cb);border:1px solid var(--bd);padding:.04em .32em;border-radius:3px;font-size:.88em;overflow-wrap:anywhere}
.lt-code{margin:1.3em 0;background:var(--cb);${kind === 'bar' ? 'border:0;border-inline-start:3px solid var(--ac);border-radius:0' : 'border:1px solid var(--bd);border-radius:5px'}}
.lt-code-head{font:600 .72em ${head};letter-spacing:.06em;text-transform:uppercase;color:var(--t2);padding:.45em 1em .1em;border:0}
.lt-code pre{margin:0;padding:.6em 1em .8em;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:${kind === 'tight' ? '.8' : '.88'}em}`;

// Callouts: 'bar' (tinted with start edge), 'box' (framed), 'rule' (top rule only).
export const callout = (kind, head = 'inherit') => {
  const k = { bar: 'border:0;border-inline-start:4px solid var(--dc);background:var(--co);padding:.75em 1.1em', box: 'border:1px solid var(--dc);background:var(--co);padding:.75em 1.1em;border-radius:4px', rule: 'border:0;border-top:3px solid var(--dc);background:transparent;padding:.6em 0 0' }[kind];
  return `.lt-callout{${k};margin:1.3em 0}.lt-callout-title{font:700 .78em ${head};text-transform:uppercase;letter-spacing:.1em;color:var(--hd);margin-bottom:.25em}.lt-callout p{margin:0 0 .4em}.lt-callout p:last-child{margin:0}`;
};

// Table of contents: leaders and levels read from the base rules; this only sets type.
export const toc = (head, rule = '1px dotted var(--bd)') => `.lv-toc-title{font-family:${head}}.lv-toc li{padding:.12em 0;border-bottom:${rule}}.lv-toc .l1{font-weight:600;margin-top:.5em}.lv-toc .l2{color:var(--tx)}.lv-toc .l3,.lv-toc .l4{color:var(--t2);font-size:.94em}`;

export const props = `.lt-props{border:0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);background:transparent;padding:.6em 0;font-size:.88em}.lt-props dt{color:var(--t2);font-weight:600}`;
