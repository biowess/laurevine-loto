// Pure: fenced-code and math insertion, fence lookup and info-string language change on {text,selections}. Selections returned are post-change.
const OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

const maxRun = (s) => (s.match(/`+/g) || []).reduce((n, m) => Math.max(n, m.length), 0);
export const fenceFor = (s) => '`'.repeat(Math.max(3, maxRun(s) + 1));

// Wraps the main selection (or `code` when given) on its own lines; mk(body) -> [openLine, closeLine].
function wrap(s, mk, code) {
  const { text } = s, m = s.selections[0], from = Math.min(m.anchor, m.head);
  let to = Math.max(m.anchor, m.head);
  if (to > from && text[to - 1] === '\n') to--;
  const body = code ?? text.slice(from, to), [open, close] = mk(body);
  const pre = from > 0 && text[from - 1] !== '\n' ? '\n' : '', post = to < text.length && text[to] !== '\n' ? '\n' : '';
  const head = `${pre}${open}\n`, a = from + head.length, b = a + body.length;
  return { changes: [{ from, to, insert: `${head}${body}\n${close}${post}` }], selections: [{ anchor: code === undefined ? a : b, head: b }] };
}

export const insertFence = (s, lang = '', code) => wrap(s, (b) => { const f = fenceFor(b); return [f + lang, f]; }, code);
export const insertMathBlock = (s, tex) => wrap(s, () => ['$$', '$$'], tex);

export function insertMathInline(s, tex) {
  const m = s.selections[0], from = Math.min(m.anchor, m.head), to = Math.max(m.anchor, m.head), body = tex ?? s.text.slice(from, to);
  return { changes: [{ from, to, insert: `$${body}$` }], selections: [{ anchor: from + 1, head: from + 1 + body.length }] };
}

// The fenced block containing pos: { from, to, lang, infoFrom, infoTo, innerFrom, innerTo } or null. An unclosed fence runs to the end.
export function fenceAt(text, pos) {
  let i = 0, open = null, close = null;
  const done = (end) => {
    const innerFrom = Math.min(text.length, open.end + 1);
    return { from: open.from, to: end, lang: open.lang, infoFrom: open.infoFrom, infoTo: open.infoFrom + open.lang.length, innerFrom, innerTo: close ? Math.max(innerFrom, close.from - 1) : text.length };
  };
  while (i <= text.length) {
    let e = text.indexOf('\n', i);
    if (e < 0) e = text.length;
    if (!open) {
      if (i > pos) return null;
      const m = OPEN.exec(text.slice(i, Math.min(e, i + 200)));
      if (m) {
        open = { from: i, end: e, lang: m[2], infoFrom: i + m[0].length - m[2].length };
        open.re = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},}[ \\t]*$`);
      }
    } else if (open.re.test(text.slice(i, e))) {
      close = { from: i };
      if (pos <= e) return done(e);
      open = close = null;
    }
    i = e + 1;
  }
  return open ? done(text.length) : null;
}

// Replaces the info-string language of the block under the main caret ('' clears it).
export function setLang(s, lang) {
  const b = fenceAt(s.text, s.selections[0].head);
  if (!b) return null;
  const d = lang.length - (b.infoTo - b.infoFrom);
  const map = (p) => (p <= b.infoFrom ? p : p >= b.infoTo ? p + d : b.infoFrom + lang.length);
  return { changes: [{ from: b.infoFrom, to: b.infoTo, insert: lang }], selections: s.selections.map((x) => ({ anchor: map(x.anchor), head: map(x.head) })) };
}
