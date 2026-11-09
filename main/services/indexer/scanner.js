// Lightweight line scanner (no Markdown parser): headings, links, tags, frontmatter keys, fenced code ranges.
// Result tuples: h [level, text, line], l [kind i|l|w, target, line, anchor?], t [tag], k [key], c [startLine, endLine]. Lines are 1-based.
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const INLINE = /(!?)\[(?:[^\]\\]|\\.)*\]\(\s*(?:<([^>]*)>|([^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const WIKI = /\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]/g;
const REFDEF = /^ {0,3}\[[^\]]+\]:\s*<?([^\s>]+)/;
const TAG = /(?:^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;
const HTML_TAG = /<(?:img|audio|video|source)\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
const blank = (m) => ' '.repeat(m.length);

export function scanText(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), out = { h: [], l: [], t: [], k: [], c: [] }, tags = new Set();
  const addTag = (s) => { const t = s.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''); if (t) tags.add(t); };
  let i = 0, fence = null, para = null;

  if (/^---[ \t]*$/.test(lines[0])) {
    let j = 1;
    while (j < lines.length && !/^(---|\.\.\.)[ \t]*$/.test(lines[j])) j++;
    if (j < lines.length) {
      let inTags = false;
      for (const l of lines.slice(1, j)) {
        const m = /^([A-Za-z0-9_][\w .-]*?)\s*:\s*(.*)$/.exec(l);
        if (m) {
          out.k.push(m[1]);
          inTags = /^tags?$/i.test(m[1]);
          if (inTags && m[2].trim()) { const v = m[2].trim().replace(/^\[|\]$/g, ''); v.split(v.includes(',') || /^\s*\[/.test(m[2]) ? ',' : /\s+/).forEach(addTag); }
        } else if (inTags && /^\s*-\s+/.test(l)) addTag(l.replace(/^\s*-\s+/, ''));
        else if (l.trim() && !/^\s/.test(l) && l[0] !== '#') inTags = false;
      }
      i = j + 1;
    }
  }

  const inline = (ln, no) => {
    const s = ln.replace(/(`+)[^`]*\1/g, blank);
    for (const m of s.matchAll(INLINE)) { const t = m[2] ?? m[3] ?? ''; if (t) out.l.push([m[1] ? 'i' : 'l', t, no]); }
    for (const m of s.matchAll(WIKI)) if (m[1].trim() || m[2]) out.l.push(['w', m[1].trim(), no, (m[2] || '').trim()]);
    const d = REFDEF.exec(ln);
    if (d) out.l.push(['l', d[1], no]);
    for (const m of s.matchAll(HTML_TAG)) { const t = m[1] ?? m[2]; if (t) out.l.push(['i', t, no]); }
    for (const m of s.replace(INLINE, blank).matchAll(TAG)) if (!/^\d+$/.test(m[1])) tags.add(m[1]);
  };

  for (; i < lines.length; i++) {
    const ln = lines[i], no = i + 1;
    if (fence) {
      const m = FENCE.exec(ln);
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len && !m[2].trim()) { out.c.push([fence.start, no]); fence = null; }
      continue;
    }
    const f = FENCE.exec(ln);
    if (f && !(f[1][0] === '`' && f[2].includes('`'))) { fence = { ch: f[1][0], len: f[1].length, start: no }; para = null; continue; }
    const a = ATX.exec(ln);
    if (a) { out.h.push([a[1].length, (a[2] || '').trim(), no]); para = null; inline(ln, no); continue; }
    if (para && SETEXT.test(ln)) { out.h.push([ln.trim()[0] === '=' ? 1 : 2, para.text, para.line]); para = null; continue; }
    inline(ln, no);
    para = ln.trim() && !/^\s*([-*+>]|\d+[.)])\s/.test(ln) && !/^ {4}|^\t/.test(ln) ? { text: ln.trim(), line: no } : null;
  }
  if (fence) out.c.push([fence.start, lines.length]);
  out.t = [...tags];
  return out;
}

// Drops empty parts so cached entries stay small.
export const compact = (r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v.length));
