import { templateConfig } from '../../core/publish/templates/index.js';
import { FONT_CATALOG } from '../../core/publish/font-catalog.js';
import { getSetting } from '../../services/settings-client.js';
import { PALETTES as PDF_PALETTES } from '../../../../shared/export-config.js';

// Palettes derive from the app's Antique Gold tokens (accent, paper, link/code/key hues) without copying them 1:1; the other roles are mixed from the five anchors.
const num = (h) => parseInt(h.slice(1), 16);
const mix = (a, b, t) => `#${[16, 8, 0].map((s) => Math.round(((num(a) >> s) & 255) * (1 - t) + ((num(b) >> s) & 255) * t).toString(16).padStart(2, '0')).join('')}`;
const P = (scheme, background, text, heading, link, accent) => ({
  scheme, background, text, heading, link, accent,
  codeBackground: mix(background, text, 0.05), border: mix(background, text, 0.15), textSecondary: mix(text, background, 0.38),
  tableHeader: mix(background, text, 0.07), tableBorder: mix(background, text, 0.18), calloutBackground: mix(background, accent, 0.09),
  divider: mix(background, text, 0.15), decoration: accent,
});

export const HTML_PALETTE_GROUPS = [
  ['App Themes', [['app-light', 'Antique Gold', P('light', '#fbfaf6', '#292823', '#725b32', '#4f6f8a', '#876b3e')], ['app-dark', 'Antique Gold Dark', P('dark', '#201f1b', '#e8e4da', '#cbb280', '#8fb0cc', '#b39560')]]],
  ['Warm', [['antique', 'Antique', P('light', '#fbfaf6', '#292823', '#3a2f1a', '#476682', '#876b3e')], ['parchment', 'Parchment', P('light', '#f5eddc', '#33291b', '#4d3a17', '#8a4b1f', '#a0762f')],
    ['rosewood', 'Rosewood', P('light', '#fbf5f3', '#2b1f1e', '#5e2a26', '#8a3a34', '#a8693a')], ['clay', 'Clay', P('light', '#fbf4ee', '#2e2019', '#6e3318', '#9a4a22', '#b0642e')],
    ['sand', 'Sand', P('light', '#faf6ee', '#2d2819', '#5a4a22', '#7a5c28', '#b08a3e')], ['amber', 'Amber', P('light', '#fffaf0', '#2a2112', '#6b4300', '#9a5b00', '#c27a12')]]],
  ['Cool', [['ocean', 'Ocean', P('light', '#f5f9fc', '#1c2833', '#12395c', '#1f6fb2', '#2a8aa6')], ['indigo', 'Indigo', P('light', '#f7f7fc', '#22223a', '#2c2c6e', '#4a4ab0', '#7a62c4')],
    ['lavender', 'Lavender', P('light', '#f9f6fc', '#2a2233', '#46286e', '#6b3fa0', '#9a6fc0')], ['steel', 'Steel', P('light', '#f5f7f9', '#222a31', '#1f3340', '#35607e', '#6b7f8c')]]],
  ['Natural', [['moss', 'Moss', P('light', '#f7f8f1', '#262a1e', '#38461f', '#4f6b2e', '#876b3e')], ['sage', 'Sage', P('light', '#f3f7f2', '#1f2a22', '#274535', '#3b6a52', '#8a7240')],
    ['mist', 'Mist', P('light', '#f4f8f8', '#1f2e2e', '#274a50', '#39707a', '#876b3e')], ['harbour', 'Harbour', P('light', '#f6f8fb', '#1f2a33', '#1f3b52', '#3a6590', '#8a6d3b')]]],
  ['Neutral', [['paper', 'Paper', P('light', '#ffffff', '#1f1f1d', '#111111', '#2f5d8a', '#876b3e')], ['graphite', 'Graphite', P('light', '#fafafa', '#262626', '#151515', '#3a3a3a', '#6b6b6b')]]],
  ['Dark', [['antique-night', 'Antique Night', P('dark', '#201f1b', '#e8e4da', '#f3eee0', '#8fb0cc', '#c9ae7c')], ['walnut', 'Walnut', P('dark', '#1b1612', '#e6ddd0', '#f4e8d2', '#d2a66a', '#b08a52')],
    ['deep-sea', 'Deep Sea', P('dark', '#0f1a24', '#d7e2ea', '#eef5fa', '#8fb8d6', '#d2b27a')], ['forest-night', 'Forest Night', P('dark', '#141a15', '#dce3d4', '#eef3e6', '#a5b887', '#cbb280')],
    ['charcoal', 'Charcoal', P('dark', '#1b1b1d', '#dadada', '#f5f5f5', '#9db7d5', '#b8a27a')],
    ['plum-night', 'Plum Night', P('dark', '#1c1620', '#e4dce8', '#f3ecf7', '#c5a3e0', '#d2a66a')], ['ink-blue', 'Ink Blue', P('dark', '#10151f', '#d8dfeb', '#eef2fa', '#8fb0e6', '#d2b27a')]]],
  ['Studio (PDF)', Object.entries(PDF_PALETTES).map(([k, v]) => [`pdf-${k}`, k.charAt(0).toUpperCase() + k.slice(1), v])],
];
export const HTML_PALETTES = Object.fromEntries(HTML_PALETTE_GROUPS.flatMap(([, l]) => l.map(([id, , p]) => [id, p])));

const SKIP = new Set(['Amiri', 'Cairo', 'Tajawal', 'Noto Sans Arabic', 'Scheherazade New', 'Cinzel', 'OpenDyslexic', 'Oswald']);
export const HTML_FONTS = [['Serif', 'serif'], ['Sans-serif', 'sans']].map(([label, kind]) => [label, FONT_CATALOG.filter((f) => f.kind === kind && !SKIP.has(f.name)).map((f) => f.name)]);
const FONT_NAMES = new Set(HTML_FONTS.flatMap(([, l]) => l));

export const HTML_MEASURES = [['Narrow', 60], ['Standard', 72], ['Wide', 92]];

export function htmlDefaults() {
  const pick = (v, ok, d) => (ok(v) ? v : d);
  return {
    palette: pick(getSetting('export.htmlPalette'), (v) => v in HTML_PALETTES, 'antique'),
    headingFont: pick(getSetting('export.htmlHeadingFont'), (v) => FONT_NAMES.has(v), 'Lora'),
    bodyFont: pick(getSetting('export.htmlBodyFont'), (v) => FONT_NAMES.has(v), 'Source Sans 3'),
    measure: 72,
    watermark: getSetting('export.htmlWatermark') !== false,
  };
}

export function htmlConfig(o = htmlDefaults()) {
  const c = templateConfig('article').config, r = c.typography.roles;
  return {
    ...c,
    typography: { ...c.typography, fontSize: 17, lineHeight: 1.7, headingScale: 1.25, paragraphSpacing: 1, roles: { ...r, body: { ...r.body, font: o.bodyFont }, heading: { ...r.heading, font: o.headingFont }, title: { ...r.title, font: o.headingFont } } },
    palette: { ...c.palette, preset: 'custom', ...HTML_PALETTES[o.palette], prefersColorScheme: false },
    page: { ...c.page, maxWidth: o.measure },
    structure: { ...c.structure, cover: false, toc: false, tocPlacement: 'none', tocDepth: 3, tocLeader: 'none', tocPageNumbers: false, tocLinks: true, tocIndent: true },
    html: { ...c.html, studio: true, standalone: true, toc: 'none', headingAnchors: false, prefersColorScheme: false, watermark: o.watermark },
  };
}
