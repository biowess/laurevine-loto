export const SORTS = Object.freeze([['name', 'Name'], ['modified', 'Date Modified'], ['type', 'Type']]);
const SEP = /[\\/]/;
const strs = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x) : []);

// cache: Map dir -> entries[]; returns flat rows (and note rows for empty/loading/failed folders). Filter matches loaded names only and auto-expands matching ancestors.
export function buildRows(root, cache, expanded, filter = '', notes = new Map()) {
  const f = filter.trim().toLowerCase(), ex = new Set(expanded), rows = [];
  const has = (n) => n.toLowerCase().includes(f);
  const sub = (dir) => (cache.get(dir) || []).some((e) => has(e.name) || (e.dir && e.expandable !== false && sub(e.path)));
  const walk = (dir, depth) => {
    for (const e of cache.get(dir) || []) {
      const below = !!f && e.dir && e.expandable !== false && sub(e.path);
      if (f && !has(e.name) && !below) continue;
      const open = !!e.dir && e.expandable !== false && (below || ex.has(e.path));
      rows.push({ path: e.path, name: e.name, dir: e.dir, icon: e.icon, hidden: e.hidden, expandable: e.expandable, depth, open });
      if (!open) continue;
      const l = cache.get(e.path);
      if (!f && (!l || !l.length)) rows.push({ note: notes.get(e.path) || (l ? 'Empty' : 'Loading…'), depth: depth + 1 });
      walk(e.path, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

export function typeAhead(rows, text, from) {
  const t = text.toLowerCase(), n = rows.length, start = from + (text.length > 1 ? 0 : 1);
  for (let k = 0; k < n; k++) {
    const j = (start + k) % n;
    if (rows[j].name.toLowerCase().startsWith(t)) return j;
  }
  return -1;
}

// Folders between the workspace root and a path inside it (root excluded); null when the path is outside.
export function ancestors(root, p) {
  const r = root.replace(/[\\/]+$/, ''), win = /^([a-zA-Z]:|\\\\)/.test(r), a = win ? r.toLowerCase() : r, b = win ? p.toLowerCase() : p;
  if (b.length <= a.length + 1 || !b.startsWith(a) || !SEP.test(p[a.length])) return null;
  const out = [];
  for (let i = a.length + 1; i < p.length; i++) if (SEP.test(p[i])) out.push(p.slice(0, i));
  return out;
}

// Per-workspace persisted state: { [root]: { x: expanded folders, p: [[path, isDir]] } } as one JSON string.
export function readWs(json, root) {
  let s;
  try { s = JSON.parse(json)[root]; } catch { s = null; }
  s = s && typeof s === 'object' ? s : {};
  return { expanded: strs(s.x), pinned: Array.isArray(s.p) ? s.p.filter((p) => Array.isArray(p) && typeof p[0] === 'string' && p[0]).map((p) => [p[0], p[1] ? 1 : 0]) : [] };
}

export function writeWs(json, root, v, max = 20000) {
  let all;
  try { all = JSON.parse(json); } catch { all = null; }
  all = all && typeof all === 'object' && !Array.isArray(all) ? all : {};
  delete all[root];
  all[root] = { x: v.expanded.slice(-150), p: v.pinned.slice(0, 100) };
  let out = JSON.stringify(all);
  for (const k of Object.keys(all)) {
    if (out.length <= max || k === root) break;
    delete all[k];
    out = JSON.stringify(all);
  }
  while (out.length > max && all[root].x.length) { all[root].x.shift(); out = JSON.stringify(all); }
  return out;
}
