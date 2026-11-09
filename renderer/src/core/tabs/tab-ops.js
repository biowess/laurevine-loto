// Pure tab helpers. Pinned tabs always stay left of unpinned ones.
const clampAt = (others, t, at) => {
  const p = others.filter((o) => o.pinned).length;
  return t.pinned ? Math.min(at, p) : Math.max(at, p);
};

// Ids a close command acts on. Others/left/right skip pinned tabs; all closes everything.
export function targets(tabs, id, kind) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i < 0) return [];
  const keep = {
    close: (t, j) => j === i,
    others: (t, j) => j !== i && !t.pinned,
    left: (t, j) => j < i && !t.pinned,
    right: (t, j) => j > i && !t.pinned,
    all: () => true,
  }[kind];
  return keep ? tabs.filter(keep).map((t) => t.id) : [];
}

// Insertion index (among the other tabs) for a pointer at x, given each tab's midpoint.
export function dropIndex(tabs, id, mids, x) {
  const t = tabs.find((o) => o.id === id);
  const others = tabs.filter((o) => o !== t);
  let at = 0;
  tabs.forEach((o, i) => { if (o !== t && mids[i] < x) at++; });
  return clampAt(others, t, at);
}

// Moves tab `id` to index `at` among the other tabs (clamped to its pinned zone).
export function place(tabs, id, at) {
  const t = tabs.find((x) => x.id === id);
  if (!t) return tabs;
  const others = tabs.filter((x) => x !== t);
  const i = clampAt(others, t, Math.max(0, Math.min(at, others.length)));
  return [...others.slice(0, i), t, ...others.slice(i)];
}
