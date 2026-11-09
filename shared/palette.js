// Palette roles, hex normalisation and file format for custom palettes. Pure.
import { PALETTES } from './export-config.js';

export const ROLES = [['background', 'Page background'], ['text', 'Main text'], ['textSecondary', 'Secondary text'], ['heading', 'Headings'], ['accent', 'Accent'], ['link', 'Links'],
  ['tableHeader', 'Table headers'], ['tableBorder', 'Table borders'], ['calloutBackground', 'Callout backgrounds'], ['divider', 'Dividers'], ['codeBackground', 'Code backgrounds'], ['decoration', 'Page decorations']];
export const COLOR_KEYS = Object.keys(PALETTES.paper).filter((k) => k !== 'scheme');

export const normHex = (s) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s ?? '').trim());
  return m ? `#${(m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]).toLowerCase()}` : null;
};

export function cleanPalette(p) {
  if (!p || typeof p !== 'object' || !['light', 'dark'].includes(p.scheme)) return null;
  const out = { scheme: p.scheme };
  for (const k of COLOR_KEYS) { const v = normHex(p[k]); if (!v) return null; out[k] = v; }
  return out;
}

export const parsePaletteFile = (text) => {
  try { const j = JSON.parse(text); return cleanPalette(j && j.palette ? j.palette : j); } catch { return null; }
};
export const paletteFile = (palette) => JSON.stringify({ format: 'laurevine-palette', version: 1, palette }, null, 2);
