import { SANS, SERIF, MONO, palette, typo, page, flow, tables, code, callout, toc, props } from './kit.js';

const cols = { count: 1, gap: 2, rule: false };
const heads = (h, extra = '') => `.lv-cover,.lv-meta{text-align:start}.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${h};text-align:start;hyphens:manual;${extra}}`;
const ORN = '*\\00a0\\00a0\\00a0*\\00a0\\00a0\\00a0*';

// Naskh: Arabic and bilingual documents. Amiri text, Cairo headings, generous leading, logical properties, no letter-spacing (it breaks Arabic joining).
const NK_H = SANS('Cairo'), NK_B = `'Amiri','Scheherazade New',Georgia,serif`;
const naskh = {
  id: 'naskh',
  name: 'Naskh',
  description: 'Arabic and bilingual pages: Amiri Naskh text, Cairo headings, generous leading and direction-aware rules that mirror in right-to-left documents.',
  use: ['Amiri', 'Cairo', 'Scheherazade New', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'serif', headingFont: 'sans', fontSize: 19, lineHeight: 1.9, headingScale: 1.25, paragraphSpacing: 0.7, codeSize: 0.78 }),
    palette: palette({ background: '#fcfaf5', text: '#231f1a', heading: '#12433f', link: '#0f5f5a', accent: '#176b5b', codeBackground: '#f3efe3', border: '#ddd3bd', textSecondary: '#5b5348', tableHeader: '#ece5d2', tableBorder: '#d6ccb4', calloutBackground: '#eef4ee', divider: '#d6ccb4', decoration: '#b08a3e' }),
    columns: cols,
    page: page('A4', [24, 22, 24, 22], 62),
  },
  css: () => `body,.lv-doc{font-family:${NK_B};letter-spacing:0;font-feature-settings:"kern","liga","calt"}
${heads(NK_H, 'letter-spacing:0;font-weight:700;line-height:1.5')}
:lang(ar) ol{list-style-type:arabic-indic}
.lv-title{font-size:2.5em;font-weight:800;line-height:1.35}
.lv-title::after{content:"";display:block;width:3em;border-top:3px solid var(--dc);margin-top:.4em}
.lv-meta{font:600 .8em ${NK_H};color:var(--t2);letter-spacing:0}
h1{font-size:1.9em;margin:1.8em 0 .5em;padding-bottom:.25em;border-bottom:1px solid var(--bd)}
h2{font-size:1.5em;margin:1.6em 0 .4em}
h3{font-size:1.2em;font-weight:600;color:var(--ac);margin:1.5em 0 .35em}
h4,h5,h6{font-size:1em;margin:1.3em 0 .3em}h6{color:var(--t2)}
blockquote{margin:1.4em 0;padding:.2em 1.2em;border:0;border-inline-start:3px solid var(--dc);font-size:1.06em;color:var(--hd)}
blockquote p{margin:0 0 .4em}blockquote cite,blockquote footer{display:block;font:600 .72em ${NK_H};font-style:normal;color:var(--t2)}
hr{border:0;height:1px;background:linear-gradient(90deg,transparent,var(--dc),transparent);margin:2em 0}
${flow}
${tables('rules', NK_H)}
th{font-size:.9em}
${code(MONO('Source Code Pro'), 'bar', NK_H)}
${callout('bar', NK_H)}
.lt-callout-title{letter-spacing:0;text-transform:none;font-size:.9em}
${toc(NK_H)}
${props}`,
};

