// Pure: model -> aligned GFM; findTableAt(doc,pos) -> model | null.
import { displayWidth } from './width.js';
import { isDelimiter, parseTable } from './parse.js';

const esc = (c) => c.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const fit = (t, w, a) => {
  const g = w - displayWidth(t);
  return a === 'right' ? ' '.repeat(g) + t : a === 'center' ? ' '.repeat(g >> 1) + t + ' '.repeat(g - (g >> 1)) : t + ' '.repeat(g);
};

export function serializeTable(m, { pad = true } = {}) {
  const head = m.header.map(esc), body = m.rows.map((r) => r.map(esc));
  const w = head.map((h, i) => (pad ? Math.max(3, displayWidth(h), ...body.map((r) => displayWidth(r[i] ?? ''))) : 3));
  const cell = (t, i) => (pad ? fit(t, w[i], m.align[i]) : t);
  const line = (r) => `| ${r.map(cell).join(' | ')} |`;
  const dash = m.align.map((a, i) => {
    const l = a === 'left' || a === 'center' ? ':' : '', r = a === 'right' || a === 'center' ? ':' : '';
    return l + '-'.repeat(w[i] - l.length - r.length) + r;
  });
  return [line(head), `| ${dash.join(' | ')} |`, ...body.map(line)].join('\n');
}

const isRow = (l) => l.trim() !== '' && l.includes('|');

export function findTableAt(doc, pos) {
  const lines = doc.split('\n'), starts = [];
  let o = 0, li = -1, fence = false;
  lines.forEach((l, i) => { starts.push(o); if (li < 0 && pos <= o + l.length) li = i; o += l.length + 1; });
  if (li < 0) return null;
  for (let i = 0; i <= li; i++) if (/^\s*(```|~~~)/.test(lines[i])) fence = !fence;
  if (fence || !isRow(lines[li])) return null;
  let s = li, e = li;
  while (s > 0 && isRow(lines[s - 1])) s--;
  while (e + 1 < lines.length && isRow(lines[e + 1])) e++;
  for (let k = s + 1; k <= e; k++) {
    if (isDelimiter(lines[k]) && li >= k - 1) {
      const from = starts[k - 1], to = starts[e] + lines[e].length;
      return parseTable(doc.slice(from, to), from);
    }
  }
  return null;
}
