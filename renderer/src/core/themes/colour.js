const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FN = /^(rgba?|hsla?)\(\s*([0-9.%,\s/]+?)\s*\)$/i;
const NUM = /^\d{1,3}(?:\.\d{1,3})?%?$/;

const unit = (s, scale) => {
  if (!NUM.test(s)) return NaN;
  const n = parseFloat(s);
  return s.endsWith('%') ? (n / 100) * scale : n;
};

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export function parseColour(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const v = value.trim();
  if (HEX.test(v)) {
    let x = v.slice(1);
    if (x.length <= 4) x = [...x].map((c) => c + c).join('');
    const n = (i) => parseInt(x.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: x.length === 8 ? n(6) / 255 : 1 };
  }
  const m = FN.exec(v);
  if (!m) return null;
  const parts = m[2].replace(/\s*\/\s*/g, ' ').split(/\s*,\s*|\s+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const a = parts.length === 4 ? unit(parts[3], 1) : 1;
  if (!(a >= 0 && a <= 1)) return null;
  let rgb;
  if (m[1].toLowerCase().startsWith('rgb')) {
    rgb = parts.slice(0, 3).map((p) => unit(p, 255));
  } else {
    const hue = parts[0].endsWith('%') ? NaN : unit(parts[0], 360), s = unit(parts[1], 1), l = unit(parts[2], 1);
    if (!parts[1].endsWith('%') || !parts[2].endsWith('%') || !(hue >= 0 && hue <= 360) || !(s <= 1) || !(l <= 1)) return null;
    rgb = hslToRgb(hue, s, l);
  }
  if (!rgb.every((c) => c >= 0 && c <= 255)) return null;
  return { r: rgb[0], g: rgb[1], b: rgb[2], a };
}

export function toHex(value) {
  const c = parseColour(value);
  return c ? `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}` : '#000000';
}

const lin = (x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

export function contrastRatio(fg, bg) {
  const f = parseColour(fg), b = parseColour(bg);
  if (!f || !b) return null;
  const mix = { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a) };
  const [hi, lo] = [lum(mix), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
