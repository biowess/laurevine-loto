import { splitFrontmatter } from '../markdown/frontmatter.js';

// Lines with offsets; flags `code` (inside a fence, fence lines included) and `c` (inside a multi-line HTML comment).
export function scanLines(text) {
  const out = [];
  let off = 0, fence = null, cmt = false;
  for (const raw of text.split('\n')) {
    const s = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    let code = false, c = false;
    if (fence) {
      code = true;
      const m = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(s);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
    } else {
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(s);
      if (m && !(m[1][0] === '`' && s.indexOf('`', m[0].length) >= 0)) { fence = m[1]; code = true; }
    }
    if (!code) {
      if (cmt) { c = true; if (s.includes('-->')) cmt = false; }
      else { const i = s.indexOf('<!--'); if (i >= 0 && s.indexOf('-->', i + 4) < 0) { cmt = true; c = true; } }
    }
    out.push({ s, off, code, c });
    off += raw.length + 1;
  }
  return out;
}

// Inline Markdown -> plain heading text.
export const plain = (s) => s
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, '$1')
  .replace(/<[^>]+>/g, '').replace(/`+([^`]*)`+/g, '$1')
  .replace(/(\*{1,3}|_{1,3}|~~)(\S(?:.*?\S)?)\1/g, '$2').replace(/\\([\\`*_{}[\]()#+\-.!~|<>])/g, '$1')
  .replace(/\s+/g, ' ').trim();

const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const BLOCK = /^ {0,3}(#{1,6}(\s|$)|>|[-*+]\s|\d{1,9}[.)]\s|<|\||(`{3,}|~{3,}))/;

// ATX and setext headings, fenced code and comments ignored, front matter skipped; `skip` = [[fromLine, toLine]] ranges (0-based, inclusive).
// -> [{level, text, line}] (line 0-based, the line holding the heading text or its first setext line).
export function extractHeadings(text, { skip = [] } = {}) {
  const fm = splitFrontmatter(text).raw, from = (fm.match(/\n/g) || []).length;
  const ls = scanLines(text), out = [];
  const off = (i) => i < from || skip.some(([a, b]) => i >= a && i <= b) || ls[i].code || ls[i].c;
  for (let i = 0; i < ls.length; i++) {
    if (off(i)) continue;
    const a = ATX.exec(ls[i].s);
    if (a) { out.push({ level: a[1].length, text: plain(a[2] || ''), line: i }); continue; }
    const m = SETEXT.exec(ls[i].s);
    if (!m || i === 0) continue;
    let j = i - 1;
    while (j >= 0 && !off(j) && ls[j].s.trim() && !BLOCK.test(ls[j].s) && !(j < i - 1 && SETEXT.test(ls[j].s))) j--;
    if (j === i - 1) continue;
    out.push({ level: m[1][0] === '=' ? 1 : 2, text: plain(ls.slice(j + 1, i).map((l) => l.s.trim()).join(' ')), line: j + 1 });
  }
  return out;
}
