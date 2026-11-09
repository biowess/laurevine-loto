import { SANS, SERIF, MONO, palette, typo, page, flow, tables, code, callout, toc, props } from './kit.js';

const cols = { count: 1, gap: 2, rule: false };
const heads = (h) => `.lv-cover,.lv-meta{text-align:start}.lv-title,.lv-toc-title,h1,h2,h3,h4,h5,h6{font-family:${h};text-align:start;hyphens:manual}`;

// Executive Brief: Playfair headlines over Source Sans, navy with a restrained gold rule.
const EX_H = SERIF('Playfair Display'), EX_B = SANS('Source Sans 3');
const executive = {
  id: 'executive',
  name: 'Executive Brief',
  description: 'Boardroom brief: Playfair Display headlines, Source Sans text, navy table headers and a single gold rule.',
  use: ['Playfair Display', 'Source Sans 3', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'sans', headingFont: 'serif', fontSize: 15.5, lineHeight: 1.55, headingScale: 1.3, paragraphSpacing: 0.8 }),
    palette: palette({ background: '#ffffff', text: '#1f2933', heading: '#0b1f3a', link: '#1d4e89', accent: '#8a6a1f', codeBackground: '#f4f6f9', border: '#d5dbe3', textSecondary: '#566273', tableHeader: '#0b1f3a', tableBorder: '#d5dbe3', calloutBackground: '#f3efe3', divider: '#d5dbe3', decoration: '#b08a3e' }),
    columns: cols,
    page: page('A4', [24, 22, 24, 22], 72),
  },
  css: () => `body,.lv-doc{font-family:${EX_B};font-feature-settings:"kern","liga","lnum"}
${heads(EX_H)}
.lv-title{font-size:2.9em;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.lv-title::after{content:"";display:block;width:3.2em;border-top:3px solid var(--dc);margin-top:.5em}
.lv-meta{font:600 .78em ${EX_B};text-transform:uppercase;letter-spacing:.14em;color:var(--t2)}
h1{font-size:1.95em;font-weight:700;line-height:1.15;margin:2em 0 .55em}
h1::before{content:"";display:block;width:2em;border-top:3px solid var(--dc);margin-bottom:.45em}
h2{font-size:1.45em;font-weight:600;line-height:1.2;margin:1.8em 0 .45em}
h3{font:700 .8em ${EX_B};text-transform:uppercase;letter-spacing:.12em;color:var(--t2);margin:1.6em 0 .4em}
h4{font:700 1em ${EX_B};margin:1.3em 0 .3em}h5{font:italic 600 1em ${EX_B}}h6{font:700 .85em ${EX_B};letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}
blockquote{margin:1.5em 0;padding:.2em 0 .2em 0;padding-inline-start:1.2em;border:0;border-inline-start:3px solid var(--dc);font:italic 400 1.18em/1.4 ${EX_H};color:var(--hd)}
blockquote p{margin:0 0 .4em}blockquote cite,blockquote footer{display:block;margin-top:.5em;font:600 .68em ${EX_B};font-style:normal;text-transform:uppercase;letter-spacing:.12em;color:var(--t2)}
hr{border:0;border-top:1px solid var(--dv);margin:2em 0}
${flow}
${tables('band', EX_B)}
${code(MONO('Source Code Pro'), 'bar', EX_B)}
${callout('bar', EX_B)}
${toc(EX_H)}
${props}`,
};

