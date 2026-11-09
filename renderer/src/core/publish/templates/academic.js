const SERIF = `'TeX Gyre Pagella','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif`;

export const academic = {
  id: 'academic',
  name: 'Academic',
  description: 'Journal-style serif article: numbered-feel headings, indented paragraphs, ruled tables and hanging captions.',
  use: ['TeX Gyre Pagella'],
  defaults: {
    typography: { bodyFont: 'classic', headingFont: 'classic', fontSize: 16, lineHeight: 1.5, headingScale: 1.2, paragraphSpacing: 0, codeSize: 0.85, align: 'justify', hyphenate: true },
    palette: { preset: 'custom', scheme: 'light', background: '#ffffff', text: '#111111', heading: '#000000', link: '#1a3c7a', accent: '#555555', codeBackground: '#f6f6f6', border: '#bbbbbb', textSecondary: '#4d4d4d', tableHeader: '#f0f0f0', tableBorder: '#999999', calloutBackground: '#f6f6f6', divider: '#bbbbbb', decoration: '#555555' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 25, right: 25, bottom: 25, left: 25 }, maxWidth: 70 },
  },
  css: () => `body,.lv-doc{font-family:${SERIF}}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SERIF};text-align:left;hyphens:manual}
.lv-title{font-size:2em;text-align:center;font-weight:700}
.lv-meta{text-align:center;font-style:italic}
h1{font-size:1.35em;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin:1.8em 0 .6em}
h2{font-size:1.15em;font-weight:700;margin:1.5em 0 .4em}
h3{font-size:1em;font-weight:700;font-style:italic;margin:1.2em 0 .3em}
h4,h5,h6{font-size:1em;font-weight:400;font-style:italic;display:inline}
p{margin:0;orphans:2;widows:2;text-indent:1.5em}
h1+p,h2+p,h3+p,h4+p,blockquote+p,table+p,figure+p,.lt-code+p,ul+p,ol+p{text-indent:0}
ul,ol{margin:.6em 0;padding-left:2em}
blockquote{margin:1em 2.5em;padding:0;border:0;font-size:.94em;text-align:justify}
blockquote p{text-indent:0}
blockquote cite,blockquote footer{display:block;text-align:right;font-size:.9em}
table{width:100%;font-size:.9em;border:0;border-top:1.5px solid var(--hd);border-bottom:1.5px solid var(--hd);margin:1.2em 0}
th,td{border:0;padding:.3em .6em;text-align:left}
th{border-bottom:1px solid var(--hd);font-weight:700}
caption,figcaption,.lt-caption{caption-side:top;font-size:.88em;text-align:left;padding:0 0 .4em;text-indent:0}
figure{margin:1.4em 0;break-inside:avoid}figure figcaption{text-align:left;padding-top:.4em}
code,pre{hyphens:none}
:not(pre)>code{background:none;padding:0;font-size:.88em}
.lt-code{border:0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);border-radius:0;background:transparent;margin:1em 0}
.lt-code-head{border:0;font:italic .8em ${SERIF};padding:.3em 0 0}
.lt-code pre{padding:.4em 0;font-size:.85em;line-height:1.35}
.lt-footnotes{border-top:1px solid var(--bd);font-size:.85em;margin-top:2em}
.lt-props{background:transparent;border:0;border-bottom:1px solid var(--bd);text-align:center}
@media print{a{color:var(--tx);text-decoration:none}}`,
};
