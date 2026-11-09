const SERIF = `'Libre Baskerville','Palatino Linotype',Palatino,Georgia,serif`;
const MONO = `'Courier New',Courier,ui-monospace,Menlo,Consolas,monospace`;

export const classic = {
  id: 'classic',
  name: 'Classic',
  description: 'Traditional book page: centered headings, ornamental dividers, indented paragraphs and framed quotations.',
  use: ['Libre Baskerville'],
  defaults: {
    typography: { bodyFont: 'classic', headingFont: 'classic', fontSize: 15, lineHeight: 1.65, headingScale: 1.25, paragraphSpacing: 0, codeSize: 0.84, align: 'justify', hyphenate: true },
    palette: { preset: 'custom', scheme: 'light', background: '#fbf8f1', text: '#26211c', heading: '#1b1612', link: '#5b3a29', accent: '#7b5b3a', codeBackground: '#f0eadc', border: '#cdbfa5', textSecondary: '#5d5246', tableHeader: '#efe7d5', tableBorder: '#cdbfa5', calloutBackground: '#f3ecdc', divider: '#b9a888', decoration: '#7b5b3a' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A5', orientation: 'portrait', margins: { top: 22, right: 20, bottom: 24, left: 20 }, maxWidth: 60 },
  },
  css: () => `body,.lv-doc{font-family:${SERIF}}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SERIF};font-weight:400;text-align:center;hyphens:manual}
.lv-title{font-size:2.6em;letter-spacing:.06em;text-transform:uppercase}
.lv-title::after{content:"\\2766";display:block;font-size:.5em;color:var(--ac);margin-top:.6em;letter-spacing:0}
.lv-meta{font-style:italic;text-align:center}
h1{font-size:1.9em;letter-spacing:.08em;text-transform:uppercase;margin:2.4em 0 1em}
h1::after{content:"";display:block;width:3em;border-top:1px solid var(--ac);margin:.5em auto 0}
h2{font-size:1.4em;font-style:italic;margin:2em 0 .6em}
h3{font-size:1.1em;letter-spacing:.12em;text-transform:uppercase;margin:1.6em 0 .4em}
h4,h5,h6{font-size:1em;font-style:italic;color:var(--ac)}
p{margin:0;text-indent:1.5em;orphans:2;widows:2}
h1+p,h2+p,h3+p,h4+p,hr+p,blockquote+p,table+p,figure+p,.lt-code+p{text-indent:0}
h1+p::first-letter{float:left;font-size:3.2em;line-height:.85;padding:.05em .08em 0 0;color:var(--ac)}
hr{border:0;text-align:center;margin:1.8em 0}hr::before{content:"\\2766  \\2766  \\2766";color:var(--ac);letter-spacing:.3em}
blockquote{margin:1.4em 2em;padding:.6em 1.2em;border:0;border-top:1px solid var(--ac);border-bottom:1px solid var(--ac);font-style:italic;text-align:center}
blockquote p{text-indent:0}
blockquote cite,blockquote footer{display:block;margin-top:.5em;font-size:.85em;font-style:normal;letter-spacing:.1em;text-transform:uppercase}
table{width:100%;font-size:.9em;border:1px double var(--hd);border-collapse:collapse;margin:1.4em 0}
th,td{border:0;border-bottom:1px solid var(--bd);padding:.35em .7em;text-align:left}
th{border-bottom:3px double var(--hd);font-variant:small-caps;letter-spacing:.06em}
caption,figcaption,.lt-caption{caption-side:bottom;font-size:.85em;font-style:italic;text-align:center;padding:.5em 0;text-indent:0}
figure{margin:1.6em 0;text-align:center;break-inside:avoid}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:none;font-size:.9em}
.lt-code{border:1px solid var(--bd);border-radius:0;background:var(--cb);margin:1.4em 0}
.lt-code-head{border:0;border-bottom:1px solid var(--bd);font:italic .8em ${SERIF};text-align:center;padding:.3em}
.lt-code pre{padding:.6em 1em;font-size:.82em;line-height:1.35}
.lt-footnotes{border-top:1px solid var(--ac);font-size:.85em}
.lt-props{border:1px double var(--bd);background:transparent}
.lv-toc li{border-bottom:1px dotted var(--bd)}`,
};
