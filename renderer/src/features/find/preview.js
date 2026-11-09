// Preview-only search: rendered text nodes are indexed into one string; matches become DOM ranges painted via the CSS Highlight API.
const OK = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
const BLK = 'p,li,h1,h2,h3,h4,h5,h6,pre,td,th,blockquote,div';
const WIN = 1500;

export function createPreviewSearch(host, onStale) {
  let text = '', segs = [], stale = true;
  new MutationObserver(() => { stale = true; onStale(); }).observe(host, { childList: true, characterData: true, subtree: true });

  const index = () => {
    if (!stale) return text;
    const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !n.parentElement.closest('script,style,[hidden]') ? 1 : 2) });
    const parts = [];
    let pos = 0, last = null;
    segs = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const b = n.parentElement.closest(BLK);
      if (last && b !== last) { parts.push('\n'); pos++; }
      last = b; segs.push({ n, at: pos }); parts.push(n.data); pos += n.length;
    }
    stale = false; text = parts.join('');
    return text;
  };
  const at = (p, start) => {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (start ? segs[m].at <= p : segs[m].at < p) lo = m; else hi = m - 1; }
    return segs[lo];
  };
  const range = (a, b) => {
    const s = at(a, true), e = at(b, false), r = document.createRange();
    r.setStart(s.n, Math.min(a - s.at, s.n.length)); r.setEnd(e.n, Math.min(b - e.at, e.n.length));
    return r;
  };
  return {
    text: index,
    stale: () => stale,
    selected() { const s = getSelection(), t = s && s.toString().trim(); return t && host.contains(s.anchorNode) ? t : ''; },
    paint(ms, cur) {
      if (!OK) return;
      const c = Math.max(cur, 0), all = [], now = [];
      for (let i = Math.max(0, c - WIN), z = Math.min(ms.length, c + WIN); i < z; i++) {
        try { (i === cur ? now : all).push(range(ms[i].from, ms[i].to)); } catch (e) { /* node gone */ }
      }
      CSS.highlights.set('lv-find', new Highlight(...all));
      CSS.highlights.set('lv-find-cur', new Highlight(...now));
    },
    reveal(m) {
      let r;
      try { r = range(m.from, m.to); } catch (e) { return; }
      const rc = r.getBoundingClientRect();
      if (!rc.width && !rc.height) return;
      for (let e = r.startContainer.parentElement; e && e !== host; e = e.parentElement) {
        if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') { const b = e.getBoundingClientRect(); e.scrollLeft += rc.left - b.left - b.width / 2; }
      }
      const hb = host.getBoundingClientRect();
      host.scrollTop += rc.top - hb.top - hb.height / 2;
    },
  };
}
