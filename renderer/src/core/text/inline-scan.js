// Pure: inline span scanner. Span = {kind:bold|italic|strike|code, o:[s,e] open marker, c:[s,e] close marker, s, e}.
// Per block (paragraph, list item, heading, quote line); fenced code is skipped; escapes and link destinations are skipped.
const BLOCK = /^\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>)/;
const isW = (c) => !!c && /[\p{L}\p{N}]/u.test(c);
const mk = (kind, os, oe, cs, ce) => ({ kind, o: [os, oe], c: [cs, ce], s: os, e: ce });

export function blocks(text) {
  const out = [];
  let pos = 0, cur = null, fence = null;
  for (const line of text.split('\n')) {
    const end = pos + line.length, f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null; }
    else if (f) { fence = f[1]; cur = null; }
    else if (!line.trim()) cur = null;
    else if (!cur || BLOCK.test(line)) { cur = { s: pos, e: end }; out.push(cur); }
    else cur.e = end;
    pos = end + 1;
  }
  return out;
}

function scanBlock(t, s, e, spans) {
  const st = [];
  for (let i = s; i < e; ) {
    const c = t[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') {
      let n = 1;
      while (t[i + n] === '`') n++;
      let j = i + n, f = -1;
      while (j < e && f < 0) {
        if (t[j] !== '`') { j++; continue; }
        let k = 1;
        while (t[j + k] === '`') k++;
        if (k === n) f = j; else j += k;
      }
      if (f < 0) { i += n; continue; }
      spans.push(mk('code', i, i + n, f, f + n));
      i = f + n;
      continue;
    }
    if (c === ']' && t[i + 1] === '(') {
      const j = t.indexOf(')', i);
      if (j >= 0 && j < e) { i = j + 1; continue; }
    }
    if (c === '*' || c === '_' || c === '~') {
      let n = 1;
      while (t[i + n] === c) n++;
      if (c === '~' && n !== 2) { i += n; continue; }
      const p = i > s ? t[i - 1] : ' ', q = i + n < e ? t[i + n] : ' ';
      let canO = !/\s/.test(q), canC = !/\s/.test(p);
      if (c === '_') { canO = canO && !isW(p); canC = canC && !isW(q); }
      let len = n, pos = i;
      while (canC && len > 0) {
        let k = st.length - 1;
        while (k >= 0 && st[k].ch !== c) k--;
        if (k < 0) break;
        const o = st[k], use = c === '~' ? 2 : o.n >= 2 && len >= 2 ? 2 : 1;
        spans.push(mk(c === '~' ? 'strike' : use === 2 ? 'bold' : 'italic', o.p + o.n - use, o.p + o.n, pos, pos + use));
        o.n -= use;
        st.length = o.n ? k + 1 : k;
        len -= use;
        pos += use;
      }
      if (canO && len > 0) st.push({ ch: c, p: pos, n: len });
      i += n;
      continue;
    }
    i++;
  }
}

export function scan(text) {
  const spans = [];
  for (const b of blocks(text)) scanBlock(text, b.s, b.e, spans);
  return spans;
}
