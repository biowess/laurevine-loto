// Pure WCAG contrast helpers. Colours are [r,g,b,a] (0-255, alpha 0-1).
const num = (v, max) => (/%$/.test(v) ? (parseFloat(v) / 100) * max : parseFloat(v));

export function parseColor(s) {
  if (Array.isArray(s)) return s;
  s = String(s ?? '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const p = (i) => parseInt(h.slice(i, i + 2), 16);
    return [p(0), p(2), p(4), h.length === 8 ? p(6) / 255 : 1];
  }
  m = /^(rgba?|color\(srgb)\s*\(?\s*([^)]+)\)/.exec(s);
  if (!m) return null;
  const f = m[1] === 'color(srgb' ? 255 : 1, v = m[2].split(/[\s,/]+/).filter(Boolean);
  if (v.length < 3) return null;
  const c = v.slice(0, 3).map((x) => (f === 255 ? (/%$/.test(x) ? num(x, 1) : parseFloat(x)) * 255 : num(x, 255)));
  const a = v[3] == null ? 1 : num(v[3], 1);
  return c.concat(a).some(Number.isNaN) ? null : [...c, a];
}

export const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);

const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

export function ratio(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// pairs: [{ name, mode, fg, bg, large? }] -> same plus { ratio, need, pass } (pass null when a colour cannot be parsed).
export function checkPairs(pairs) {
  return pairs.map((p) => {
    const fg = parseColor(p.fg), bg = parseColor(p.bg);
    if (!fg || !bg) return { ...p, ratio: null, need: p.large ? 3 : 4.5, pass: null };
    const r = ratio(fg[3] < 1 ? blend(fg, bg) : fg, bg), need = p.large ? 3 : 4.5;
    return { ...p, ratio: Math.floor(r * 100) / 100, need, pass: r >= need };
  });
}
