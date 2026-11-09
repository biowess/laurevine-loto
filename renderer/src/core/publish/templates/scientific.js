const SANS = `'Source Sans 3',system-ui,'Segoe UI',Helvetica,Arial,sans-serif`;
const SERIF = `Lora,Georgia,'Times New Roman',serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const scientific = {
  id: 'scientific',
  name: 'Scientific',
  description: 'Research-paper layout: serif body, sans headings, compact figures, tabular numerals and numbered-style captions.',
  use: ['Lora', 'Source Sans 3', 'JetBrains Mono'],
  defaults: {
    typography: { bodyFont: 'serif', headingFont: 'sans', fontSize: 15, lineHeight: 1.45, headingScale: 1.22, paragraphSpacing: 0.6, codeSize: 0.82, align: 'justify', hyphenate: true },
    palette: { preset: 'custom', scheme: 'light', background: '#ffffff', text: '#1c1c1c', heading: '#0b2545', link: '#134074', accent: '#13315c', codeBackground: '#eef2f7', border: '#c5cfdc', textSecondary: '#4a5a6e', tableHeader: '#e1e8f1', tableBorder: '#c5cfdc', calloutBackground: '#eef2f7', divider: '#c5cfdc', decoration: '#13315c' },
    columns: { count: 1, gap: 2, rule: false, tables: 'span', images: 'span' },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 22, right: 20, bottom: 22, left: 20 }, maxWidth: 74 },
  },
  css: () => `body,.lv-doc{font-family:${SERIF};font-variant-numeric:lining-nums}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SANS};text-align:left;hyphens:manual}
.lv-title{font-size:2.2em;font-weight:700;line-height:1.15}
.lv-meta{font-family:${SANS};font-size:.9em}
h1{font-size:1.5em;font-weight:700;margin:1.8em 0 .5em;border-bottom:2px solid var(--ac);padding-bottom:.15em}
h2{font-size:1.2em;font-weight:600;margin:1.5em 0 .4em;color:var(--ac)}
h3{font-size:1em;font-weight:600;margin:1.2em 0 .3em}
h4,h5,h6{font-size:.95em;font-weight:600;font-style:italic;color:var(--ac)}
blockquote{margin:1em 0;padding:.5em 1em;background:var(--cb);border:0;border-left:4px solid var(--ac);font-size:.95em}
blockquote p:last-child{margin:0}
table{width:100%;font-family:${SANS};font-size:.82em;font-variant-numeric:tabular-nums;border:1px solid var(--ac);margin:1.2em 0}
th,td{border:1px solid var(--bd);padding:.3em .55em;text-align:left}
th{background:var(--ac);color:var(--bg);font-weight:600}
tbody tr:nth-child(even) td{background:var(--cb)}
caption,figcaption,.lt-caption{font-family:${SANS};font-size:.82em;color:var(--ac);text-align:left;padding:.4em 0}
caption{caption-side:top}
figure{margin:1.2em 0;text-align:center;break-inside:avoid}figure figcaption{text-align:left}
figure img,img{max-width:100%;height:auto}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:var(--cb);border-radius:2px;padding:.05em .3em;font-size:.82em}
.lt-code{border:1px solid var(--bd);border-radius:3px;background:var(--cb);margin:1em 0}
.lt-code-head{font:600 .7em ${SANS};text-transform:uppercase;letter-spacing:.08em;background:var(--bd);border:0;padding:.25em .8em}
.lt-code pre{padding:.6em .8em;line-height:1.4}
.lv-math--block{margin:1em 0}
.lt-footnotes{border-top:1px solid var(--ac);font-size:.82em}
.lt-props{border:1px solid var(--bd);border-radius:3px;font-family:${SANS}}
@media print{a{color:var(--ln);text-decoration:none}}`,
};
