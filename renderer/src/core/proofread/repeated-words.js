// Pure: consecutive repeated words ("the the", "The\nthe"; case-insensitive, across one line break, never across blank lines or list items).
// Code, frontmatter, URLs, tags, headings and tables are ignored. findRepeated(text) -> [{ word, from, to, fix: { from, to } }]
// from/to = the second word; fix = whitespace + second word (removing it leaves the first word untouched).
import { mask } from './prose.js';

const RE = /(?<![\p{L}\p{N}\p{M}'’_-])([\p{L}\p{M}][\p{L}\p{M}'’]*)([ \t]+|[ \t]*\r?\n[ \t]*)\1(?![\p{L}\p{N}\p{M}'’_-])/giu;
const OK = new Set(['had', 'that']);

export function findRepeated(text) {
  const m = mask(text), out = [];
  let x;
  RE.lastIndex = 0;
  while ((x = RE.exec(m))) {
    const a = x.index + x[1].length, b = a + x[2].length;
    RE.lastIndex = b;
    if (!OK.has(x[1].toLowerCase())) out.push({ word: x[1], from: b, to: b + x[1].length, fix: { from: a, to: b + x[1].length } });
  }
  return out;
}
