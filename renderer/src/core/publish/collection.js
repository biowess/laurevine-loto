import { parseFrontmatter } from '../markdown/frontmatter.js';
import { createSlugger, slugify, DEFAULT_SLUG_STRATEGY } from '../markdown/slug.js';
import { classifyLink, indexFiles, resolveLink } from '../links/resolve.js';
import { extractCitations, generateBibliographyMarkdown } from '../bibliography/citations.js';

export const ORDER_MODES = Object.freeze(['manual', 'filename', 'frontmatter']);
export const GROUP_KINDS = Object.freeze(['part', 'chapter']);
const MAX_LEVEL = 6;
const DOC_EXT = /\.(md|markdown|mdown|txt)$/i;
const LINK = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*(<[^>\n]*>|[^)\s]*)([^)]*)\)/g;
const REFDEF = /^( {0,3}\[[^\]]+\]:\s*)(<[^>\n]*>|\S+)/;

const posix = (p) => String(p ?? '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
const str = (v) => (typeof v === 'string' ? v : '');
const baseName = (p) => p.slice(p.lastIndexOf('/') + 1);
const stem = (p) => baseName(p).replace(/\.[^.]+$/, '');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const clamp = (n) => Math.max(1, Math.min(MAX_LEVEL, n));

const plain = (s) => String(s)
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/[*`]|~~/g, '')
  .replace(/(^|[^\w])_+([^_]+)_+(?=[^\w]|$)/g, '$1$2')
  .trim();

const normItem = (i = {}) => ({ path: posix(i.path), title: str(i.title).trim(), include: i.include !== false, group: i.group || null });
const normGroup = (g = {}) => ({ id: String(g.id ?? ''), title: str(g.title).trim(), kind: GROUP_KINDS.includes(g.kind) ? g.kind : 'part', parent: g.parent || null });

export function createCollection({ name = '', order = 'manual', items = [], groups = [] } = {}) {
  const paths = new Set(), ids = new Set();
  return {
    name: str(name).trim(),
    order: ORDER_MODES.includes(order) ? order : 'manual',
    items: items.map(normItem).filter((i) => i.path && !paths.has(i.path) && paths.add(i.path)),
    groups: groups.map(normGroup).filter((g) => g.id && !ids.has(g.id) && ids.add(g.id)),
  };
}

const patch = (c, path, f) => { const p = posix(path); return { ...c, items: c.items.map((i) => (i.path === p ? { ...i, ...f } : i)) }; };

export const addDocument = (c, path, o = {}) => {
  const p = posix(path);
  return !p || c.items.some((i) => i.path === p) ? c : { ...c, items: [...c.items, normItem({ ...o, path: p })] };
};
export const removeDocument = (c, path) => ({ ...c, items: c.items.filter((i) => i.path !== posix(path)) });
export const setTitle = (c, path, title) => patch(c, path, { title: str(title).trim() });
export const setIncluded = (c, path, include) => patch(c, path, { include: !!include });
export const assignGroup = (c, path, group) => patch(c, path, { group: group && c.groups.some((g) => g.id === group) ? group : null });
export const setOrder = (c, order) => (ORDER_MODES.includes(order) ? { ...c, order } : c);

export function moveDocument(c, path, to) {
  const from = c.items.findIndex((i) => i.path === posix(path));
  if (from < 0) return c;
  const items = [...c.items];
  const [it] = items.splice(from, 1);
  items.splice(Math.max(0, Math.min(items.length, to)), 0, it);
  return { ...c, items };
}

export function addGroup(c, g) {
  const n = normGroup(g);
  if (!n.id || c.groups.some((x) => x.id === n.id)) return c;
  if (n.parent && !c.groups.some((x) => x.id === n.parent)) n.parent = null;
  return { ...c, groups: [...c.groups, n] };
}

export function removeGroup(c, id) {
  const g = c.groups.find((x) => x.id === id);
  if (!g) return c;
  return {
    ...c,
    groups: c.groups.filter((x) => x.id !== id).map((x) => (x.parent === id ? { ...x, parent: g.parent } : x)),
    items: c.items.map((i) => (i.group === id ? { ...i, group: g.parent } : i)),
  };
}

export function validateCollection(c) {
  const issues = [], byId = new Map(c.groups.map((g) => [g.id, g])), seen = new Set();
  for (const i of c.items) {
    if (seen.has(i.path)) issues.push({ kind: 'duplicate-path', path: i.path });
    seen.add(i.path);
    if (i.group && !byId.has(i.group)) issues.push({ kind: 'unknown-group', path: i.path, group: i.group });
  }
  for (const g of c.groups) {
    if (g.parent && !byId.has(g.parent)) issues.push({ kind: 'unknown-parent', group: g.id });
    const chain = new Set([g.id]);
    for (let p = g.parent; p && byId.has(p); p = byId.get(p).parent) {
      if (chain.has(p)) { issues.push({ kind: 'group-cycle', group: g.id }); break; }
      chain.add(p);
    }
  }
  if (!c.items.some((i) => i.include)) issues.push({ kind: 'empty' });
  return issues;
}

const orderValue = (text) => {
  const o = parseFrontmatter(text ?? '').data.order;
  const n = typeof o === 'number' ? o : typeof o === 'string' && o.trim() !== '' ? Number(o) : NaN;
  return Number.isFinite(n) ? n : Infinity;
};

export function orderItems(c, texts = {}) {
  const list = c.items.map((item, idx) => ({ item, idx }));
  if (c.order === 'filename') {
    list.sort((a, b) => natural(baseName(a.item.path), baseName(b.item.path)) || natural(a.item.path, b.item.path) || a.idx - b.idx);
  } else if (c.order === 'frontmatter') {
    const k = new Map(list.map(({ item }) => [item.path, orderValue(texts[item.path])]));
    list.sort((a, b) => { const x = k.get(a.item.path), y = k.get(b.item.path); return (x === y ? 0 : x < y ? -1 : 1) || a.idx - b.idx; });
  }
  return list.map((x) => x.item);
}

function arrange(c, items) {
  const byId = new Map(c.groups.map((g) => [g.id, g]));
  const parentOf = (g) => {
    const seen = new Set([g.id]);
    for (let p = g.parent; p; p = byId.get(p)?.parent) {
      if (seen.has(p) || !byId.has(p)) return null;
      seen.add(p);
    }
    return g.parent;
  };
  const root = { children: [] }, nodes = new Map();
  const nodeFor = (id) => {
    const g = byId.get(id);
    if (!g) return root;
    if (!nodes.has(id)) {
      const n = { group: g, children: [] };
      nodes.set(id, n);
      nodeFor(parentOf(g)).children.push(n);
    }
    return nodes.get(id);
  };
  for (const item of items) nodeFor(item.group).children.push({ item });
  return root;
}

function parseBody(body) {
  const lines = body.split(/\r?\n/), out = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i], f = /^ {0,3}(`{3,}|~{3,})/.exec(ln);
    if (fence) {
      out.push({ t: ln, code: true });
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(ln)) fence = null;
      continue;
    }
    if (f) { fence = f[1]; out.push({ t: ln, code: true }); continue; }
    const a = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/.exec(ln);
    if (a) { out.push({ h: { level: a[1].length, text: (a[2] || '').trim() } }); continue; }
    if (ln.trim() && !/^(\s*([-*+>]|\d+[.)])\s| {4}|\t)/.test(ln) && i + 1 < lines.length && (i === 0 || !lines[i - 1].trim())) {
      const s = /^ {0,3}(=+|-+)[ \t]*$/.exec(lines[i + 1]);
      if (s) { out.push({ h: { level: s[1][0] === '=' ? 1 : 2, text: ln.trim() } }); i++; continue; }
    }
    out.push({ t: ln });
  }
  return out;
}