// Legal: Times-metric TeX Gyre Termes, justified clauses without hyphenation, numbered 1 / 1.1 / (a) from CSS counters.
const LG_B = SERIF('TeX Gyre Termes');
const legal = {
  id: 'legal',
  name: 'Legal',
  description: 'Contract and policy layout: TeX Gyre Termes, justified clauses, automatic 1 / 1.1 / (a) numbering, ruled tables and signature lines.',
  use: ['TeX Gyre Termes', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'serif', headingFont: 'serif', fontSize: 16, lineHeight: 1.5, headingScale: 1.12, paragraphSpacing: 0.7, codeSize: 0.78, align: 'justify', hyphenate: false }),
    palette: palette({ background: '#ffffff', text: '#000000', heading: '#000000', link: '#1a3c7a', accent: '#333333', codeBackground: '#f3f3f3', border: '#888888', textSecondary: '#3d3d3d', tableHeader: '#e8e8e8', tableBorder: '#666666', calloutBackground: '#f5f5f5', divider: '#999999', decoration: '#333333' }),
    columns: cols,
    page: page('A4', [25, 25, 25, 25], 78),
  },
  css: () => `body,.lv-doc{font-family:${LG_B};font-feature-settings:"kern","liga";font-variant-numeric:lining-nums;counter-reset:cl sub par}
${heads(LG_B, 'font-weight:700;line-height:1.3')}
.lv-cover,.lv-meta{text-align:center}
.lv-title{font-size:1.5em;text-align:center;text-transform:uppercase;letter-spacing:.08em;padding-bottom:.5em;border-bottom:3px double var(--hd)}
.lv-meta{font-size:.95em;color:var(--tx)}
.lv-num{display:none}
h1{counter-increment:cl;counter-reset:sub par;font-size:1.05em;text-transform:uppercase;letter-spacing:.05em;margin:1.8em 0 .6em}
h1::before{content:counter(cl) ".";display:inline-block;min-width:2.2em}
h2{counter-increment:sub;counter-reset:par;font-size:1em;margin:1.3em 0 .4em}
h2::before{content:counter(cl) "." counter(sub);display:inline-block;min-width:2.6em}
h3{counter-increment:par;font-size:1em;font-style:italic;margin:1.1em 0 .3em}
h3::before{content:"(" counter(par,lower-alpha) ")";display:inline-block;min-width:2.2em;font-style:normal}
h4,h5,h6{font-size:1em;font-weight:700;font-style:italic;margin:1em 0 .3em}
ol{list-style:decimal}ol ol{list-style:lower-alpha}ol ol ol{list-style:lower-roman}
blockquote{margin:1em 2.5em;padding:0;border:0;font-size:.95em;line-height:1.4;text-align:justify}
blockquote p{margin:0 0 .5em}blockquote cite,blockquote footer{display:block;font-style:normal;font-size:.9em;text-align:end}
hr{border:0;border-top:1px solid var(--tx);width:45%;margin:3em 0 .3em}
${flow}
${tables('grid', LG_B)}
th{font-size:.9em}
${code(MONO('Source Code Pro'), 'box', LG_B)}
.lt-code{border-radius:0}
${callout('box', LG_B)}
.lt-callout{border-radius:0}
${toc(LG_B)}
${props}`,
};