// Whitepaper: Merriweather body, Montserrat heads, teal structure.
const WP_H = SANS('Montserrat'), WP_B = SERIF('Merriweather');
const whitepaper = {
  id: 'whitepaper',
  name: 'Whitepaper',
  description: 'Research-backed whitepaper: Merriweather text, Montserrat section heads with teal edges, hairline tables and framed call-outs.',
  use: ['Merriweather', 'Montserrat', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'serif', headingFont: 'sans', fontSize: 14.5, lineHeight: 1.7, headingScale: 1.28, paragraphSpacing: 0.9 }),
    palette: palette({ background: '#ffffff', text: '#22303c', heading: '#0e3b43', link: '#0b6670', accent: '#0b7a7c', codeBackground: '#eef5f6', border: '#cfdfe1', textSecondary: '#566872', tableHeader: '#0e3b43', tableBorder: '#cfdfe1', calloutBackground: '#eaf5f5', divider: '#cfdfe1', decoration: '#0f8b8d' }),
    columns: cols,
    page: page('A4', [24, 22, 24, 22], 68),
  },
  css: () => `body,.lv-doc{font-family:${WP_B};font-feature-settings:"kern","liga"}
${heads(WP_H)}
.lv-title{font-size:2.5em;font-weight:800;line-height:1.1;letter-spacing:-.02em;border-top:6px solid var(--dc);padding-top:.5em}
.lv-meta{font:600 .76em ${WP_H};text-transform:uppercase;letter-spacing:.14em;color:var(--t2)}
h1{font-size:1.75em;font-weight:800;line-height:1.15;letter-spacing:-.01em;margin:2em 0 .6em;padding-bottom:.3em;border-bottom:1px solid var(--bd)}
h2{font-size:1.28em;font-weight:700;line-height:1.25;margin:1.9em 0 .5em;padding-inline-start:.6em;border-inline-start:4px solid var(--dc)}
h3{font:700 .86em ${WP_H};text-transform:uppercase;letter-spacing:.1em;margin:1.7em 0 .4em}
h4{font:700 1em ${WP_H};margin:1.4em 0 .3em}h5{font:600 .95em ${WP_H}}h6{font:600 .8em ${WP_H};text-transform:uppercase;letter-spacing:.08em;color:var(--t2)}
blockquote{margin:1.6em 0;padding:.3em 1.2em;border:0;border-inline-start:4px solid var(--dc);font:600 1.12em/1.5 ${WP_H};color:var(--hd)}
blockquote p{margin:0 0 .4em}blockquote cite,blockquote footer{display:block;margin-top:.5em;font:600 .68em ${WP_H};font-style:normal;text-transform:uppercase;letter-spacing:.12em;color:var(--t2)}
hr{border:0;border-top:1px solid var(--dv);margin:2.2em 0}
${flow}
${tables('plain', WP_H)}
th{font-size:.82em;text-transform:uppercase;letter-spacing:.06em}
${code(MONO('Source Code Pro'), 'box', WP_H)}
${callout('box', WP_H)}
${toc(WP_H)}
${props}`,
};