export function combineBibliography({ shared = [], byDocument = {}, bodies = {}, style = 'author-year' } = {}) {
  const all = new Map(), from = new Map(), conflicts = [];
  const sig = (e) => [e.type, e.title, e.year, e.doi, (e.authors || []).map((a) => a.family).join(',')].join('|').toLowerCase();
  const add = (e, src) => {
    const id = e && e.id;
    if (!id) return;
    if (!all.has(id)) { all.set(id, e); from.set(id, src); } else if (sig(all.get(id)) !== sig(e)) conflicts.push({ id, kept: from.get(id), dropped: src });
  };
  shared.forEach((e) => add(e, ''));
  for (const [p, list] of Object.entries(byDocument)) (list || []).forEach((e) => add(e, p));
  const cited = new Map();
  for (const [p, body] of Object.entries(bodies)) {
    for (const { key } of extractCitations(`\n${body}`)) {
      if (!cited.has(key)) cited.set(key, []);
      if (!cited.get(key).includes(p)) cited.get(key).push(p);
    }
  }
  const entries = [...cited.keys()].filter((k) => all.has(k)).map((k) => all.get(k));
  return {
    entries,
    markdown: generateBibliographyMarkdown(entries, { style }),
    missing: [...cited].filter(([k]) => !all.has(k)).map(([key, paths]) => ({ key, paths })),
    unused: [...all.keys()].filter((k) => !cited.has(k)),
    conflicts,
  };
}

