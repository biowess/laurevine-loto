import { classify } from './blocks.js';

const WHOLE = new Set(['fm', 'code', 'math', 'html', 'comment', 'table']);

// Selection offsets -> { from, to } covering whole lines, widened to whole multi-line blocks.
// Returns null when the extracted lines would classify differently on their own (context-dependent).
export function scopeRange(text, selFrom, selTo) {
  const { lines, kinds, blocks } = classify(text);
  const starts = [];
  let off = 0;
  for (const l of lines) { starts.push(off); off += l.length + 1; }
  const lineAt = (pos) => {
    let lo = 0, hi = lines.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
  const blockAt = (i) => blocks.find((b) => b.a <= i && i <= b.b);
  let a = lineAt(selFrom), z = selTo > selFrom ? lineAt(selTo - 1) : a;
  const first = blockAt(a), last = blockAt(z);
  if (first && WHOLE.has(first.k)) a = first.a;
  if (last && WHOLE.has(last.k)) z = last.b;
  const own = classify(lines.slice(a, z + 1).join('\n')).kinds;
  for (let i = 0; i < own.length; i++) if (own[i] !== kinds[a + i]) return null;
  return { from: starts[a], to: starts[z] + lines[z].length };
}
