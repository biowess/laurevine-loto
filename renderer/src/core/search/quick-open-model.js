import { fuzzy } from './fuzzy.js';

const norm = (p) => String(p).replace(/\\/g, '/');
const mk = (rel, path, recent) => { const i = rel.lastIndexOf('/'); return { rel, path, name: rel.slice(i + 1), dir: i < 0 ? '' : rel.slice(0, i), recent }; };

export const joinPath = (root, rel) => {
  const r = root.replace(/[\\/]+$/, '');
  return root.includes('\\') && !root.includes('/') ? `${r}\\${rel.replace(/\//g, '\\')}` : `${r}/${rel}`;
};

// files: relative "/" paths under root; recents: absolute paths (newest first). Recents outside root are added.
export function buildItems(files, root, recents) {
  const rc = new Map(recents.map((p, i) => [norm(p), [i, p]]));
  const pre = root ? norm(root).replace(/\/+$/, '') + '/' : '\0';
  const items = files.map((rel) => { const p = joinPath(root, rel), k = norm(p), r = rc.get(k); rc.delete(k); return mk(rel, p, r ? r[0] : -1); });
  for (const [k, [i, p]] of rc) if (!k.startsWith(pre)) items.push(mk(k, p, i));
  return items;
}

export function score(q, it) {
  const n = fuzzy(q, it.name), p = fuzzy(q, it.rel);
  if (!n && !p) return null;
  const off = it.rel.length - it.name.length;
  if (n && (!p || n.score * 2 + 50 >= p.score)) return { s: n.score * 2 + 50, nameIdx: n.idx, dirIdx: [] };
  return { s: p.score, nameIdx: p.idx.filter((i) => i >= off).map((i) => i - off), dirIdx: p.idx.filter((i) => i < it.dir.length) };
}

// Recent documents first, then best score. Scans in chunks so large workspaces never block; null when isStale().
export async function search(items, query, { limit = 100, chunk = 3000, isStale = () => false } = {}) {
  const q = query.replace(/\\/g, '/');
  const none = { nameIdx: [], dirIdx: [] };
  if (!q.trim()) {
    const rec = items.filter((i) => i.recent >= 0).sort((a, b) => a.recent - b.recent);
    return [...rec, ...items.filter((i) => i.recent < 0)].slice(0, limit).map((it) => ({ it, ...none }));
  }
  const out = [];
  for (let i = 0; i < items.length; i += chunk) {
    if (isStale()) return null;
    for (const it of items.slice(i, i + chunk)) { const m = score(q, it); if (m) out.push({ it, ...m }); }
    if (i + chunk < items.length) await new Promise((r) => setTimeout(r));
  }
  if (isStale()) return null;
  return out.sort((a, b) => (b.it.recent >= 0) - (a.it.recent >= 0) || b.s - a.s || a.it.rel.length - b.it.rel.length).slice(0, limit);
}
