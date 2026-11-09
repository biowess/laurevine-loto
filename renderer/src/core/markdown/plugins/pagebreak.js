// `<!-- laurevine:pagebreak -->` on its own line: a dashed "Page break — export only" rule in the preview. Works with or without raw HTML enabled.
const RE = /^<!--\s*laurevine:(pagebreak|span)\s*-->[ \t]*$/;

export function pagebreakPlugin(md) {
  md.block.ruler.before('html_block', 'pagebreak', (s, start, end, silent) => {
    if (s.sCount[start] - s.blkIndent >= 4 || !RE.test(s.src.slice(s.bMarks[start] + s.tShift[start], s.eMarks[start]))) return false;
    if (!silent) s.push(RE.exec(s.src.slice(s.bMarks[start] + s.tShift[start], s.eMarks[start]))[1], 'div', 0).map = [start, start + 1];
    s.line = start + 1;
    return true;
  }, { alt: ['paragraph', 'reference', 'blockquote'] });
  md.renderer.rules.span = () => '<div class="lt-span" aria-hidden="true"></div>\n';
  md.renderer.rules.pagebreak = (tk, i, o, env, self) => `<div class="lt-pagebreak" role="separator"${self.renderAttrs(tk[i])}>Page break — export only</div>\n`;
}
