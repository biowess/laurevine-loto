export const splitGlobs = (s) => String(s || '').split(/[\n,]/).map((x) => x.trim()).filter(Boolean).slice(0, 20);

export const createResults = () => ({ groups: [], by: new Map(), total: 0 });

// Groups results by file in arrival order; returns the groups that received items.
export function addItems(r, items) {
  const touched = new Set();
  for (const it of items) {
    let g = r.by.get(it.path);
    if (!g) { g = { path: it.path, items: [], open: true }; r.by.set(it.path, g); r.groups.push(g); }
    g.items.push(it); r.total++; touched.add(g);
  }
  return touched;
}

// Visible rows for keyboard navigation: { g } for a file row, { g, it } for a hit.
export const flatten = (r) => r.groups.flatMap((g) => [{ g }, ...(g.open ? g.items.map((it) => ({ g, it })) : [])]);
export const allHits = (r) => r.groups.flatMap((g) => g.items);

// Preview pieces [before, match, after]; leading indentation is dropped.
export function parts(it) {
  const lead = Math.min(it.text.length - it.text.trimStart().length, it.from), t = it.text.slice(lead);
  return [t.slice(0, it.from - lead), t.slice(it.from - lead, it.to - lead), t.slice(it.to - lead)];
}

export const absPath = (root, rel) => {
  const s = root.includes('\\') ? '\\' : '/';
  return root.replace(/[\\/]+$/, '') + s + rel.split('/').join(s);
};

// Workspace-relative path with `/`, or null when `abs` is outside `root`.
export function relPath(root, abs) {
  const r = root.replace(/[\\/]+$/, '').replace(/\\/g, '/'), p = abs.replace(/\\/g, '/'), win = /^[a-z]:/i.test(r);
  return (win ? p.toLowerCase() : p).startsWith((win ? r.toLowerCase() : r) + '/') ? p.slice(r.length + 1) : null;
}
