import { parseFrontmatter } from '../markdown/frontmatter.js';

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)(.*)$/;
const INLINE = /(!?)\[(?:[^\]\\]|\\.)*\]\(\s*(?:<([^>]*)>|([^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const HTML_SRC = /<(?:img|audio|video|source)\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const AUTO = /<((?:https?|ftp|mailto):[^>\s]+)>/gi;
const EXT = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const FENCE_KIND = { dataview: 'dataview', dataviewjs: 'dataviewjs', tasks: 'tasks-query', templater: 'templater', query: 'query-block' };
const PATTERNS = [
  ['templater', /<%[*_-]?[\s\S]*?%>/],
  ['dataview-inline', /`\$?= [^`]+`/],
  ['hugo-shortcode', /\{\{[<%]/],
  ['liquid', /\{%[\s\S]*?%\}/],
  ['admonition-fence', /^:::\s*\w+/],
  ['mdx-import', /^(?:import\s.+\sfrom\s['"]|export\s+(?:const|default|function)\s)/],
  ['jsx-component', /^<[A-Z][\w.]*[\s/>]/],
  ['block-id', /\s\^[A-Za-z0-9-]{4,}\s*$/],
];
const blank = (m) => ' '.repeat(m.length);
const target = (s) => { const [t, ...a] = s.split('|')[0].split('#'); return [t.trim(), a.join('#').trim()]; };

// -> compact facts of one document: frontmatter keys, links [kind, target, line], callouts, unsupported syntax, headings. Lines are 1-based; code is never scanned for links.
export function analyzeDocument(text) {
  const src = String(text).replace(/^\uFEFF/, ''), lines = src.split(/\r?\n/);
  const fm = parseFrontmatter(src), out = { fm: { present: fm.present, keys: Object.keys(fm.data), error: fm.error }, links: [], callouts: [], unsupported: [], headings: 0 };
  let i = 0, fence = null, comment = false;
  if (fm.present && /^---[ \t]*$/.test(lines[0])) { let j = 1; while (j < lines.length && !/^(---|\.\.\.)[ \t]*$/.test(lines[j])) j++; if (j < lines.length) i = j + 1; }
  const add = (kind, t, line, extra) => out.links.push(extra === undefined ? [kind, t, line] : [kind, t, line, extra]);
  const bad = (kind, line) => out.unsupported.push([kind, line]);
  const ext = (t, no, kind) => { if (EXT.test(t)) add('external', t, no); else if (t.startsWith('#')) add('anchor', t, no); else if (!/^data:/i.test(t)) add(kind, t, no); };

  for (; i < lines.length; i++) {
    const no = i + 1;
    let ln = lines[i];
    const f = FENCE.exec(ln);
    if (fence) { if (f && f[1][0] === fence.ch && f[1].length >= fence.len && !f[2] && !f[3].trim()) fence = null; continue; }
    if (f && !(f[1][0] === '`' && f[3].includes('`'))) { fence = { ch: f[1][0], len: f[1].length }; if (FENCE_KIND[f[2].toLowerCase()]) bad(FENCE_KIND[f[2].toLowerCase()], no); continue; }
    if (comment) { const e = ln.indexOf('%%'); if (e < 0) continue; comment = false; ln = ' '.repeat(e + 2) + ln.slice(e + 2); }
    const open = ln.split('%%').length - 1;
    if (open) { if (open % 2) comment = true; bad('obsidian-comment', no); ln = ln.replace(/%%[\s\S]*?(%%|$)/g, blank); }
    if (/^ {4}|^\t/.test(ln) && !/^\s*([-*+>]|\d+[.)])\s/.test(ln)) continue;
    for (const [kind, re] of PATTERNS) if (re.test(ln)) bad(kind, no);
    const s = ln.replace(/(`+)[^`]*\1/g, blank);
    if (/^ {0,3}#{1,6}(\s|$)/.test(s)) out.headings++;
    const c = /^\s*(?:>\s*)+\[!([\w-]+)\]([+-])?/.exec(s);
    if (c) out.callouts.push([c[1].toLowerCase(), no, c[2] || '']);
    const rest = s.replace(/!\[\[([^\]]+)\]\]/g, (m, x) => { const [t, a] = target(x); add('embed', t, no, a); if (a.startsWith('^')) bad('block-reference', no); return blank(m); })
      .replace(/\[\[([^\]]*)\]\]/g, (m, x) => { const [t, a] = target(x); add('wiki', t, no, a); if (a.startsWith('^')) bad('block-reference', no); return blank(m); });
    for (const m of rest.matchAll(INLINE)) { const t = m[2] ?? m[3] ?? ''; if (t) ext(t, no, m[1] ? 'image' : 'link'); }
    for (const m of rest.matchAll(HTML_SRC)) { const t = m[1] ?? m[2]; if (t) ext(t, no, 'image'); }
    for (const m of rest.matchAll(AUTO)) add('external', m[1], no);
    const d = /^ {0,3}\[[^\]]+\]:\s*<?([^\s>]+)/.exec(rest);
    if (d) ext(d[1], no, 'link');
  }
  return out;
}
