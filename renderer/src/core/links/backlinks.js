import { slugify } from '../markdown/slug.js';
import { findLinks } from '../text/link.js';

const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export const titleOf = (p) => p.split('/').pop().replace(/\.(md|markdown|mdown|txt)$/i, '');

export const anchorIs = (a, id, strategy) => { const d = dec(String(a || '')); return !!d && (d === id || slugify(d, strategy) === id); };

// Nearest ATX heading text above (or on) 1-based `line`; '' when none.
export function headingAbove(lines, line) {
  let fence = false, out = '';
  for (let i = 0; i < Math.min(line, lines.length); i++) {
    if (/^ {0,3}(```|~~~)/.test(lines[i])) fence = !fence;
    const m = !fence && /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(lines[i]);
    if (m) out = m[1];
  }
  return out;
}

// Column and length of the link on `ln` that matches seed { kind, target }; `skip` selects the nth identical one.
export function occurrence(ln, s, skip = 0) {
  const wiki = s.kind === 'wiki', re = wiki ? /\[\[[^[\]\n]+\]\]/g : /(?<!!)\[[^\]\n]*\]\(([^)\n]*)\)/g;
  for (const m of ln.matchAll(re)) {
    const k = wiki ? m[0].slice(2, -2).split('|')[0].split('#')[0].trim() : m[1].trim().split(/\s+/)[0].replace(/^<|>$/g, '');
    if (k === s.target && skip-- <= 0) return { col: m.index, len: m[0].length };
  }
  const i = ln.indexOf(s.target);
  return { col: Math.max(i, 0), len: i < 0 ? 0 : s.target.length };
}

// Search-result shaped item (text window of at most 300 chars, match offsets inside it).
export function refItem(path, line, col, len, ln) {
  const a = Math.max(0, col - 80), text = ln.slice(a, a + 300), from = col - a;
  return { path, scope: 'content', line, col, len, text, from, to: Math.min(from + len, text.length) };
}

// True when offset `i` of `t` lies inside a link, autolink or code span.
export function inLink(t, i) {
  for (const m of t.matchAll(/\[\[[^[\]\n]*\]\]|\[[^\]\n]*\]\([^)\n]*\)|<[^>\n]*>|`[^`\n]*`/g)) if (i >= m.index && i < m.index + m[0].length) return true;
  return false;
}

// Same-file `[x](#heading)` links that point at heading `id`.
export function selfRefs(text, id, strategy) {
  const out = [];
  for (const l of findLinks(text)) {
    const d = text.slice(l.dest[0], l.dest[1]).replace(/^<|>$/g, '');
    if (d[0] !== '#' || !anchorIs(d.slice(1), id, strategy)) continue;
    const a = text.lastIndexOf('\n', l.s - 1) + 1, b = text.indexOf('\n', l.s);
    out.push({ line: text.slice(0, l.s).split('\n').length, col: l.s - a, len: l.e - l.s, ln: text.slice(a, b < 0 ? text.length : b).replace(/\r$/, '') });
  }
  return out;
}

// Frontmatter-free line list start index.
export function bodyStart(lines) {
  if (!/^---\s*$/.test(lines[0] || '')) return 0;
  const j = lines.findIndex((x, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(x));
  return j < 0 ? 0 : j + 1;
}

// Preview model for a text: { title, lines } starting after the heading at 0-based `at` (or the first heading / document start).
export function excerpt(text, at, name) {
  const all = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), s = bodyStart(all);
  const head = (i) => { const m = /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(all[i] || ''); return m ? m[1] : null; };
  let i = at >= 0 ? at : s, title = at >= 0 ? head(at) : null;
  if (at < 0) { while (i < all.length && !all[i].trim()) i++; const t = head(i); if (t != null) { title = t; i++; } else i = s; }
  else i++;
  const out = [];
  for (; i < all.length && out.length < 4; i++) {
    if (at >= 0 && head(i) != null) break;
    if (all[i].trim()) out.push(all[i].trim());
  }
  return { title: title || name, lines: out };
}
