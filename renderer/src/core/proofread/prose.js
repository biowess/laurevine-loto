// Pure prose helpers. mask(text) keeps offsets but blanks non-prose: code, frontmatter, URLs, tags, comments (\u0001), headings, tables, rules and
// list/quote markers (spaces; a list marker leads with \u0002 = sentence boundary). sentences(masked) -> [{ from, to, words }].
import { findCodeRanges } from '../diagnostics/rules.js';
import { countWords } from '../text/stats.js';

const FM = /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
const INLINE = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>\n]*>|(?<=\])\([^)\n]*\)|https?:\/\/[^\s)>\]]+/g;
const BLOCK = /^(?: {0,3}#{1,6}(?:[ \t].*)?|[ \t]*\|.*| {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*)$/gm;
const ITEM = /^[ \t]*(?:>[ \t]*)*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)?/gm;
const END = /[.!?…]+["'”’)\]]*(?=\s+[\p{Lu}\p{N}"“'‘(\[\u0001\u0002]|\s*$)|\n[ \t]*\n|\u0002/gu;

export function mask(text) {
  const t = String(text ?? ''), rs = [], fm = FM.exec(t);
  if (fm) rs.push([0, fm[0].length, '\u0001']);
  for (const [a, b] of findCodeRanges(t)) rs.push([a, b, '\u0001']);
  for (const m of t.matchAll(INLINE)) rs.push([m.index, m.index + m[0].length, '\u0001']);
  for (const m of t.matchAll(BLOCK)) rs.push([m.index, m.index + m[0].length, ' ']);
  for (const m of t.matchAll(ITEM)) if (m[0].trim()) rs.push([m.index, m.index + m[0].length, ' ', /[-*+\d]/.test(m[0]) ? '\u0002' : ' ']);
  rs.sort((x, y) => x[0] - y[0]);
  let o = '', p = 0;
  for (const [a, b, ch, lead = ch] of rs) {
    if (b <= p) continue;
    const s = Math.max(a, p);
    o += t.slice(p, s) + t.slice(s, b).replace(/[^\r\n]/g, (c, i) => (s + i === a ? lead : ch));
    p = b;
  }
  return o + t.slice(p);
}

export function sentences(m) {
  const out = [];
  let p = 0;
  const add = (a, b) => {
    const s = m.slice(a, b), body = s.trim(), lead = s.length - s.trimStart().length;
    const words = countWords(body.replace(/[\u0001\u0002]/g, ' '));
    if (words) out.push({ from: a + lead, to: a + lead + body.length, words });
  };
  for (const x of m.matchAll(END)) {
    add(p, x[0][0] !== '\n' && x[0] !== '\u0002' ? x.index + x[0].length : x.index);
    p = x.index + x[0].length;
  }
  add(p, m.length);
  return out;
}
