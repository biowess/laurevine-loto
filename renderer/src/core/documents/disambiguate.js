// Pure: tabs sharing a title get the shortest parent-folder suffix that tells them apart (`README.md · atlas`).
const parents = (p) => (p ? p.split(/[\\/]/).filter(Boolean).slice(0, -1).reverse() : []);
const suffix = (p, k) => p.slice(0, k).reverse().join('/');

// tabs: [{ id, title, path }] -> Map id -> { label, suffix, tip }; tip is the full path (or the title when unsaved).
export function disambiguate(tabs) {
  const groups = new Map();
  for (const t of tabs) (groups.get(t.title) || groups.set(t.title, []).get(t.title)).push(t);
  const out = new Map();
  for (const [title, g] of groups) {
    const ps = g.map((t) => parents(t.path)), max = Math.max(...ps.map((p) => p.length));
    let k = 1;
    if (g.length > 1) while (k < max && new Set(ps.map((p) => suffix(p, k))).size < g.length) k++;
    g.forEach((t, i) => {
      const s = g.length > 1 && t.path ? suffix(ps[i], k) : '';
      out.set(t.id, { suffix: s, label: s ? `${title} · ${s}` : title, tip: t.path || title });
    });
  }
  return out;
}
