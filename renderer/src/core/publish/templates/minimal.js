const SANS = `Inter,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const minimal = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Quiet sans-serif page: light weights, no decoration, wide whitespace and hairline rules.',
  use: ['Inter', 'JetBrains Mono'],
  defaults: {
    typography: { bodyFont: 'sans', headingFont: 'sans', fontSize: 16, lineHeight: 1.7, headingScale: 1.2, paragraphSpacing: 1, codeSize: 0.85, align: 'left', hyphenate: false },
    palette: { preset: 'custom', scheme: 'light', background: '#ffffff', text: '#333333', heading: '#111111', link: '#111111', accent: '#6b6b6b', codeBackground: '#f7f7f7', border: '#e5e5e5', textSecondary: '#6b6b6b', tableHeader: '#f7f7f7', tableBorder: '#e5e5e5', calloutBackground: '#f7f7f7', divider: '#e5e5e5', decoration: '#999999' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 28, right: 28, bottom: 28, left: 28 }, maxWidth: 62 },
  },
  css: () => `body,.lv-doc{font-family:${SANS};font-weight:350}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SANS};font-weight:500;letter-spacing:-.01em}
.lv-title{font-size:2.6em;font-weight:300;letter-spacing:-.03em}
.lv-meta{font-size:.85em;letter-spacing:.04em}
h1{font-size:1.8em;font-weight:400;margin:2.4em 0 .6em}
h2{font-size:1.35em;margin:2em 0 .5em}
h3{font-size:1.1em;margin:1.6em 0 .4em}
h4,h5,h6{font-size:.9em;font-weight:500;text-transform:uppercase;letter-spacing:.1em;color:var(--ac)}
a{text-decoration:none;border-bottom:1px solid var(--bd)}
blockquote{margin:1.6em 0;padding:0 0 0 1.4em;border:0;border-left:1px solid var(--ac);color:var(--ac);font-size:1.05em}
hr{border:0;border-top:1px solid var(--bd);margin:2.4em 0}
table{width:100%;font-size:.92em;border:0;border-collapse:collapse}
th,td{border:0;border-bottom:1px solid var(--bd);padding:.55em .8em .55em 0;text-align:left}
th{font-weight:500;color:var(--ac);font-size:.85em;letter-spacing:.05em}
caption,figcaption,.lt-caption{caption-side:bottom;font-size:.82em;color:var(--ac);text-align:left;padding:.6em 0}
figure{margin:2em 0;break-inside:avoid}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:none;padding:0;border-bottom:1px dotted var(--ac)}
.lt-code{border:0;border-radius:0;background:var(--cb);margin:1.6em 0}
.lt-code-head{display:none}
.lt-code pre{padding:1em 1.2em;line-height:1.55}
.lt-footnotes{border-top:1px solid var(--bd);font-size:.85em}
.lt-props{border:0;background:transparent;color:var(--ac)}
.lv-toc li{padding:.1em 0}`,
};
