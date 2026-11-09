// Pure: ranges the spellchecker must not mark: frontmatter, fenced and inline code, URLs, emails, link targets, session-ignored words.
const MAX = 400000;
const FM = /^---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?=\r?\n|$)/;
const INLINE = /(`+)(?!`)[^\n]*?(?<!`)\1(?!`)/g;
const URLS = /(?:\b(?:https?|ftp):\/\/|\bwww\.)[^\s<>)\]]+|<[^>\s]+>|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?<=\]\()[^)\s]+/g;
const OPEN = /^ {0,3}(`{3,}|~{3,})/;
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;

export function skipRanges(text, ignored) {
  if (text.length > MAX) return [];
  const out = [], push = (a, b) => { if (b > a) out.push([a, b]); };
  let pos = 0, fence = null;
  const fm = FM.exec(text);
  if (fm) { push(0, fm[0].length); pos = fm[0].length; }
  while (pos <= text.length) {
    let end = text.indexOf('\n', pos);
    if (end < 0) end = text.length;
    const line = text.slice(pos, end), m = OPEN.exec(line);
    if (fence) {
      if (m && m[1][0] === fence.c && m[1].length >= fence.n && /^[ \t]*\r?$/.test(line.slice(m[0].length))) { push(fence.from, end); fence = null; }
    } else if (m) fence = { c: m[1][0], n: m[1].length, from: pos };
    else for (const re of [INLINE, URLS]) for (const x of line.matchAll(re)) push(pos + x.index, pos + x.index + x[0].length);
    pos = end + 1;
  }
  if (fence) push(fence.from, text.length);
  if (ignored && ignored.size) {
    for (const m of text.matchAll(WORD)) {
      const t = m[0].replace(/^['’]+|['’]+$/g, '');
      if (ignored.has(t)) push(m.index + m[0].indexOf(t), m.index + m[0].indexOf(t) + t.length);
    }
  }
  return out;
}