// Novel: Cormorant Garamond text, Cinzel chapter openings with drop cap and small-caps first line, facing pages on A5.
const NV_H = SERIF('Cinzel'), NV_B = SERIF('Cormorant Garamond');
const novel = {
  id: 'novel',
  name: 'Novel',
  description: 'Book interior for fiction: Cormorant Garamond text, Cinzel chapter heads with drop caps, indented paragraphs and facing A5 pages.',
  use: ['Cormorant Garamond', 'Cinzel', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'serif', headingFont: 'serif', fontSize: 18, lineHeight: 1.5, headingScale: 1.2, paragraphSpacing: 0, codeSize: 0.78, align: 'justify', hyphenate: true }),
    palette: palette({ background: '#fffdf7', text: '#231f1b', heading: '#231f1b', link: '#6b2d2d', accent: '#7a5a2c', codeBackground: '#f4efe3', border: '#d8cdb4', textSecondary: '#5e554a', tableHeader: '#efe8d6', tableBorder: '#d8cdb4', calloutBackground: '#f6f0e1', divider: '#b59a68', decoration: '#8a6a3a' }),
    columns: cols,
    page: page('A5', [20, 16, 24, 22], 60, { facing: true }),
  },
  css: () => `body,.lv-doc{font-family:${NV_B};font-feature-settings:"kern","liga","calt"}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${NV_H};font-weight:400;text-align:center;hyphens:manual;letter-spacing:.14em}
.lv-title{font-size:2.4em;line-height:1.25}
.lv-title::after{content:"${ORN}";display:block;font:400 .5em ${NV_B};letter-spacing:.2em;margin-top:1em;color:var(--dc)}
.lv-meta{font-style:italic;letter-spacing:.04em;text-align:center;color:var(--t2)}
h1{font-size:1.35em;letter-spacing:.16em;line-height:1.4;margin:4em 0 2.2em;break-before:page}
h1::after{content:"";display:block;width:2.5em;border-top:1px solid var(--dc);margin:.9em auto 0}
h2{font-size:1.05em;letter-spacing:.2em;margin:2.4em 0 1.2em}
h3,h4,h5,h6{font-family:${NV_B};font-style:italic;font-weight:600;letter-spacing:0;font-size:1.25em;margin:1.8em 0 .8em}
h4,h5,h6{font-size:1.1em}
p{margin:0;text-indent:1.25em}
h1+p,h2+p,h3+p,h4+p,hr+p,blockquote+p,figure+p,table+p,.lt-code+p,.lt-callout+p{text-indent:0}
h1+p::first-letter{float:left;font:500 3.6em/.78 ${NV_H};padding:.06em .1em 0 0;color:var(--dc)}
h1+p::first-line{font-variant:small-caps;letter-spacing:.06em}
hr{border:0;margin:1.6em 0;text-align:center;height:auto}hr::before{content:"${ORN}";color:var(--dc);letter-spacing:.2em}
blockquote{margin:1.2em 1.5em;padding:0;border:0;font-style:italic;font-size:.98em;text-align:justify}
blockquote p{text-indent:0;margin:0 0 .4em}blockquote cite,blockquote footer{display:block;font-style:normal;font-size:.85em;letter-spacing:.08em;text-align:end}
${flow}
p{orphans:2;widows:2}
${tables('rules', NV_B)}
th{font-variant:small-caps;letter-spacing:.05em}
${code(MONO('Source Code Pro'), 'bar', NV_B)}
${callout('rule', NV_B)}
.lt-callout-title{font-family:${NV_H};letter-spacing:.14em}
${toc(NV_B, '0')}
.lv-toc-title{text-align:center}
${props}`,
};

// Swiss: International style. Space Grotesk heads, Inter text, ragged right, red square markers and heavy rules.
const SW_H = SANS('Space Grotesk'), SW_B = SANS('Inter');
const swiss = {
  id: 'swiss',
  name: 'Swiss',
  description: 'International style: Space Grotesk headlines, Inter text, ragged-right setting, a wide left margin and red square markers.',
  use: ['Space Grotesk', 'Inter', 'JetBrains Mono'],
  defaults: {
    typography: typo({ bodyFont: 'sans', headingFont: 'sans', fontSize: 14.5, lineHeight: 1.6, headingScale: 1.3, paragraphSpacing: 0.9 }),
    palette: palette({ background: '#ffffff', text: '#1a1a1a', heading: '#000000', link: '#c40000', accent: '#c40000', codeBackground: '#f3f3f3', border: '#d4d4d4', textSecondary: '#595959', tableHeader: '#f3f3f3', tableBorder: '#cfcfcf', calloutBackground: '#f6f6f6', divider: '#1a1a1a', decoration: '#e10600' }),
    columns: cols,
    page: page('A4', [22, 18, 22, 30], 80),
  },
  css: () => `body,.lv-doc{font-family:${SW_B};font-feature-settings:"kern","calt"}
${heads(SW_H, 'font-weight:700;letter-spacing:-.02em;line-height:1.12')}
.lv-title{font-size:3.6em;letter-spacing:-.035em;line-height:.98}
.lv-meta{font:500 .76em ${SW_B};text-transform:uppercase;letter-spacing:.12em;color:var(--t2)}
h1{font-size:2.3em;margin:2em 0 .5em}
h1::before{content:"";display:inline-block;width:.42em;height:.42em;background:var(--dc);margin-inline-end:.4em;vertical-align:.06em}
h2{font-size:1.4em;margin:1.9em 0 .5em;padding-top:.45em;border-top:2px solid var(--hd)}
h3{font-size:1.1em;margin:1.5em 0 .35em}
h4,h5,h6{font:600 .78em ${SW_B};text-transform:uppercase;letter-spacing:.12em;color:var(--t2);margin:1.4em 0 .3em}
blockquote{margin:1.6em 0;padding:0;border:0;font:500 1.3em/1.3 ${SW_H};letter-spacing:-.01em;color:var(--hd)}
blockquote::before{content:"";display:block;width:2.2em;border-top:4px solid var(--dc);margin-bottom:.6em}
blockquote p{margin:0 0 .4em}blockquote cite,blockquote footer{display:block;font:500 .6em ${SW_B};font-style:normal;text-transform:uppercase;letter-spacing:.12em;color:var(--t2)}
hr{border:0;border-top:1px solid var(--hd);margin:2em 0}
${flow}
${tables('plain', SW_H)}
th{font-size:.8em;text-transform:uppercase;letter-spacing:.08em}
${code(MONO('JetBrains Mono'), 'bar', SW_B)}
${callout('rule', SW_H)}
${toc(SW_H, '1px solid var(--bd)')}
${props}`,
};

