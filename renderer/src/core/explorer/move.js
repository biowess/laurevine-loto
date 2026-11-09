const key = (p) => {
  const s = String(p).replace(/\\/g, '/').replace(/\/+$/, '');
  return /^[a-zA-Z]:|^\/\//.test(s) ? s.toLowerCase() : s;
};
const parent = (p) => p.slice(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')));

export const inside = (dir, p) => { const a = key(dir), b = key(p); return b === a || b.startsWith(a + '/'); };

// Maps a path through [from, to] pairs (a moved folder carries everything under it).
export function remap(p, pairs) {
  for (const [from, to] of pairs) if (inside(from, p)) return to + String(p).slice(String(from).replace(/[\\/]+$/, '').length);
  return p;
}

// Returns the reason a drop is invalid, or null.
export function dropCheck(srcs, dest, root, copy) {
  if (!dest || !root || !inside(root, dest) || /(^|[\\/])\.\.([\\/]|$)/.test(dest)) return 'Outside the workspace';
  for (const s of srcs) {
    if (!inside(root, s) || /(^|[\\/])\.\.([\\/]|$)/.test(s)) return 'Outside the workspace';
    if (inside(s, dest)) return 'Cannot drop into itself';
    if (!copy && key(parent(s)) === key(dest)) return 'Already in this folder';
  }
  return null;
}
