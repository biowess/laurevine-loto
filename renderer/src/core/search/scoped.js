import { findAll } from './text-search.js';

export const SCOPES = ['content', 'frontmatter', 'code'];
const LINE = 300;

// 0 content, 1 frontmatter, 2 code (fenced), per line
export function kinds(lines) {
  const k = new Array(lines.length).fill(0);
  let i = 0, fence = null;
  if (/^---\s*$/.test(lines[0])) {
    let j = 1;
    while (j < lines.length && !/^(---|\.\.\.)\s*$/.test(lines[j])) j++;
    if (j < lines.length) { k.fill(1, 0, j + 1); i = j + 1; }
  }
  for (; i < lines.length; i++) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(lines[i]);
    if (fence) {
      k[i] = 2;
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(lines[i])) fence = null;
    } else if (m) { fence = m[1]; k[i] = 2; }
  }
  return k;
}

const snip = (s, from, to) => {
  if (s.length <= LINE) return { text: s, from, to };
  const a = Math.max(0, from - 80);
  return { text: s.slice(a, a + LINE), from: from - a, to: Math.min(to - a, LINE) };
};

// Matches of `text` in the scopes of Set `sc` (content, frontmatter, code are disjoint by line; a match belongs to its first line).
// items: [{ scope, line (1-based), col, len, text (window of the line), from, to }]
export function scopedMatches(text, opts, sc, max) {
  const { matches, error, truncated } = findAll(text, opts, { limit: max + 1 });
  if (error || !matches.length) return { items: [], error };
  const starts = [0];
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  const lines = text.split('\n'), k = kinds(lines), items = [];
  for (const m of matches) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= m.from) lo = mid; else hi = mid - 1; }
    const scope = SCOPES[k[lo]];
    if (!sc.has(scope)) continue;
    const line = lines[lo].replace(/\r$/, ''), col = m.from - starts[lo], end = Math.min(m.to - starts[lo], line.length);
    items.push({ scope, line: lo + 1, col, len: end - col, ...snip(line, col, end) });
  }
  return { items, truncated: !!truncated };
}
