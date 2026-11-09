// Match decorations via the CSS Custom Highlight API: no document changes, only rendered lines are painted.
const OK = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
const MAX = 3000;

export function paint(view, matches, cur) {
  if (!OK) return;
  const { from, to } = view.viewport, all = [], now = [];
  let lo = 0, hi = matches.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (matches[mid].to < from) lo = mid + 1; else hi = mid; }
  for (let i = lo; i < matches.length && matches[i].from <= to && all.length < MAX; i++) {
    try {
      const a = view.domAtPos(matches[i].from), b = view.domAtPos(matches[i].to), r = document.createRange();
      r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset);
      (i === cur ? now : all).push(r);
    } catch (e) { /* not rendered */ }
  }
  CSS.highlights.set('lv-find', new Highlight(...all));
  CSS.highlights.set('lv-find-cur', new Highlight(...now));
}

export function clear() {
  if (!OK) return;
  CSS.highlights.delete('lv-find');
  CSS.highlights.delete('lv-find-cur');
}
