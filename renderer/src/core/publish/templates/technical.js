const SANS = `Roboto,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const technical = {
  id: 'technical',
  name: 'Technical',
  description: 'Documentation style: sans body, monospaced headings accents, prominent code blocks, grid tables and note blocks.',
  use: ['Roboto', 'JetBrains Mono'],
  defaults: {
    typography: { bodyFont: 'sans', headingFont: 'sans', fontSize: 15, lineHeight: 1.6, headingScale: 1.25, paragraphSpacing: 0.8, codeSize: 0.88, align: 'left', hyphenate: false },
    palette: { preset: 'custom', scheme: 'light', background: '#ffffff', text: '#24292f', heading: '#0d1117', link: '#0969da', accent: '#0969da', codeBackground: '#f6f8fa', border: '#d0d7de', textSecondary: '#57606a', tableHeader: '#eaeef2', tableBorder: '#d0d7de', calloutBackground: '#ddf4ff', divider: '#d0d7de', decoration: '#0969da' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 20, right: 18, bottom: 20, left: 18 }, maxWidth: 80 },
  },
  css: () => `body,.lv-doc{font-family:${SANS}}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SANS};font-weight:700}
.lv-title{font-size:2.4em;letter-spacing:-.02em}
.lv-meta{font-family:${MONO};font-size:.8em}
h1{font-size:1.8em;margin:1.8em 0 .6em;padding-bottom:.3em;border-bottom:1px solid var(--bd)}
h2{font-size:1.4em;margin:1.6em 0 .5em;padding-bottom:.25em;border-bottom:1px solid var(--bd)}
h3{font-size:1.15em;margin:1.4em 0 .4em}
h4{font-size:1em;margin:1.2em 0 .3em}
h5,h6{font:600 .85em ${MONO};text-transform:uppercase;letter-spacing:.06em;color:var(--ac)}
a{text-decoration:none}
blockquote{margin:1.2em 0;padding:.6em 1em;background:var(--cb);border:1px solid var(--bd);border-left:4px solid var(--ac);border-radius:0 4px 4px 0;color:var(--tx)}
blockquote p:last-child{margin:0}
table{width:100%;font-size:.9em;border:1px solid var(--bd);border-collapse:collapse;margin:1.2em 0}
th,td{border:1px solid var(--bd);padding:.4em .75em;text-align:left}
th{background:var(--cb);font-weight:600}
caption,figcaption,.lt-caption{font:.8em ${MONO};color:var(--ac);text-align:left;padding:.5em 0}
caption{caption-side:bottom}
figure{margin:1.4em 0;break-inside:avoid}figure img{border:1px solid var(--bd)}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:var(--cb);border:1px solid var(--bd);border-radius:4px;padding:.1em .35em;font-size:.85em}
.lt-code{border:1px solid var(--bd);border-radius:6px;background:var(--cb);margin:1.2em 0}
.lt-code-head{font:600 .72em ${MONO};background:var(--bd);color:var(--hd);border:0;padding:.35em 1em}
.lt-code pre{padding:.8em 1em;line-height:1.5;white-space:pre-wrap}
.lt-callout-title{font-family:${MONO};font-size:.85em;text-transform:uppercase;letter-spacing:.05em}
.lt-footnotes{border-top:1px solid var(--bd);font-size:.85em}
.lt-props{border:1px solid var(--bd);border-radius:6px;font-family:${MONO};font-size:.8em}
.lv-toc li{font-family:${MONO};font-size:.9em}`,
};
