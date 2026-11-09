// Pure table operations: (model, ...) -> new model.
export const cols = (m) => m.header.length;
const mv = (a, f, t) => { const b = a.slice(), [x] = b.splice(f, 1); b.splice(t, 0, x); return b; };
const ins = (a, i, v) => [...a.slice(0, i), v, ...a.slice(i)];
const del = (a, i) => a.filter((_, j) => j !== i);
const clamp = (i, n) => Math.max(0, Math.min(n, i));

export function normalise(m) {
  const n = Math.max(1, m.header.length, m.align.length, ...m.rows.map((r) => r.length));
  const p = (a, f) => Array.from({ length: n }, (_, i) => a[i] ?? f);
  const t = (c) => String(c).trim();
  return { ...m, header: p(m.header, '').map(t), align: p(m.align, null), rows: m.rows.map((r) => p(r, '').map(t)) };
}

export const addRow = (m, at = m.rows.length) => ({ ...m, rows: ins(m.rows, clamp(at, m.rows.length), Array(cols(m)).fill('')) });
export const removeRow = (m, i) => ({ ...m, rows: del(m.rows, i) });
export const moveRow = (m, f, t) => ({ ...m, rows: mv(m.rows, f, clamp(t, m.rows.length - 1)) });
export const addCol = (m, at = cols(m), a = null) => {
  const i = clamp(at, cols(m));
  return { ...m, header: ins(m.header, i, ''), align: ins(m.align, i, a), rows: m.rows.map((r) => ins(r, i, '')) };
};
export const removeCol = (m, i) => (cols(m) < 2 ? m : { ...m, header: del(m.header, i), align: del(m.align, i), rows: m.rows.map((r) => del(r, i)) });
export const moveCol = (m, f, t) => {
  t = clamp(t, cols(m) - 1);
  return { ...m, header: mv(m.header, f, t), align: mv(m.align, f, t), rows: m.rows.map((r) => mv(r, f, t)) };
};
export const setAlign = (m, i, a) => ({ ...m, align: m.align.map((x, j) => (j === i ? a || null : x)) });

export const isHeaderless = (m) => m.header.every((c) => c === '');
export function toggleHeader(m) {
  if (!isHeaderless(m)) return { ...m, header: m.header.map(() => ''), rows: [m.header, ...m.rows] };
  return m.rows.length ? { ...m, header: m.rows[0], rows: m.rows.slice(1) } : m;
}

const num = (s) => (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s.replace(/[,\s]/g, '')) ? parseFloat(s.replace(/[,\s]/g, '')) : NaN);
export function sortBy(m, i, dir = 'asc') {
  const k = dir === 'desc' ? -1 : 1;
  const cmp = (a, b) => {
    const x = a[i] ?? '', y = b[i] ?? '';
    if (!x || !y) return !x && !y ? 0 : !x ? 1 : -1;
    const p = num(x), q = num(y);
    return k * (isNaN(p) || isNaN(q) ? x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) : p - q);
  };
  const rows = m.rows.map((r, j) => [r, j]).sort((a, b) => cmp(a[0], b[0]) || a[1] - b[1]).map((x) => x[0]);
  return { ...m, rows };
}
