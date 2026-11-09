// Pure outline model: headings -> nested nodes (skipped levels attach to the nearest shallower heading).
export function buildNodes(hs) {
  const out = [], st = [];
  for (const x of hs) {
    while (st.length && out[st[st.length - 1]].level >= x.level) st.pop();
    const p = st.length ? st[st.length - 1] : -1;
    const n = { id: x.id, text: x.text || '(untitled)', level: x.level, line: x.line, i: out.length, parent: p, depth: p < 0 ? 0 : out[p].depth + 1, kids: 0 };
    if (p >= 0) out[p].kids++;
    out.push(n); st.push(n.i);
  }
  return out;
}

export function visibleNodes(nodes, collapsed) {
  const hide = [], out = [];
  for (const n of nodes) {
    hide[n.i] = n.parent >= 0 && (hide[n.parent] || collapsed.has(nodes[n.parent].id));
    if (!hide[n.i]) out.push(n);
  }
  return out;
}

// Last heading at or before `line` (lines ascend): binary search, -1 before the first heading.
export function activeIndex(nodes, line) {
  let lo = 0, hi = nodes.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (nodes[m].line <= line) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}

// The visible node standing for nodes[i]: its outermost collapsed ancestor, else itself.
export function shownAncestor(nodes, i, collapsed) {
  let r = i;
  for (let p = nodes[i] ? nodes[i].parent : -1; p >= 0; p = nodes[p].parent) if (collapsed.has(nodes[p].id)) r = p;
  return r;
}

export const headingLink = (n) => `[${n.text.replace(/[[\]\\]/g, '\\$&')}](#${n.id})`;
export const parentIds = (nodes) => new Set(nodes.filter((n) => n.kids).map((n) => n.id));
