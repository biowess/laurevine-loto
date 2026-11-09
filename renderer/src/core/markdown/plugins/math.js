// Own markdown-it rules for TeX math: $inline$, $$inline display$$, and multi-line $$ display $$ blocks.
// `\$` stays a literal dollar (CommonMark escape; also skipped while scanning for a closer).
// Currency heuristic for single dollars: no whitespace after the opener or before the closer, and no digit right after the closer.
// opts.katex(): the KaTeX module or null while it loads (a pending placeholder is rendered and opts.need() is called);
// render failures never throw: they become a visible inline error and a { kind: 'math', tex, display, message, line? } entry in env.warnings.
const WS = /\s/, DIGIT = /[0-9]/;

function inline(state, silent) {
  const s = state.src, start = state.pos;
  if (s.charCodeAt(start) !== 0x24) return false;
  const d = s.charCodeAt(start + 1) === 0x24 ? 2 : 1, from = start + d, max = state.posMax;
  if (from >= max || (d === 1 && WS.test(s[from]))) return false;
  for (let e = from; e < max; e++) {
    const c = s.charCodeAt(e);
    if (c === 0x5c) { e++; continue; }
    if (c !== 0x24) continue;
    if (d === 2) { if (s.charCodeAt(e + 1) !== 0x24) continue; }
    else if (WS.test(s[e - 1]) || DIGIT.test(s[e + 1] || '') || e === from) continue;
    const tex = s.slice(from, e);
    if (!tex.trim()) return false;
    if (!silent) { const t = state.push('math_inline', '', 0); t.content = tex; t.markup = d === 2 ? '$$' : '$'; t.meta = { display: d === 2 }; }
    state.pos = e + d;
    return true;
  }
  return false;
}

const closes = (t) => t.endsWith('$$') && !t.endsWith('\\$$');

function block(state, start, end, silent) {
  if (state.sCount[start] - state.blkIndent >= 4) return false;
  const pos = state.bMarks[start] + state.tShift[start], max = state.eMarks[start];
  if (state.src.slice(pos, pos + 2) !== '$$') return false;
  const first = state.src.slice(pos + 2, max).trimEnd(), lines = [];
  let next = start, found = false;
  if (closes(first)) { lines.push(first.slice(0, -2)); found = true; }
  else {
    if (first.trim()) lines.push(first);
    for (next = start + 1; next < end && !found; next++) {
      if (state.sCount[next] < state.blkIndent) break;
      const ln = state.getLines(next, next + 1, state.blkIndent, false).replace(/\n$/, ''), t = ln.trimEnd();
      if (closes(t)) { lines.push(t.slice(0, -2)); found = true; } else lines.push(ln);
    }
    next--;
  }
  const tex = lines.join('\n').trim();
  if (!found || !tex) return false;
  if (silent) return true;
  const t = state.push('math_block', '', 0);
  t.block = true; t.content = tex; t.markup = '$$'; t.map = [start, next + 1];
  state.line = next + 1;
  return true;
}

export function mathPlugin(md, opts = {}) {
  const esc = md.utils.escapeHtml;
  function html(tex, display, env, line) {
    const k = opts.katex && opts.katex();
    if (!k) {
      if (opts.need) opts.need();
      const d = display ? '$$' : '$';
      return `<span class="lv-math lv-math--pending">${esc(d + tex + d)}</span>`;
    }
    try {
      return k.renderToString(tex, { displayMode: display, throwOnError: true, output: 'htmlAndMathml', strict: 'ignore', trust: false, maxExpand: 1000 });
    } catch (err) {
      const message = String((err && err.message) || err).replace(/^KaTeX parse error: /, '');
      (env.warnings ||= []).push({ kind: 'math', tex, display, message, ...(line ? { line } : {}) });
      return `<span class="lv-math-error" role="alert" title="${esc(message)}"><code>${esc(tex)}</code> <small>${esc(message)}</small></span>`;
    }
  }
  md.inline.ruler.before('escape', 'math_inline', inline);
  md.block.ruler.before('fence', 'math_block', block, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
  md.renderer.rules.math_inline = (tk, i, o, env) => html(tk[i].content, tk[i].meta.display, env);
  md.renderer.rules.math_block = (tk, i, o, env) => `<div${md.renderer.renderAttrs(tk[i])} class="lv-math lv-math--block">${html(tk[i].content, true, env, tk[i].map[0] + 1)}</div>\n`;
}
