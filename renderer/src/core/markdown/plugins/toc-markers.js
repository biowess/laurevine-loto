// `<!-- laurevine:toc:start ... -->` / `<!-- laurevine:bibliography:start ... -->` render nothing; content between is ordinary Markdown.
const RE = /^<!--\s*laurevine:(?:toc|bibliography):(?:start\b.*|end\s*)-->[ \t]*$/;

export function tocMarkersPlugin(md) {
  md.block.ruler.before('html_block', 'toc_marker', (s, start, end, silent) => {
    if (s.sCount[start] - s.blkIndent >= 4 || !RE.test(s.src.slice(s.bMarks[start] + s.tShift[start], s.eMarks[start]))) return false;
    if (silent) return true;
    s.line = start + 1;
    return true;
  }, { alt: ['paragraph', 'reference', 'blockquote'] });
}
