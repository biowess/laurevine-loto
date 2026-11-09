// Pure-ish: delimited text / HTML table -> table model, delimiter detection, blank-line block placement, Table Templates.
import { sanitize } from '../markdown/sanitize.js';
import { splitRow, isDelimiter } from './parse.js';
import { cleanCell } from './grid.js';
import { MAX } from './edit.js';

export const DELIMS = [['\t', 'Tab'], [',', 'Comma'], [';', 'Semicolon'], ['|', 'Pipe'], [' ', 'Multiple spaces']];
const nl = (t) => t.replace(/\r\n?/g, '\n');

// Rows of cells; comma/semicolon/tab follow CSV quoting (quotes, doubled quotes, newlines inside quotes).
export function parseDelimited(text, d) {
  text = nl(text);
  if (d === '|') return text.split('\n').filter((l) => l.trim() && !isDelimiter(l)).map(splitRow);
  if (d === ' ') return text.split('\n').filter((l) => l.trim()).map((l) => l.trim().split(/ {2,}|\t/));
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c !== '"') cur += c; else if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
    else if (c === '"' && !cur) q = true;
    else if (c === d) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  rows.push([...row, cur]);
  while (rows.length && rows[rows.length - 1].every((c) => !c.trim())) rows.pop();
  return rows;
}

// First delimiter (in `only` order) giving >= 2 columns on at least 80% of the first 50 rows; the best share wins.
export function detect(text, only = DELIMS.map((d) => d[0])) {
  let best = null;
  for (const d of only) {
    const n = parseDelimited(text, d).slice(0, 50).map((r) => r.length), mode = [...n].sort((a, b) => n.filter((x) => x === b).length - n.filter((x) => x === a).length)[0];
    const frac = n.length ? n.filter((x) => x === mode).length / n.length : 0;
    if (mode >= 2 && frac >= 0.8 && (!best || frac > best.frac)) best = { d, frac };
  }
  return best && best.d;
}

// Backtick runs without a matching run in the same cell are escaped so they cannot pair across cells.
const ticks = (s) => {
  const r = [...s.matchAll(/`+/g)];
  let o = '', at = 0;
  for (let i = 0; i < r.length; i++) {
    const k = r.findIndex((x, j) => j > i && x[0].length === r[i][0].length);
    if (k < 0) { o += s.slice(at, r[i].index) + r[i][0].replace(/`/g, '\\`'); at = r[i].index + r[i][0].length; } else i = k;
  }
  return o + s.slice(at);
};

// Cells keep literal text (pipes and newlines are escaped by serializeTable). header=false -> empty header row.
export function toModel(rows, header = true) {
  const n = Math.max(1, ...rows.map((r) => r.length)), cell = (c) => ticks(cleanCell(c ?? '').replace(/\t/g, ' '));
  const all = rows.map((r) => Array.from({ length: n }, (_, i) => cell(r[i])));
  return { header: header ? all[0] : Array(n).fill(''), align: Array(n).fill(null), rows: header ? all.slice(1) : all };
}

// Clipboard HTML holding only one table (Excel, Sheets, Word) -> rows, else null.
export function htmlRows(html) {
  const doc = new DOMParser().parseFromString(sanitize(html), 'text/html'), t = doc.querySelector('table');
  if (!t || t.querySelector('table') || doc.body.textContent.replace(t.textContent, '').trim()) return null;
  const txt = (c) => {
    c.querySelectorAll('br').forEach((b) => b.replaceWith('\u0001'));
    c.querySelectorAll('p,div,li').forEach((b) => b.append('\u0001'));
    return c.textContent.replace(/\s+/g, ' ').replace(/ ?\u0001 ?/g, '\n').replace(/\n{2,}/g, '\n');
  };
  return [...t.rows].map((tr) => [...tr.cells].flatMap((c) => [txt(c), ...Array(Math.max(0, Math.min((c.colSpan || 1) - 1, MAX.cols))).fill('')]));
}

// Replace doc[from,to] with a table block separated from its neighbours by blank lines; caret lands after the table.
export function place(doc, from, to, md) {
  const b = doc.slice(0, from), a = doc.slice(to);
  const lead = from ? '\n'.repeat(Math.max(0, 2 - b.match(/\n*$/)[0].length)) : '';
  const trail = a ? '\n'.repeat(Math.max(0, 2 - a.match(/^\n*/)[0].length)) : '\n';
  return { changes: { from, to, insert: lead + md + trail }, caret: from + lead.length + md.length };
}

const tpl = (header, rows) => ({ header, align: header.map(() => null), rows });
export const TEMPLATES = [
  ['comparison', 'Simple Comparison', tpl(['Feature', 'Option A', 'Option B'], [['Cost', '', ''], ['Speed', '', ''], ['Support', '', '']])],
  ['schedule', 'Schedule', tpl(['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['09:00', '11:00', '14:00', '16:00'].map((t) => [t, '', '', '', '', '']))],
  ['key-value', 'Key-Value', tpl(['Key', 'Value'], [['Name', ''], ['Date', ''], ['Status', ''], ['Owner', '']])],
];
