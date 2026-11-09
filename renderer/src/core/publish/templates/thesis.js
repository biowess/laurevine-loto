const SERIF = `'TeX Gyre Termes','Times New Roman',Times,'Liberation Serif',serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const thesis = {
  id: 'thesis',
  name: 'Thesis',
  description: 'Dissertation layout: generous line spacing, chapter openings on new pages with numbering, and a title-page placeholder style.',
  use: ['TeX Gyre Termes', 'JetBrains Mono'],
  defaults: {
    typography: { bodyFont: 'serif', headingFont: 'serif', fontSize: 16, lineHeight: 1.8, headingScale: 1.2, paragraphSpacing: 0, codeSize: 0.8, align: 'justify', hyphenate: true },
    palette: { preset: 'custom', scheme: 'light', background: '#ffffff', text: '#000000', heading: '#000000', link: '#1a3c7a', accent: '#444444', codeBackground: '#f5f5f5', border: '#999999', textSecondary: '#444444', tableHeader: '#eeeeee', tableBorder: '#999999', calloutBackground: '#f5f5f5', divider: '#999999', decoration: '#444444' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 25, right: 25, bottom: 25, left: 35 }, maxWidth: 72 },
  },
  css: () => `body,.lv-doc{font-family:${SERIF};counter-reset:chapter}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SERIF};text-align:left;hyphens:manual;line-height:1.3}
.lv-cover,.lt-titlepage{min-height:90vh;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;break-after:page;text-indent:0;line-height:1.4}
.lt-titlepage{border:2px dashed var(--bd);padding:2em;color:var(--ac)}
.lt-titlepage::before{content:"Title page";font-variant:small-caps;letter-spacing:.2em}
.lv-title{font-size:2.2em;font-weight:700;text-align:center;text-transform:uppercase}
.lv-meta{text-align:center;font-size:1.05em}
h1{counter-increment:chapter;counter-reset:section;break-before:page;font-size:2em;font-weight:700;margin:3.5em 0 1.5em;padding-bottom:.4em;border-bottom:2px solid var(--hd)}
h1::before{content:"Chapter " counter(chapter);display:block;font-size:.45em;font-weight:400;letter-spacing:.25em;text-transform:uppercase;color:var(--ac);margin-bottom:.8em}
h2{counter-increment:section;font-size:1.4em;font-weight:700;margin:2em 0 .6em}
h2::before{content:counter(chapter) "." counter(section) "\\00a0\\00a0"}
h3{font-size:1.15em;font-weight:700;font-style:italic;margin:1.6em 0 .5em}
h4,h5,h6{font-size:1em;font-weight:400;font-style:italic;text-decoration:underline}
.lv-num{display:none}
p{margin:0;text-indent:1.5em;orphans:3;widows:3}
h1+p,h2+p,h3+p,h4+p,blockquote+p,table+p,figure+p,.lt-code+p{text-indent:0}
blockquote{margin:1.2em 2.5em;padding:0;border:0;font-size:.95em;line-height:1.4;text-align:justify}
blockquote p{text-indent:0}
blockquote cite,blockquote footer{display:block;text-align:right;font-style:normal}
table{width:100%;font-size:.9em;line-height:1.35;border:0;border-top:2px solid var(--hd);border-bottom:2px solid var(--hd);margin:1.4em 0}
th,td{border:0;padding:.3em .6em;text-align:left}
th{border-bottom:1px solid var(--hd);font-weight:700}
caption,figcaption,.lt-caption{font-size:.88em;line-height:1.35;text-align:left;padding:.4em 0;text-indent:0}
caption{caption-side:top;font-weight:700}
figure{margin:1.6em 0;break-inside:avoid}figure figcaption{text-align:center}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:none;font-size:.85em}
.lt-code{border:1px solid var(--bd);border-radius:0;background:var(--cb);margin:1.2em 0}
.lt-code-head{border:0;border-bottom:1px solid var(--bd);font:italic .8em ${SERIF};padding:.25em .8em}
.lt-code pre{padding:.5em .8em;font-size:.78em;line-height:1.35}
.lt-footnotes{border-top:1px solid var(--hd);font-size:.85em;line-height:1.4}
.lt-props{background:transparent;border:0;border-bottom:1px solid var(--bd)}
.lv-toc{line-height:1.6}.lv-toc .l1{font-weight:700;margin-top:.8em}
@media print{a{color:var(--tx);text-decoration:none}}`,
};
