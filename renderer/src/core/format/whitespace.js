import { classify, splitKeep, joinKeep, trimEnd, lead, cols, ATX, FENCE } from './blocks.js';

const parse = (text) => {
  const src = String(text ?? ''), { lines, terms } = splitKeep(src);
  return { src, lines, terms, ...classify(lines.join('\n')) };
};
const unchanged = (src) => ({ text: src, changed: false, count: 0 });

export function normalizeLineEndings(text, eol = 'lf') {
  const src = String(text ?? ''), want = String(eol).toLowerCase() === 'crlf' ? '\r\n' : '\n';
  const count = (src.match(/\r\n|\r|\n/g) || []).filter((x) => x !== want).length;
  return count ? { text: src.replace(/\r\n|\r|\n/g, want), changed: true, count } : unchanged(src);
}

export function removeTrailingWhitespace(text, { keepHardBreaks = true, includeCode = false } = {}) {
  const { src, lines, terms, kinds } = parse(text);
  let count = 0;
  const out = lines.map((s, i) => {
    if (kinds[i] === 'fm' || (kinds[i] === 'code' && !includeCode)) return s;
    const t = trimEnd(s, keepHardBreaks && kinds[i] === 'text' && kinds[i + 1] === 'text' && !ATX.test(s));
    if (t !== s) count++;
    return t;
  });
  return count ? { text: joinKeep(out, terms), changed: true, count } : unchanged(src);
}

export function normalizeIndentation(text, { style = 'spaces', size = 4, includeCode = false } = {}) {
  const { src, lines, terms, blocks } = parse(text), ts = Math.max(1, Math.min(8, Math.floor(size) || 4));
  const out = lines.slice();
  let count = 0;
  const conv = (i) => {
    const s = lines[i], m = lead(s);
    if (!m || !s.trim()) return;
    const c = cols(m, ts), n = style === 'tabs' ? '\t'.repeat(Math.floor(c / ts)) + ' '.repeat(c % ts) : ' '.repeat(c);
    if (n !== m) { out[i] = n + s.slice(m.length); count++; }
  };
  for (const b of blocks) {
    if (b.k === 'text' || b.k === 'table' || (b.k === 'code' && includeCode)) for (let i = b.a; i <= b.b; i++) conv(i);
    else if (b.k === 'code' && b.sub === 'fence') {
      conv(b.a);
      if (b.b > b.a && FENCE.test(lines[b.b])) conv(b.b);
    }
  }
  return count ? { text: joinKeep(out, terms), changed: true, count } : unchanged(src);
}

export function cleanEmptyHeadings(text) {
  const { src, lines, terms, blocks } = parse(text), drop = new Set(), blank = new Set(), removed = [];
  const empty = (i) => i < 0 || i >= lines.length || !lines[i].trim() || drop.has(i);
  for (const b of blocks) {
    const m = b.k === 'text' && ATX.exec(lines[b.a]);
    if (!m || (m[2] || '').trim()) continue;
    removed.push(b.a + 1);
    const before = empty(b.a - 1), after = empty(b.a + 1);
    if (!before && !after) blank.add(b.a);
    else {
      drop.add(b.a);
      if (before && after && b.a + 1 < lines.length) drop.add(b.a + 1);
    }
  }
  if (!removed.length) return { ...unchanged(src), lines: [] };
  const keep = lines.map((_, i) => i).filter((i) => !drop.has(i));
  const text2 = joinKeep(keep.map((i) => (blank.has(i) ? '' : lines[i])), keep.map((i) => terms[i] ?? ''));
  return { text: text2, changed: text2 !== src, count: removed.length, lines: removed };
}
