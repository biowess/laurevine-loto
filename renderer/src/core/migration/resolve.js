import { joinRel } from '../publish/site.js';

const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const lc = (s) => s.toLowerCase();
const base = (p) => p.slice(p.lastIndexOf('/') + 1);
const stem = (p) => base(p).replace(/\.[^.]+$/, '');
const DOC = /\.(md|markdown|mdown|mkd|mdx)$/i;
const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };

export function buildIndex(paths) {
  const all = new Map(), names = new Map(), stems = new Map(), dirs = new Set();
  for (const p of paths) {
    all.set(lc(p), p);
    push(names, lc(base(p)), p);
    if (DOC.test(p)) push(stems, lc(stem(p)), p);
    const parts = p.split('/');
    for (let n = 1; n < parts.length; n++) dirs.add(lc(parts.slice(0, n).join('/')));
  }
  return { all, names, stems, dirs };
}

const pick = (list, from) => {
  if (!list || !list.length) return null;
  const near = (p) => { let n = 0; const a = from.split('/'), b = p.split('/'); while (n < a.length - 1 && a[n] === b[n]) n++; return n; };
  return { target: [...list].sort((x, y) => near(y) - near(x) || x.length - y.length)[0], ambiguous: list.length > 1 };
};

const tryPath = (idx, p) => {
  for (const c of [p, `${p}.md`, `${p}.markdown`, `${p}/index.md`, `${p}/README.md`]) { const hit = idx.all.get(lc(c)); if (hit) return hit; }
  return idx.dirs.has(lc(p)) ? p : null;
};

// Relative or site-root Markdown link -> { state: ok|missing|outside, target? }
export function resolveHref(from, href, idx) {
  const raw = dec(href.split(/[?#]/)[0]);
  if (!raw) return { state: 'ok', target: from };
  const p = raw.startsWith('/') ? joinRel('x', raw.slice(1)) : joinRel(from, raw);
  if (p == null) return { state: 'outside' };
  const hit = p === '' ? '' : tryPath(idx, p);
  return hit != null ? { state: 'ok', target: hit } : { state: 'missing', target: p };
}

// Obsidian-style [[name]] or ![[name]]: path from the root or the note, else the closest file with that name.
export function resolveWiki(from, name, idx) {
  const t = dec(name).trim().replace(/^\/+/, '');
  if (!t) return { state: 'ok', target: from };
  if (t.includes('/')) {
    const hit = tryPath(idx, t) || tryPath(idx, joinRel(from, t) || t);
    return hit ? { state: 'ok', target: hit } : { state: 'missing', target: t };
  }
  const r = pick(idx.names.get(lc(t)), from) || pick(idx.stems.get(lc(t.replace(DOC, ''))), from);
  return r ? { state: r.ambiguous ? 'ambiguous' : 'ok', target: r.target } : { state: 'missing', target: t };
}