export function mergeCollection(c, { texts = {}, strategy = DEFAULT_SLUG_STRATEGY, baseLevel = 1, bibliographies = {}, entries = [], style = 'author-year' } = {}) {
  const issues = [];
  const present = orderItems(c, texts).filter((i) => {
    if (!i.include) return false;
    if (typeof texts[i.path] === 'string') return true;
    issues.push({ kind: 'missing-text', path: i.path });
    return false;
  });
  const gs = createSlugger(strategy), docs = [], blocks = [];

  const build = (item, depth) => {
    const fm = parseFrontmatter(texts[item.path]);
    const segs = parseBody(fm.body), ls = createSlugger(strategy);
    const heads = segs.filter((s) => s.h).map((s) => s.h);
    for (const h of heads) h.local = ls.slug(plain(h.text) || 'section');
    const min = heads.length ? Math.min(...heads.map((h) => h.level)) : 1;
    const tops = heads.filter((h) => h.level === min);
    const promoted = tops.length === 1 && heads[0].level === min ? heads[0] : null;
    const level0 = baseLevel + depth;
    const title = item.title || (promoted && plain(promoted.text)) || str(fm.data.title).trim() || stem(item.path);
    const raw = item.title || (promoted && promoted.text) || title;
    const chapter = { level: clamp(level0), text: raw, id: gs.slug(plain(raw) || 'section'), chapter: true };
    const delta = (promoted ? level0 : level0 + 1) - min, map = new Map(), headings = [{ ...chapter, origId: promoted ? promoted.local : '' }];
    if (promoted) map.set(promoted.local, chapter.id);
    for (const h of heads) {
      if (h === promoted) { h.out = chapter; continue; }
      if (h.level + delta > MAX_LEVEL) issues.push({ kind: 'level-clamped', path: item.path, text: h.text });
      h.out = { level: clamp(h.level + delta), text: h.text, id: gs.slug(plain(h.text) || 'section') };
      map.set(h.local, h.out.id);
      headings.push({ ...h.out, origId: h.local });
    }
    const doc = { path: item.path, title, level: chapter.level, id: chapter.id, group: item.group, headings, segs, map, ids: heads.map((h) => h.local), chapter, promoted: !!promoted };
    docs.push(doc);
    blocks.push({ type: 'doc', doc });
  };

  const walk = (nodes, depth) => {
    for (const n of nodes) {
      if (n.item) { build(n.item, depth); continue; }
      const text = n.group.title || 'Untitled';
      blocks.push({ type: 'group', level: clamp(baseLevel + depth), text, id: gs.slug(plain(text) || 'section'), kind: n.group.kind });
      walk(n.children, depth + 1);
    }
  };
  walk(arrange(c, present).children, 0);

  const index = indexFiles(c.items.map((i) => i.path)), byPath = new Map(docs.map((d) => [d.path, d]));
  const issue = (kind, doc, href) => issues.push({ kind, path: doc.path, href });

  const rewrite = (doc, href) => {
    const raw = href[0] === '<' ? href.slice(1, -1) : href, kind = classifyLink(raw);
    if (kind !== 'file' && kind !== 'anchor') return null;
    if (kind === 'anchor' && raw === '#') return null;
    if (kind === 'file') {
      const p = raw.split('#')[0].split('?')[0];
      if (!p || (/\.[a-z0-9]+$/i.test(p) && !DOC_EXT.test(p))) return null;
    }
    const x = resolveLink(raw, { from: doc.path, index, anchors: (p) => byPath.get(p)?.ids || null, strategy });
    if (x.status === 'missing-file' || x.status === 'ambiguous') { issue(x.status, doc, raw); return null; }
    const target = byPath.get(x.path);
    if (!target) { if (x.status !== 'unknown') issue('excluded-target', doc, raw); return null; }
    if (!x.anchor) return `#${target.id}`;
    const gid = target.map.get(target.ids.includes(x.anchor) ? x.anchor : slugify(x.anchor, strategy));
    if (gid) return `#${gid}`;
    issue('missing-anchor', doc, raw);
    return kind === 'anchor' ? null : `#${target.id}`;
  };

  const rewriteLine = (doc, line) => {
    const d = REFDEF.exec(line);
    if (d) { const r = rewrite(doc, d[2]); return r ? d[1] + r + line.slice(d[0].length) : line; }
    return line.split(/(`+[^`]*`+)/).map((part, i) => (i % 2 ? part : part.replace(LINK, (m, bang, text, href, rest) => {
      if (bang) return m;
      const r = rewrite(doc, href);
      return r ? `[${text}](${r}${rest})` : m;
    }))).join('');
  };

  const atx = (h) => `${'#'.repeat(h.level)} ${h.text}`.trimEnd();
  for (const d of docs) {
    const lines = d.promoted ? [] : [atx(d.chapter), ''];
    for (const s of d.segs) lines.push(s.h ? atx(s.h.out) : s.code ? s.t : rewriteLine(d, s.t));
    d.markdown = lines.join('\n').replace(/^\n+|\s+$/g, '');
    delete d.segs;
    delete d.chapter;
    delete d.promoted;
  }

  const outline = [], parts = [];
  for (const b of blocks) {
    if (b.type === 'group') {
      outline.push({ type: 'group', level: b.level, text: plain(b.text), id: b.id, kind: b.kind });
      parts.push(atx(b));
    } else {
      b.doc.headings.forEach((h) => outline.push({ type: h.chapter ? 'document' : 'heading', level: h.level, text: plain(h.text), id: h.id, path: b.doc.path }));
      parts.push(b.doc.markdown);
    }
  }

  const bibliography = combineBibliography({
    shared: entries,
    byDocument: Object.fromEntries(docs.map((d) => [d.path, bibliographies[d.path] || []])),
    bodies: Object.fromEntries(docs.map((d) => [d.path, d.markdown])),
    style,
  });

  return {
    markdown: `${parts.join('\n\n')}\n`,
    documents: docs.map((d) => ({ path: d.path, title: d.title, level: d.level, id: d.id, group: d.group, headings: d.headings, markdown: d.markdown })),
    outline,
    anchors: Object.fromEntries(docs.map((d) => [d.path, Object.fromEntries(d.map)])),
    bibliography,
    issues,
  };
}
