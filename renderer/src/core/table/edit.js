// Pure: blank table insertion, cell spans / caret cell lookup, contextual table actions (model -> {m,row,col}|null), TSV export.
import { serializeTable } from './serialize.js';
import * as T from './ops.js';

export const MAX = { rows: 100, cols: 30 };
export function sizeError(rows, cols) {
  const ok = (n, max) => Number.isInteger(n) && n >= 1 && n <= max;
  if (!ok(rows, MAX.rows)) return `Rows must be a whole number from 1 to ${MAX.rows}`;
  return ok(cols, MAX.cols) ? '' : `Columns must be a whole number from 1 to ${MAX.cols}`;
}
export const blank = (rows, cols) => ({ header: Array(cols).fill(''), align: Array(cols).fill(null), rows: Array.from({ length: rows - 1 }, () => Array(cols).fill('')) });

// rows counts the header row. Returns { changes, caret } with blank-line separation; caret sits in the first header cell.
export function insertTable(doc, pos, rows, cols) {
  const before = doc.slice(0, pos), after = doc.slice(pos);
  const lead = pos ? '\n'.repeat(Math.max(0, 2 - before.match(/\n*$/)[0].length)) : '';
  const trail = after ? '\n'.repeat(Math.max(0, 2 - after.match(/^\n*/)[0].length)) : '\n';
  return { changes: { from: pos, to: pos, insert: lead + serializeTable(blank(rows, cols)) + trail }, caret: pos + lead.length + 2 };
}

function bars(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') i++;
    else if (c === '`') {
      let n = 1;
      while (s[i + n] === '`') n++;
      let j = i + n, end = -1;
      while ((j = s.indexOf('`'.repeat(n), j)) !== -1) {
        let m = n;
        while (s[j + m] === '`') m++;
        if (m === n) { end = j; break; }
        j += m;
      }
      i = end < 0 ? i + n - 1 : end + n - 1;
    } else if (c === '|') out.push(i);
  }
  return out;
}

// [{a,z,from,to}] per cell: a..z is the slot between pipes, from..to the trimmed content (empty cell: one space in).
export function cellSpans(line) {
  const b = bars(line), segs = [];
  let p = -1;
  for (const i of b) { segs.push([p + 1, i]); p = i; }
  segs.push([p + 1, line.length]);
  if (b.length && !line.slice(0, b[0]).trim()) segs.shift();
  if (b.length && !line.slice(b[b.length - 1] + 1).trim()) segs.pop();
  return segs.map(([a, z]) => {
    const t = line.slice(a, z);
    if (!t.trim()) { const q = Math.min(a + 1, z); return { a, z, from: q, to: q }; }
    return { a, z, from: a + t.length - t.trimStart().length, to: a + t.trimEnd().length };
  });
}

const lineBounds = (doc, pos) => {
  const s = pos ? doc.lastIndexOf('\n', pos - 1) + 1 : 0, e = doc.indexOf('\n', pos);
  return [s, e < 0 ? doc.length : e];
};

// Cell under pos: row -1 = header (or delimiter line), 0.. = body rows.
export function cellAt(doc, m, pos) {
  const [s, e] = lineBounds(doc, pos), li = doc.slice(m.range.from, s).split('\n').length - 1;
  const sp = cellSpans(doc.slice(s, e)), i = sp.findIndex((x) => pos - s <= x.z);
  return { row: li < 2 ? -1 : li - 2, col: Math.max(0, Math.min(m.header.length - 1, i < 0 ? sp.length - 1 : i)) };
}

// Absolute [from,to] of a cell's content inside serialized table text starting at `from`.
export function cellRange(text, from, row, col) {
  const ls = text.split('\n'), li = row < 0 ? 0 : row + 2, sp = cellSpans(ls[li]), x = sp[Math.min(col, sp.length - 1)];
  const o = from + ls.slice(0, li).reduce((n, l) => n + l.length + 1, 0);
  return [o + x.from, o + x.to];
}

// Next/previous cell (d = +1/-1); add = target row does not exist yet.
export function step(m, row, col, d) {
  const n = m.header.length;
  let c = col + d, r = row;
  if (c >= n) { c = 0; r++; } else if (c < 0) { c = n - 1; r--; }
  return r < -1 ? null : { row: r, col: c, add: r >= m.rows.length };
}

const al = (a) => (m, r, c) => ({ m: T.setAlign(m, c, a), row: r, col: c });
const srt = (d) => (m, r, c) => (m.rows.length < 2 ? null : { m: T.sortBy(m, c, d), row: r, col: c });
export const PLAN = {
  'row-above': (m, r, c) => (r < 0 ? null : { m: T.addRow(m, r), row: r, col: c }),
  'row-below': (m, r, c) => ({ m: T.addRow(m, r + 1), row: r + 1, col: c }),
  'col-left': (m, r, c) => ({ m: T.addCol(m, c), row: r, col: c }),
  'col-right': (m, r, c) => ({ m: T.addCol(m, c + 1), row: r, col: c + 1 }),
  'del-row': (m, r, c) => (r < 0 ? null : { m: T.removeRow(m, r), row: Math.min(r, m.rows.length - 2), col: c }),
  'del-col': (m, r, c) => (m.header.length < 2 ? null : { m: T.removeCol(m, c), row: r, col: Math.min(c, m.header.length - 2) }),
  'row-up': (m, r, c) => (r < 1 ? null : { m: T.moveRow(m, r, r - 1), row: r - 1, col: c }),
  'row-down': (m, r, c) => (r < 0 || r >= m.rows.length - 1 ? null : { m: T.moveRow(m, r, r + 1), row: r + 1, col: c }),
  'col-move-left': (m, r, c) => (c < 1 ? null : { m: T.moveCol(m, c, c - 1), row: r, col: c - 1 }),
  'col-move-right': (m, r, c) => (c >= m.header.length - 1 ? null : { m: T.moveCol(m, c, c + 1), row: r, col: c + 1 }),
  'align-left': al('left'), 'align-center': al('center'), 'align-right': al('right'),
  header: (m, r, c) => {
    const h = T.isHeaderless(m);
    return h && !m.rows.length ? null : { m: T.toggleHeader(m), row: h ? (r <= 0 ? -1 : r - 1) : (r < 0 ? 0 : r + 1), col: c };
  },
  'sort-asc': srt('asc'), 'sort-desc': srt('desc'),
  format: (m, r, c) => ({ m: T.normalise(m), row: r, col: c }),
};

export const toTSV = (m) => [...(T.isHeaderless(m) ? [] : [m.header]), ...m.rows].map((r) => r.map((c) => c.replace(/\s*\n\s*/g, ' ').replace(/\t/g, ' ')).join('\t')).join('\n');