// Accessible: OpenDyslexic, cream ground, high contrast, generous spacing, no italics, no justification, underlined links.
const AC_B = `'OpenDyslexic','Atkinson Hyperlegible',Verdana,sans-serif`;
const accessible = {
  id: 'accessible',
  name: 'Accessible',
  description: 'Reading-friendly layout: OpenDyslexic, cream background, high contrast, wide spacing, no italics or justification and underlined links.',
  use: ['OpenDyslexic', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'sans', headingFont: 'sans', fontSize: 17, lineHeight: 1.85, headingScale: 1.25, paragraphSpacing: 1.1, codeSize: 0.8, letterSpacing: 0.015 }),
    palette: palette({ background: '#faf6e6', text: '#1a1a1a', heading: '#0b2a4a', link: '#0b3d91', accent: '#7a3e00', codeBackground: '#efe9d0', border: '#a99e78', textSecondary: '#3a3a3a', tableHeader: '#e6dfc0', tableBorder: '#8f855f', calloutBackground: '#f0e9c8', divider: '#8f855f', decoration: '#7a3e00' }),
    columns: cols,
    page: page('A4', [25, 25, 25, 25], 56),
  },
  css: () => `body,.lv-doc{font-family:${AC_B};word-spacing:.14em}
em,i,cite{font-style:normal;font-weight:700}
${heads(AC_B, 'font-weight:700;line-height:1.35')}
.lv-title{font-size:2.3em;line-height:1.3;padding-bottom:.3em;border-bottom:4px solid var(--hd)}
.lv-meta{font-size:.9em;color:var(--t2)}
h1{font-size:1.7em;margin:2em 0 .6em;padding-bottom:.25em;border-bottom:3px solid var(--dc)}
h2{font-size:1.4em;margin:1.8em 0 .5em}
h3{font-size:1.2em;margin:1.6em 0 .4em}
h4,h5,h6{font-size:1.05em;margin:1.4em 0 .3em}
li{margin:.45em 0}li::marker{font-weight:700}
a{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:.2em}
blockquote{margin:1.4em 0;padding:.4em 1.2em;border:0;border-inline-start:6px solid var(--dc);background:var(--co)}
blockquote p{margin:0 0 .6em}blockquote cite,blockquote footer{display:block;font-size:.85em;font-weight:700}
hr{border:0;border-top:3px solid var(--dv);margin:2.2em 0}
${flow}
${tables('grid', AC_B)}
table{font-size:.9em}th,td{border-width:2px;padding:.6em .8em}
${code(MONO('Source Code Pro'), 'box', AC_B)}
.lt-code{border-width:2px}
${callout('box', AC_B)}
.lt-callout{border-width:2px}
${toc(AC_B, '1px solid var(--bd)')}
${props}`,
};

export const literaryPack = [naskh, legal, novel, swiss, accessible];
