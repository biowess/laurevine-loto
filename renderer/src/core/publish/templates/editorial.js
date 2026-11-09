const SERIF = `'EB Garamond',Garamond,'Palatino Linotype',Palatino,Georgia,serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const editorial = {
  id: 'editorial',
  name: 'Editorial',
  description: 'Book-like serif layout in EB Garamond with small-caps headings, rules and generous margins.',
  fonts: [
    { family: 'EB Garamond', file: 'eb-garamond/EBGaramond[wght].ttf', style: 'normal' },
    { family: 'EB Garamond', file: 'eb-garamond/EBGaramond-Italic[wght].ttf', style: 'italic' },
  ],
  defaults: {
    typography: { bodyFont: 'serif', headingFont: 'serif', fontSize: 17, lineHeight: 1.55, headingScale: 1.3, paragraphSpacing: 0.7, codeSize: 0.82, align: 'justify', hyphenate: true },
    palette: { preset: 'custom', scheme: 'light', background: '#fdfbf6', text: '#2b2724', heading: '#1a1614', link: '#7a2e2e', accent: '#8c6d3f', codeBackground: '#f3eee3', border: '#d9d0bd', textSecondary: '#6b6258', tableHeader: '#efe8d8', tableBorder: '#d9d0bd', calloutBackground: '#f3eee3', divider: '#c9bfa8', decoration: '#8c6d3f' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 25, right: 22, bottom: 25, left: 22 }, maxWidth: 66 },
  },
  css: () => `body,.lv-doc{font-family:${SERIF};font-feature-settings:"liga","onum","kern";font-variant-numeric:oldstyle-nums}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SERIF};font-weight:500;letter-spacing:.01em;text-align:left;hyphens:manual}
.lv-title{font-size:3em;font-weight:400;letter-spacing:.02em;border-bottom:1px solid var(--ac);padding-bottom:.4em}
.lv-meta{font-variant:small-caps;letter-spacing:.08em}
h1{font-size:2.1em;font-weight:400;margin:2.2em 0 .6em;padding-bottom:.25em;border-bottom:1px solid var(--bd)}
h2{font-size:1.55em;margin:1.9em 0 .5em}
h3{font-size:1.25em;font-style:italic;margin:1.6em 0 .4em}
h4{font-size:1em;font-variant:small-caps;letter-spacing:.1em;font-weight:600;text-transform:lowercase}
h5{font-size:1em;font-style:italic;font-weight:500}
h6{font-size:.9em;font-variant:small-caps;letter-spacing:.08em;color:var(--ac)}
p{orphans:3;widows:3}
.lv-section>p:first-of-type::first-line,h1+p::first-line,h2+p::first-line{font-variant:small-caps;letter-spacing:.04em}
p+p{text-indent:1.4em;margin-top:-${'.2'}em}
blockquote{margin:1.4em 2em;padding:0 0 0 1.2em;border-left:2px solid var(--ac);font-style:italic;color:var(--hd)}
blockquote p+p{text-indent:0;margin-top:0}
blockquote cite,blockquote footer{display:block;margin-top:.4em;font-size:.9em;font-style:normal;font-variant:small-caps;letter-spacing:.06em;color:var(--ac)}
blockquote cite::before{content:"\\2014\\00a0"}
hr{border:0;text-align:center;margin:2em 0}hr::before{content:"\\2766";color:var(--ac);font-size:1.2em}
table{width:100%;font-size:.92em;font-variant-numeric:lining-nums tabular-nums;border:0;border-top:2px solid var(--hd);border-bottom:2px solid var(--hd);margin:1.4em 0}
th,td{border:0;border-bottom:1px solid var(--bd);padding:.35em .7em;text-align:left}
th{background:transparent;font-variant:small-caps;letter-spacing:.06em;font-weight:600;border-bottom:1px solid var(--hd)}
tbody tr:last-child td{border-bottom:0}
caption,figcaption,.lt-caption{caption-side:bottom;font-size:.88em;font-style:italic;color:var(--ac);text-align:left;text-indent:0;padding:.5em 0 0}
figure{margin:1.6em 0;text-align:center;break-inside:avoid}figure figcaption{text-align:center}
img{display:block;margin:1.2em auto}figure img{margin:0 auto}
code,pre{font-family:${MONO};font-variant-numeric:normal;font-feature-settings:normal;hyphens:none}
:not(pre)>code{background:var(--cb);border:1px solid var(--bd);padding:0 .3em;border-radius:2px;font-size:.84em}
.lt-code{border:0;border-left:3px solid var(--ac);border-radius:0;background:var(--cb);margin:1.4em 0}
.lt-code-head{border:0;font:500 .72em ${SERIF};font-variant:small-caps;letter-spacing:.1em;padding:.4em 1em 0}
.lt-code pre{padding:.5em 1em .8em;line-height:1.45}
a{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.15em}
.lt-footnotes{border-top:1px solid var(--bd);font-size:.88em}
.lt-props{border:0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);background:transparent}
.lv-toc li{border-bottom:1px dotted var(--bd);padding-bottom:.15em}
.lv-toc .l1{font-weight:500}.lv-toc .l2{font-style:italic}
@media print{body{background:none}a{color:var(--tx);text-decoration:none}h1{break-before:auto}}`,
};
