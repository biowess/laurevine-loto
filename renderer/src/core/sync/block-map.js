// Pure: ordered `{startLine,endLine,top,height}` blocks (1-based inclusive lines, px offsets) and line <-> offset mapping.

export function buildBlockMap(root) {
  const base = root.getBoundingClientRect().top - root.scrollTop;
  const map = [];
  for (const el of root.querySelectorAll('[data-src-line]')) {
    if (el.parentElement && el.parentElement.closest('[data-src-line]')) continue;
    const startLine = Number(el.dataset.srcLine), endLine = Number(el.dataset.srcEnd);
    if (!(startLine >= 1) || !(endLine >= startLine)) continue;
    const r = el.getBoundingClientRect();
    map.push({ startLine, endLine, top: r.top - base, height: r.height });
  }
  return map.sort((a, b) => a.startLine - b.startLine);
}

const last = (map, key, v) => {
  let lo = 0, hi = map.length - 1, r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (map[m][key] <= v) { r = m; lo = m + 1; } else hi = m - 1;
  }
  return r;
};
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (v, a, b) => (b > a ? Math.min(1, Math.max(0, (v - a) / (b - a))) : 0);

export function lineToOffset(map, line) {
  if (!map.length) return 0;
  const i = last(map, 'startLine', line), n = map[i + 1];
  if (i < 0) return lerp(0, map[0].top, frac(line, 1, map[0].startLine));
  const b = map[i], end = b.endLine + 1;
  if (line < end) return lerp(b.top, b.top + b.height, frac(line, b.startLine, end));
  const bottom = b.top + b.height;
  return n ? lerp(bottom, n.top, frac(line, end, n.startLine)) : bottom;
}

export function offsetToLine(map, offset) {
  if (!map.length) return 1;
  const i = last(map, 'top', offset), n = map[i + 1];
  if (i < 0) return lerp(1, map[0].startLine, frac(offset, 0, map[0].top));
  const b = map[i], bottom = b.top + b.height, end = b.endLine + 1;
  if (offset < bottom) return lerp(b.startLine, end, frac(offset, b.top, bottom));
  return n ? lerp(end, n.startLine, frac(offset, bottom, n.top)) : end;
}
