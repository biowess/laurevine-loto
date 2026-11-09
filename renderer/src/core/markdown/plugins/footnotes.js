// Footnotes: `[^id]` references (only when a definition exists, otherwise literal) and `[^id]: text` definitions (indented continuation, lazy lines).
// Used footnotes are numbered by first reference and collected in a section at the end with back-references.
const DEF = /^\[\^([^\s\]]+)\]:[ \t]*/;
const line = (s, n) => s.src.slice(s.bMarks[n] + s.tShift[n], s.eMarks[n]);

function define(s, start, end, silent) {
  if (s.sCount[start] - s.blkIndent >= 4) return false;
  const m = DEF.exec(line(s, start));
  if (!m) return false;
  if (silent) return true;
  let text = line(s, start).slice(m[0].length), at = start + 1;
  while (at < end) {
    if (s.isEmpty(at)) {
      let n = at + 1;
      while (n < end && s.isEmpty(n)) n++;
      if (n >= end || s.sCount[n] - s.blkIndent < 4) break;
      text += '\n'.repeat(n - at);
      at = n;
      continue;
    }
    const ind = s.sCount[at] - s.blkIndent >= 4;
    if (!ind && DEF.test(line(s, at))) break;
    text += '\n' + (ind ? s.getLines(at, at + 1, s.blkIndent + 4, false) : line(s, at));
    at++;
  }
  if (!s.env.footnotes) s.env.footnotes = { defs: Object.create(null), order: [], cnt: Object.create(null) };
  if (!(m[1] in s.env.footnotes.defs)) s.env.footnotes.defs[m[1]] = text;
  s.line = at;
  return true;
}

function ref(s, silent) {
  const p = s.pos, src = s.src;
  if (src.charCodeAt(p) !== 0x5B || src.charCodeAt(p + 1) !== 0x5E) return false;
  const e = src.indexOf(']', p + 2), id = e < 0 ? '' : src.slice(p + 2, e), fn = s.env.footnotes;
  if (!id || /\s/.test(id) || !fn || !(id in fn.defs)) return false;
  if (!silent) {
    const n = fn.order.indexOf(id) + 1 || fn.order.push(id), k = (fn.cnt[id] = (fn.cnt[id] || 0) + 1);
    s.push('footnote_ref', '', 0).meta = { n, k };
  }
  s.pos = e + 1;
  return true;
}

function tail(s) {
  const fn = s.env.footnotes;
  if (!fn || !fn.order.length) return;
  const md = s.md, raw = (html) => { const t = new s.Token('lt_raw', '', 0); t.block = true; t.content = html; return t; };
  const out = [raw('<section class="lt-footnotes"><ol>')];
  for (let i = 0; i < fn.order.length; i++) {
    const id = fn.order[i], n = i + 1, toks = [];
    md.block.parse(fn.defs[id], md, s.env, toks);
    for (const t of toks) {
      t.map = null;
      if (t.type === 'inline') { t.children = []; md.inline.parse(t.content, md, s.env, t.children); }
    }
    let back = '';
    for (let k = 1; k <= fn.cnt[id]; k++) back += ` <a class="lt-fnback" href="#fnref-${n}${k > 1 ? '-' + k : ''}" aria-label="Back to reference${k > 1 ? ' ' + k : ''}">↩${k > 1 ? '<sup>' + k + '</sup>' : ''}</a>`;
    const last = toks[toks.length - 1], inl = toks[toks.length - 2];
    if (last && last.type === 'paragraph_close' && inl && inl.type === 'inline') {
      const h = new s.Token('html_inline', '', 0);
      h.content = back;
      inl.children.push(h);
    } else toks.push(raw(`<p>${back}</p>`));
    out.push(raw(`<li id="fn-${n}">`), ...toks, raw('</li>'));
  }
  out.push(raw('</ol></section>'));
  for (const t of out) s.tokens.push(t);
}

export function footnotesPlugin(md) {
  md.block.ruler.before('reference', 'footnote_def', define, { alt: ['paragraph', 'reference'] });
  md.inline.ruler.before('link', 'footnote_ref', ref);
  md.core.ruler.push('footnote_tail', tail);
  md.renderer.rules.lt_raw = (tk, i) => tk[i].content;
  md.renderer.rules.footnote_ref = (tk, i) => {
    const { n, k } = tk[i].meta;
    return `<sup class="lt-fnref"><a href="#fn-${n}" id="fnref-${n}${k > 1 ? '-' + k : ''}">[${n}]</a></sup>`;
  };
}
