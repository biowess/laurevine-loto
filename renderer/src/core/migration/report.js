import { analyzeDocument } from './analyze.js';
import { buildIndex, resolveHref, resolveWiki } from './resolve.js';
import { parseObsidian } from './obsidian.js';

const DOC = /\.(md|markdown|mdown|mkd|mdx)$/i;
const ATTACH = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?|heic|pdf|mp3|wav|ogg|flac|m4a|aac|opus|mp4|webm|mov|mkv|m4v|docx?|xlsx?|pptx?|odt|ods|odp|csv|tsv|zip|7z|tar|gz|epub|ttf|otf|woff2?)$/i;
const DOCS_MARKERS = ['mkdocs.yml', 'mkdocs.yaml', 'docusaurus.config.js', 'docusaurus.config.ts', '_config.yml', 'book.toml', 'conf.py', '.readthedocs.yaml', 'summary.md', 'hugo.toml', 'config.toml', 'astro.config.mjs', 'vuepress.config.js', '_sidebar.md'];
export const LIMITS = Object.freeze({ broken: 500, examples: 5, keys: 40, unreferenced: 100, list: 200 });

export function classify(rel) {
  if (rel.startsWith('.obsidian/')) return 'config';
  if (DOC.test(rel)) return 'document';
  if (/\.canvas$/i.test(rel)) return 'canvas';
  return ATTACH.test(rel) ? 'attachment' : 'other';
}

const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const top = (o, n) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n));

export function sourceKind({ paths, fromZip, obsidian, assetRefs }) {
  const lower = new Set(paths.map((p) => p.toLowerCase())), kinds = [];
  if (obsidian) kinds.push('obsidian-vault');
  if (paths.some((p) => DOCS_MARKERS.includes(p.toLowerCase().split('/').pop()) && p.split('/').length <= 2) || (lower.has('package.json') && paths.some((p) => /^docs\//i.test(p) && DOC.test(p)))) kinds.push('documentation-repository');
  if (fromZip) kinds.push('markdown-archive');
  if (assetRefs > 0) kinds.push('collection-with-relative-assets');
  if (!kinds.length || (!obsidian && !kinds.includes('documentation-repository') && !fromZip && !assetRefs)) kinds.push('markdown-folder');
  return kinds;
}

// files: [{ path, size }] (all non-ignored files); docs: [{ path, size, text }] or already analysed [{ path, size, a }]; config: texts of the .obsidian data files.
export function buildReport({ name = '', fromZip = false, files, docs, config = {}, skipped = [], warnings = [] }) {
  const idx = buildIndex(files.map((f) => f.path)), kinds = Object.fromEntries(files.map((f) => [f.path, classify(f.path)]));
  const R = { totals: { files: files.length, documents: 0, attachments: 0, canvas: 0, other: 0, config: 0, bytes: 0, documentBytes: 0, attachmentBytes: 0 }, attachmentTypes: {}, links: { internal: 0, external: 0, anchors: 0, wiki: 0, embeds: 0, images: 0, broken: 0, ambiguous: 0 }, externalHosts: {}, frontmatter: { documents: 0, errors: 0, keys: {} }, wikiDocuments: 0, callouts: { total: 0, types: {} }, embeds: { notes: 0, attachments: 0, broken: 0 }, unsupported: {}, broken: [], brokenTotal: 0, unreferenced: [], unreferencedTotal: 0, lists: { internal: [], external: [], wiki: [], embed: [], callout: [], frontmatter: [], ambiguous: [] }, skipped, warnings };
  const note = (key, path, line, text) => { const l = R.lists[key]; if (l.length < LIMITS.list) l.push({ path, line, text }); };
  for (const f of files) {
    const k = kinds[f.path], t = R.totals;
    t.bytes += f.size;
    if (k === 'document') { t.documents++; t.documentBytes += f.size; } else if (k === 'attachment') { t.attachments++; t.attachmentBytes += f.size; bump(R.attachmentTypes, (f.path.split('.').pop() || '').toLowerCase()); } else t[k]++;
  }
  const used = new Set();
  const miss = (path, line, kind, target, reason) => { R.brokenTotal++; if (R.broken.length < LIMITS.broken) R.broken.push({ path, line, kind, target, reason }); };
  let assetRefs = 0;
  for (const d of docs) {
    const a = d.a || analyzeDocument(d.text), L = R.links;
    if (a.fm.present) { note('frontmatter', d.path, 1, a.fm.error ? `invalid: ${String(a.fm.error)}` : a.fm.keys.join(', ')); R.frontmatter.documents++; if (a.fm.error) R.frontmatter.errors++; for (const key of a.fm.keys) bump(R.frontmatter.keys, key); }
    if (a.links.some((l) => l[0] === 'wiki')) R.wikiDocuments++;
    for (const [type, cline] of a.callouts) { note('callout', d.path, cline, type); R.callouts.total++; bump(R.callouts.types, type); }
    for (const [kind, line] of a.unsupported) { const u = R.unsupported[kind] ||= { count: 0, documents: 0, examples: [], last: '' }; u.count++; if (u.last !== d.path) { u.documents++; u.last = d.path; } if (u.examples.length < LIMITS.examples) u.examples.push({ path: d.path, line }); }
    for (const [kind, target, line] of a.links) {
      if (kind === 'external') { L.external++; note('external', d.path, line, target); try { bump(R.externalHosts, new URL(target).hostname || target.split(':')[0]); } catch { bump(R.externalHosts, 'other'); } continue; }
      if (kind === 'anchor') { L.anchors++; continue; }
      const r = kind === 'wiki' || kind === 'embed' ? resolveWiki(d.path, target, idx) : resolveHref(d.path, target, idx);
      if (kind === 'wiki') L.wiki++; else if (kind === 'embed') L.embeds++; else { L.internal++; if (kind === 'image') L.images++; }
      if (r.state === 'ambiguous') { L.ambiguous++; note('ambiguous', d.path, line, target); }
      if (r.state === 'missing' || r.state === 'outside') { L.broken++; if (kind === 'embed') R.embeds.broken++; miss(d.path, line, kind, target, r.state === 'outside' ? 'points outside the source' : 'target not found'); continue; }
      note(kind === 'wiki' ? 'wiki' : kind === 'embed' ? 'embed' : 'internal', d.path, line, target);
      if (r.target && kinds[r.target]) { used.add(r.target); if (kinds[r.target] === 'attachment') { assetRefs++; if (kind === 'embed') R.embeds.attachments++; } else if (kind === 'embed') R.embeds.notes++; }
    }
  }
  for (const f of files) if (kinds[f.path] === 'attachment' && !used.has(f.path)) { R.unreferencedTotal++; if (R.unreferenced.length < LIMITS.unreferenced) R.unreferenced.push(f.path); }
  for (const u of Object.values(R.unsupported)) delete u.last;
  R.frontmatter.keys = top(R.frontmatter.keys, LIMITS.keys);
  R.externalHosts = top(R.externalHosts, 20);
  const obsidian = Object.keys(config).length || files.some((f) => f.path.startsWith('.obsidian/')) ? parseObsidian(config, R.totals.canvas) : null;
  R.obsidian = obsidian;
  R.source = { name, fromZip, kinds: sourceKind({ paths: files.map((f) => f.path), fromZip, obsidian, assetRefs }) };
  return R;
}
