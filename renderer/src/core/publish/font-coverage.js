const LAT = [[0x20, 0x7e], [0xa0, 0x24f], [0x2c6, 0x2dd], [0x1e00, 0x1eff], [0x2010, 0x2027], [0x2030, 0x205e], [0x20a0, 0x20bf], [0x2122, 0x2122], [0x2190, 0x2193], [0x2212, 0x2212]];
const GRC = [[0x370, 0x3ff]], CYR = [[0x400, 0x4ff]];
const ARB = [[0x20, 0x40], [0x600, 0x6ff], [0x750, 0x77f], [0x8a0, 0x8ff], [0xfb50, 0xfdff], [0xfe70, 0xfeff]];

// Unicode ranges (code points) covered by each bundled family.
export const COVERAGE = Object.freeze({
  'Amiri': [...LAT, ...ARB],
  'Arimo': [...LAT, ...GRC, ...CYR],
  'Cairo': [...LAT, ...ARB],
  'Cinzel': LAT,
  'EB Garamond': [...LAT, ...GRC, ...CYR],
  'Fira Code': [...LAT, ...GRC, ...CYR],
  'Fira Sans': [...LAT, ...GRC, ...CYR],
  'Inter': [...LAT, ...GRC, ...CYR],
  'JetBrains Mono': [...LAT, ...GRC, ...CYR],
  'Lora': [...LAT, ...CYR],
  'Merriweather': [...LAT, ...CYR],
  'Montserrat': [...LAT, ...CYR],
  'Noto Sans Arabic': ARB,
  'Open Sans': [...LAT, ...GRC, ...CYR],
  'Outfit': LAT,
  'Plus Jakarta Sans': LAT,
  'PT Serif': [...LAT, ...CYR],
  'Roboto': [...LAT, ...GRC, ...CYR],
  'Scheherazade New': [...LAT, ...ARB],
  'Source Code Pro': [...LAT, ...CYR],
  'Source Sans 3': [...LAT, ...GRC, ...CYR],
  'Space Grotesk': LAT,
  'Spline Sans': LAT,
  'Tajawal': [...LAT, ...ARB],
});

// Predicate over code points for a bundled family, or null when its coverage is unknown.
export const fontCoverage = (name) => {
  const r = COVERAGE[name];
  return r ? (cp) => r.some(([a, b]) => cp >= a && cp <= b) : null;
};

// Distinct visible characters of `text` for which has(codePoint) is false (spaces, controls and combining marks are ignored).
export function missingChars(text, has) {
  const seen = new Set(), out = [];
  for (const ch of String(text)) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    if (!/[\p{Z}\p{C}\p{M}]/u.test(ch) && !has(ch.codePointAt(0))) out.push(ch);
  }
  return out;
}