// Proposal: Poppins over Open Sans, violet with a gradient underline.
const PR_H = SANS('Poppins'), PR_B = SANS('Open Sans');
const proposal = {
  id: 'proposal',
  name: 'Proposal',
  description: 'Client proposal: Poppins headings, Open Sans text, deep violet table headers, rounded call-outs and a gradient title rule.',
  use: ['Poppins', 'Open Sans', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'sans', headingFont: 'sans', fontSize: 15, lineHeight: 1.65, headingScale: 1.28, paragraphSpacing: 0.85 }),
    palette: palette({ background: '#ffffff', text: '#2a2f3a', heading: '#1e1b4b', link: '#4338ca', accent: '#6d28d9', codeBackground: '#f4f3fb', border: '#dcd9ee', textSecondary: '#5b6073', tableHeader: '#4c1d95', tableBorder: '#dcd9ee', calloutBackground: '#f5f3ff', divider: '#dcd9ee', decoration: '#6d28d9' }),
    columns: cols,
    page: page('A4', [22, 20, 22, 20], 74),
  },
  css: () => `body,.lv-doc{font-family:${PR_B};font-feature-settings:"kern","liga"}
${heads(PR_H)}
.lv-title{font-size:3em;font-weight:700;line-height:1.1;letter-spacing:-.02em}
.lv-title::after{content:"";display:block;width:4.5em;height:.14em;border-radius:99px;background:linear-gradient(90deg,var(--dc),color-mix(in srgb,var(--dc),#2563eb 60%));margin-top:.4em}
.lv-meta{font:500 .85em ${PR_H};color:var(--t2);letter-spacing:.03em}
h1{font-size:1.9em;font-weight:700;line-height:1.15;letter-spacing:-.01em;margin:2em 0 .55em}
h1::after{content:"";display:block;width:2.4em;height:.12em;border-radius:99px;background:linear-gradient(90deg,var(--dc),color-mix(in srgb,var(--dc),#2563eb 60%));margin-top:.35em}
h2{font-size:1.4em;font-weight:600;line-height:1.25;margin:1.8em 0 .45em}
h3{font-size:1.1em;font-weight:600;color:var(--ac);margin:1.6em 0 .35em}
h4{font:600 1em ${PR_H};margin:1.3em 0 .3em}h5{font:500 .95em ${PR_H}}h6{font:600 .8em ${PR_H};text-transform:uppercase;letter-spacing:.08em;color:var(--t2)}
blockquote{margin:1.5em 0;padding:.5em 1.3em;border:0;border-inline-start:4px solid var(--dc);border-radius:0 10px 10px 0;background:var(--co);font:italic 400 1.04em/1.6 ${PR_B};color:var(--hd)}
blockquote p{margin:0 0 .4em}blockquote cite,blockquote footer{display:block;margin-top:.4em;font:600 .72em ${PR_H};font-style:normal;color:var(--ac)}
hr{border:0;height:2px;background:linear-gradient(90deg,var(--dv),transparent);margin:2em 0}
${flow}
${tables('band', PR_H)}
${code(MONO('Source Code Pro'), 'box', PR_H)}
.lt-code{border-radius:8px}
${callout('bar', PR_H)}
.lt-callout{border-radius:0 10px 10px 0}
${toc(PR_H)}
${props}`,
};

// Datasheet: compact Fira Sans with navy section bands for dense specification content.
const DS_B = SANS('Fira Sans'), DS_M = MONO('Fira Code');
const datasheet = {
  id: 'datasheet',
  name: 'Datasheet',
  description: 'Dense specification sheet: Fira Sans and Fira Code, navy section bands, compact zebra tables and orange call-outs.',
  use: ['Fira Sans', 'Fira Code'],
  defaults: {
    typography: typo({ bodyFont: 'sans', headingFont: 'sans', fontSize: 13.5, lineHeight: 1.45, headingScale: 1.22, paragraphSpacing: 0.65, codeSize: 0.84 }),
    palette: palette({ background: '#ffffff', text: '#1d2733', heading: '#0a3d62', link: '#0a66c2', accent: '#b8430a', codeBackground: '#f1f4f8', border: '#cbd5e1', textSecondary: '#556372', tableHeader: '#0a3d62', tableBorder: '#cbd5e1', calloutBackground: '#fff1e5', divider: '#cbd5e1', decoration: '#e8590c' }),
    columns: cols,
    page: page('A4', [16, 16, 16, 16], 92),
  },
  css: () => `body,.lv-doc{font-family:${DS_B};font-feature-settings:"kern","liga"}
${heads(DS_B)}
.lv-title{font-size:2.3em;font-weight:700;line-height:1.1;border-bottom:4px solid var(--dc);padding-bottom:.3em}
.lv-meta{font:500 .74em ${DS_M};text-transform:uppercase;letter-spacing:.08em;color:var(--t2)}
h1{font-size:1.2em;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--hd);color:var(--bg);padding:.4em .8em;margin:1.8em 0 .8em;border-inline-start:6px solid var(--dc)}
h1 .lv-num{color:inherit;opacity:.8}
h2{font-size:1.2em;font-weight:700;padding-bottom:.2em;border-bottom:2px solid var(--dc);margin:1.6em 0 .6em}
h3{font-size:1em;font-weight:700;margin:1.4em 0 .35em}
h3::before{content:"";display:inline-block;width:.5em;height:.5em;background:var(--dc);margin-inline-end:.5em;vertical-align:.04em}
h4{font:700 .95em ${DS_B};margin:1.2em 0 .3em}h5{font:italic 500 .95em ${DS_B}}h6{font:700 .78em ${DS_B};text-transform:uppercase;letter-spacing:.08em;color:var(--t2)}
blockquote{margin:1.2em 0;padding:.3em 1em;border:0;border-inline-start:3px solid var(--dc);font-style:italic;color:var(--t2)}
blockquote p{margin:0 0 .3em}blockquote cite,blockquote footer{display:block;font:500 .78em ${DS_M};font-style:normal}
hr{border:0;border-top:1px solid var(--dv);margin:1.6em 0}
${flow}
${tables('band', DS_B)}
table{font-size:.88em}th,td{padding:.3em .6em}th{font-weight:600;letter-spacing:.03em}
${code(DS_M, 'bar', DS_B)}
${callout('bar', DS_B)}
${toc(DS_B)}
${props}`,
};

