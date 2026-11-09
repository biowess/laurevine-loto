const SANS = `'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const modernReport = {
  id: 'modern-report',
  name: 'Modern Report',
  description: 'Business report in Spline Sans: accent colour bars, shaded callouts, banded tables and bold section heads.',
  use: ['Plus Jakarta Sans', 'JetBrains Mono'],
  defaults: {
    typography: { bodyFont: 'sans', headingFont: 'sans', fontSize: 15, lineHeight: 1.6, headingScale: 1.3, paragraphSpacing: 0.8, codeSize: 0.84, align: 'left', hyphenate: false },
    palette: { preset: 'custom', scheme: 'light', background: '#ffffff', text: '#27303a', heading: '#0f2742', link: '#0b6bcb', accent: '#0b6bcb', codeBackground: '#eef3f9', border: '#d3dde8', textSecondary: '#55616f', tableHeader: '#dce8f5', tableBorder: '#d3dde8', calloutBackground: '#e8f1fb', divider: '#d3dde8', decoration: '#0b6bcb' },
    columns: { count: 1, gap: 2, rule: false },
    page: { size: 'A4', orientation: 'portrait', margins: { top: 22, right: 20, bottom: 22, left: 20 }, maxWidth: 72 },
  },
  css: () => `body,.lv-doc{font-family:${SANS}}
.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${SANS};font-weight:700}
.lv-cover{text-align:left;align-items:flex-start;border-left:12px solid var(--ac);padding-left:1.5em}
.lv-title{font-size:3em;font-weight:800;letter-spacing:-.02em}
.lv-meta{font-size:.95em;font-weight:500}
h1{font-size:1.9em;font-weight:800;margin:2em 0 .6em;padding-left:.5em;border-left:8px solid var(--ac)}
h2{font-size:1.4em;margin:1.8em 0 .5em;color:var(--ac)}
h3{font-size:1.1em;margin:1.5em 0 .4em;text-transform:uppercase;letter-spacing:.06em}
h4,h5,h6{font-size:1em;font-weight:600}
blockquote{margin:1.4em 0;padding:1em 1.4em;background:var(--cb);border:0;border-top:3px solid var(--ac);border-radius:0 0 6px 6px;font-size:1.05em;font-weight:500;color:var(--hd)}
blockquote p:last-child{margin:0}
table{width:100%;font-size:.9em;border:0;border-collapse:collapse;margin:1.4em 0}
th,td{border:0;padding:.55em .8em;text-align:left}
th{background:var(--hd);color:var(--bg);font-weight:600}
tbody tr:nth-child(even) td{background:var(--cb)}
caption,figcaption,.lt-caption{font-size:.82em;font-weight:500;color:var(--ac);text-align:left;padding:.5em 0}
caption{caption-side:top}
figure{margin:1.6em 0;break-inside:avoid}
code,pre{font-family:${MONO};hyphens:none}
:not(pre)>code{background:var(--cb);color:var(--hd);border-radius:4px;padding:.1em .35em}
.lt-code{border:0;border-radius:6px;background:var(--cb);margin:1.4em 0;overflow:hidden}
.lt-code-head{background:var(--ac);color:var(--bg);border:0;font:600 .72em ${SANS};padding:.35em 1em}
.lt-code pre{padding:.8em 1em}
.lt-callout-title{color:var(--ac)}
.lt-footnotes{border-top:3px solid var(--ac);font-size:.85em}
.lt-props{border:0;border-radius:6px;background:var(--cb)}
.lv-toc li{border-bottom:1px solid var(--bd);padding:.3em 0}.lv-toc .l1{font-weight:700}`,
};
