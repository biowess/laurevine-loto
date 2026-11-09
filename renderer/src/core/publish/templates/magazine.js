const SERIF = `Lora,Georgia,'Times New Roman',serif`;
const SANS = `Montserrat,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const magazine = {
  id: 'magazine',
  name: 'Magazine',
  description: 'Two-column feature layout: serif text with drop caps, bold sans headlines, pull-quotes and column rules.',
  use: ['Lora', 'Montserrat', 'JetBrains Mono'],
  defaults: {
    typography: { bodyFont: 'serif', headingFont: 'sans', fontSize: 14.5, lineHeight: 1.5, headingScale: 1.35, paragraphSpacing: 0.6, codeSize: 0.8, align: 'justify', hyphenate: true },
    palette: { preset: 'custom', scheme: 'light', background: '#fffdf9', text: '#222222', heading: '#111111', link: '#c0392b', accent: '#c0392b', codeBackground: '#f4efe8', border: '#d8cfc2', textSecondary: '#5c554c', tableHeader: '#f4efe8', tableBorder: '#d8cfc2', calloutBackground: '#f8f1e8', divider: '#d8cfc2', decoration: '#c0392b' },
    columns: { count: 2, gap: 2.2, rule: true, headingSpan: 'h1' },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 18, right: 16, bottom: 18, left: 16 }, maxWidth: 90 },
  },
  css: () => `body,.lv-doc{font-family:${SERIF};font-feature-settings:"liga","kern"}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SANS};text-align:left;hyphens:manual;break-after:avoid}
.lv-title{font-size:3.1em;font-weight:800;line-height:1.02;letter-spacing:-.03em;text-transform:uppercase}
.lv-meta{font:600 .8em ${SANS};text-transform:uppercase;letter-spacing:.14em;color:var(--ac)}
h1{font-size:2.3em;font-weight:800;line-height:1.05;letter-spacing:-.02em;margin:1.2em 0 .4em;column-span:all;border-top:5px solid var(--ac);padding-top:.3em}
h2{font-size:1.4em;font-weight:700;margin:1.3em 0 .35em}
h3{font:700 .8em ${SANS};text-transform:uppercase;letter-spacing:.14em;color:var(--ac);margin:1.3em 0 .3em}
h4,h5,h6{font-size:1em;font-weight:700}
h1+p::first-letter,h2+p::first-letter{float:left;font:700 3.6em/.8 ${SANS};padding:.06em .1em 0 0;color:var(--ac)}
blockquote{margin:1.2em 0;padding:.6em 0;border:0;border-top:3px solid var(--ac);border-bottom:1px solid var(--bd);font:italic 500 1.3em/1.25 ${SERIF};color:var(--hd);text-align:left;break-inside:avoid}
blockquote p:last-child{margin:0}
blockquote cite,blockquote footer{display:block;margin-top:.5em;font:600 .6em ${SANS};text-transform:uppercase;letter-spacing:.12em;font-style:normal;color:var(--ac)}
table{width:100%;font:.8em/1.35 ${SANS};border:0;border-top:3px solid var(--hd);margin:1.2em 0;break-inside:avoid}
th,td{border:0;border-bottom:1px solid var(--bd);padding:.35em .5em;text-align:left}
th{font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:.85em}
caption,figcaption,.lt-caption{caption-side:bottom;font:.78em/1.35 ${SANS};color:var(--ac);text-align:left;padding:.4em 0}
figure{margin:1em 0;break-inside:avoid}figure img,img{width:100%;height:auto}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:var(--cb);padding:.05em .3em;font-size:.8em}
.lt-code{border:0;border-left:4px solid var(--ac);border-radius:0;background:var(--cb);margin:1em 0}
.lt-code-head{border:0;font:700 .65em ${SANS};text-transform:uppercase;letter-spacing:.14em;padding:.4em .9em 0}
.lt-code pre{padding:.4em .9em .7em;font-size:.78em;white-space:pre-wrap}
.lt-footnotes{column-span:all;border-top:1px solid var(--bd);font-size:.8em}
.lt-props{column-span:all;border:0;border-bottom:3px solid var(--ac);background:transparent}
.lv-toc,.lv-cover{column-span:all}`,
};