// Clinical Notes: concept tables first, with a bold first column and tinted header.
const CL_B = SANS('Source Sans 3');
const clinical = {
  id: 'clinical',
  name: 'Clinical Notes',
  description: 'Study and clinical notes: Source Sans 3, teal structure, concept tables with a bold first column and key-point call-outs.',
  use: ['Source Sans 3', 'Source Code Pro'],
  defaults: {
    typography: typo({ bodyFont: 'sans', headingFont: 'sans', fontSize: 15, lineHeight: 1.5, headingScale: 1.25, paragraphSpacing: 0.7 }),
    palette: palette({ background: '#ffffff', text: '#1f2d3a', heading: '#0f3d57', link: '#0b6aa2', accent: '#0e7c86', codeBackground: '#eef6f8', border: '#cfe0e6', textSecondary: '#4e6270', tableHeader: '#dff0f3', tableBorder: '#cfe0e6', calloutBackground: '#e6f4f1', divider: '#cfe0e6', decoration: '#0e7c86' }),
    columns: cols,
    page: page('A4', [20, 18, 20, 18], 80),
  },
  css: () => `body,.lv-doc{font-family:${CL_B};font-feature-settings:"kern","liga"}
${heads(CL_B)}
.lv-title{font-size:2.2em;font-weight:700;line-height:1.15;color:var(--hd);padding-inline-start:.4em;border-inline-start:6px solid var(--dc)}
.lv-meta{font:600 .8em ${CL_B};letter-spacing:.06em;color:var(--t2)}
h1{font-size:1.7em;font-weight:700;line-height:1.2;margin:1.8em 0 .6em;padding-bottom:.25em;border-bottom:2px solid var(--dc)}
h2{font-size:1.3em;font-weight:700;color:var(--ac);margin:1.6em 0 .45em}
h3{font:700 .85em ${CL_B};text-transform:uppercase;letter-spacing:.1em;color:var(--t2);margin:1.5em 0 .35em}
h4{font:700 1em ${CL_B};margin:1.2em 0 .3em}h5{font:italic 600 1em ${CL_B}}h6{font:700 .8em ${CL_B};text-transform:uppercase;letter-spacing:.08em;color:var(--t2)}
blockquote{margin:1.2em 0;padding:.4em 1em;border:0;border-inline-start:3px solid var(--dc);background:var(--co);color:var(--hd)}
blockquote p{margin:0 0 .3em}blockquote cite,blockquote footer{display:block;font-size:.82em;font-style:normal;color:var(--t2)}
hr{border:0;border-top:1px solid var(--dv);margin:1.8em 0}
${flow}
li{margin:.16em 0}
${tables('rules', CL_B)}
th{background:var(--th);color:var(--hd);border-bottom:2px solid var(--dc);font-size:.84em;text-transform:uppercase;letter-spacing:.06em}
tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--co) 55%,transparent)}
td:first-child{font-weight:600;color:var(--hd)}
${code(MONO('Source Code Pro'), 'bar', CL_B)}
${callout('bar', CL_B)}
${toc(CL_B)}
${props}`,
};

export const businessPack = [executive, whitepaper, proposal, datasheet, clinical];
