import { slugify } from '../markdown/slug.js';

const SCHEME = /^[a-z][a-z0-9+.-]+:/i;

export function classifyLink(href) {
  const s = String(href ?? '').trim();
  if (/^\[\[.*\]\]$/.test(s)) return 'wiki';
  if (s[0] === '#') return 'anchor';
  if (/^mailto:/i.test(s)) return 'mailto';
  if (SCHEME.test(s) || s.startsWith('//')) return 'external';
  return 'file';
}

export function parseWiki(s) {
  const [t, a = ''] = String(s).replace(/^\[\[|\]\]$/g, '').split('|')[0].split('#');
  return { target: t.trim(), anchor: a.trim() };
}

const stem = (p) => p.toLowerCase().replace(/\.(md|markdown|mdown|txt)$/, '');
const dirOf = (p) => p.slice(0, p.lastIndexOf('/') + 1);
const dec = (s) => { try { return decodeURI(s); } catch { return s; } };

function norm(p) {
  const o = [];
  for (const s of p.split('/')) {
    if (s === '..') { if (!o.pop()) return null; } else if (s && s !== '.') o.push(s);
  }
  return o.join('/');
}

// Index of workspace-relative posix paths for fast lookup.
export function indexFiles(files) {
  const set = new Set(files), base = new Map();
  for (const f of files) {
    const k = stem(f).split('/').pop();
    if (!base.has(k)) base.set(k, []);
    base.get(k).push(f);
  }
  return { set, base };
}

// -> { kind, status: external | ok | unknown | missing-file | missing-anchor | ambiguous, path?, anchor?, matches? }
// index: from indexFiles (omit when unknown); anchors(path) -> heading ids or null; from: current file, workspace-relative.
export function resolveLink(href, { from = '', index = null, anchors = null, strategy } = {}) {
  const kind = classifyLink(href), s = String(href).trim();
  if (kind === 'external' || kind === 'mailto') return { kind, status: 'external' };
  let target = from, anchor = '';
  if (kind === 'anchor') anchor = dec(s.slice(1));
  else if (!index) return { kind, status: 'unknown' };
  else if (kind === 'wiki') {
    const w = parseWiki(s);
    anchor = w.anchor;
    if (w.target) {
      const k = stem(w.target), hits = (index.base.get(k.split('/').pop()) || []).filter((f) => stem(f).endsWith(k));
      if (!hits.length) return { kind, status: 'missing-file', anchor };
      const near = hits.filter((f) => dirOf(f) === dirOf(from));
      if (hits.length > 1 && near.length !== 1) return { kind, status: 'ambiguous', matches: hits, anchor };
      target = (near.length === 1 ? near : hits)[0];
    }
  } else {
    const [p, a = ''] = s.split('#');
    anchor = dec(a);
    const path = dec(p.split('?')[0]);
    if (path) {
      target = norm(path[0] === '/' ? path : dirOf(from) + path);
      if (target === null) return { kind, status: 'missing-file', anchor };
      if (!index.set.has(target) && index.set.has(`${target}.md`)) target += '.md';
      if (!index.set.has(target)) return { kind, status: 'missing-file', path: target, anchor };
    }
  }
  if (anchor && anchors) {
    const ids = anchors(target);
    if (ids && !ids.includes(anchor) && !ids.includes(slugify(anchor, strategy))) return { kind, status: 'missing-anchor', path: target, anchor };
  }
  return { kind, status: 'ok', path: target, anchor };
}

const BAD = new Set(['missing-file', 'missing-anchor', 'ambiguous']);

// Per-reference detail for the Document Information page (same rules as summarize).
export function problems(links, images, o) {
  const broken = [], assets = [];
  for (const l of links) { const x = resolveLink(l.href, o); if (BAD.has(x.status)) broken.push({ href: l.href, text: l.text, line: l.line, status: x.status }); }
  for (const i of images) { const x = resolveLink(i.src, o); if (x.status !== 'external') assets.push({ src: i.src, line: i.line, status: x.status }); }
  return { broken, assets };
}

// Counts for the Properties panel. broken/missing are null while the workspace index is unknown.
export function summarize(links, images, o) {
  const r = { links: links.length, internal: 0, external: 0, broken: o.index ? 0 : null, assets: 0, remote: 0, missing: o.index ? 0 : null };
  for (const l of links) {
    const x = resolveLink(l.href, o);
    if (x.status === 'external') r.external++;
    else { r.internal++; if (BAD.has(x.status) && r.broken !== null) r.broken++; }
  }
  for (const i of images) {
    const x = resolveLink(i.src, o);
    if (x.status === 'external') r.remote++;
    else { r.assets++; if (x.status === 'missing-file' && r.missing !== null) r.missing++; }
  }
  return r;
}
