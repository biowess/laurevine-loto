// Abbreviations: `*[HTML]: Hypertext Markup Language` (anywhere in the document, first definition wins) wraps whole-word text matches in <abbr title>.
const DEF = /^\*\[([^\]]+)\]:[ \t]*(.+?)[ \t]*$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function abbrPlugin(md) {
  md.block.ruler.before('reference', 'abbr_def', (s, start, end, silent) => {
    if (s.sCount[start] - s.blkIndent >= 4) return false;
    const m = DEF.exec(s.src.slice(s.bMarks[start] + s.tShift[start], s.eMarks[start]));
    if (!m) return false;
    if (!silent) {
      if (!s.env.abbrs) s.env.abbrs = Object.create(null);
      if (!(m[1] in s.env.abbrs)) s.env.abbrs[m[1]] = m[2];
    }
    s.line = start + 1;
    return true;
  });

  md.core.ruler.push('abbr_replace', (s) => {
    const map = s.env.abbrs, labels = map ? Object.keys(map) : [];
    if (!labels.length) return;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${labels.sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
    const txt = (c) => { const x = new s.Token('text', '', 0); x.content = c; return x; };
    for (const blk of s.tokens) {
      if (blk.type !== 'inline' || !blk.children) continue;
      const out = [];
      let link = 0;
      for (const t of blk.children) {
        if (t.type === 'link_open') link++; else if (t.type === 'link_close') link--;
        if (t.type !== 'text' || link) { out.push(t); continue; }
        let last = 0;
        for (const m of t.content.matchAll(re)) {
          const at = m.index + m[1].length, o = new s.Token('abbr_open', 'abbr', 1);
          if (at > last) out.push(txt(t.content.slice(last, at)));
          o.attrs = [['title', map[m[2]]]];
          out.push(o, txt(m[2]), new s.Token('abbr_close', 'abbr', -1));
          last = at + m[2].length;
        }
        if (!last) out.push(t); else if (last < t.content.length) out.push(txt(t.content.slice(last)));
      }
      blk.children = out;
    }
  });
}
