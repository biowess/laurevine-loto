import { addGroup, assignGroup, createCollection } from './collection.js';

const MD = /\.(md|markdown|mdown)$/i;
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/|#)/i;
const ISSUE = {
  'missing-text': 'could not be read and was skipped',
  'level-clamped': 'heading level capped at 6',
  'missing-file': 'link target not found',
  ambiguous: 'link target is ambiguous',
  'missing-anchor': 'link anchor not found, pointing to the chapter',
  'excluded-target': 'link points to a document outside the collection',
};

export const safeName = (s, fallback = 'Document') => String(s ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || fallback;
export const abs = (root, rel) => `${String(root).replace(/[\\/]+$/, '')}/${rel}`;
export const dirOf = (p) => p.slice(0, p.lastIndexOf('/') + 1);
export const markdownFiles = (files) => files.filter((f) => MD.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

export function workspaceState(files, saved) {
  const s = saved || {}, md = markdownFiles(files), found = new Set(md), seen = new Set(), items = [];
  for (const i of s.items || []) {
    if (!i || !found.has(i.path) || seen.has(i.path)) continue;
    seen.add(i.path);
    items.push({ path: i.path, include: i.include !== false, title: typeof i.title === 'string' ? i.title : '' });
  }
  for (const f of md) if (!seen.has(f)) items.push({ path: f, include: false, title: '' });
  return {
    name: typeof s.name === 'string' ? s.name : '',
    order: s.order || 'manual',
    mode: s.mode === 'separate' ? 'separate' : 'combined',
    preset: typeof s.preset === 'string' ? s.preset : '',
    parts: !!s.parts,
    presets: s.presets && typeof s.presets === 'object' ? s.presets : {},
    items,
  };
}

export function withFolderParts(c) {
  let out = c;
  for (const i of c.items) {
    if (!i.path.includes('/')) continue;
    const dir = i.path.split('/')[0], id = `dir:${dir}`;
    out = assignGroup(addGroup(out, { id, title: dir.replace(/[-_]+/g, ' '), kind: 'part' }), i.path, id);
  }
  return out;
}

export function toCollection(s) {
  const c = createCollection({ name: s.name, order: s.order, items: s.items });
  return s.parts ? withFolderParts(c) : c;
}

const norm = (p) => {
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '..') { if (!out.pop()) return null; } else if (seg && seg !== '.') out.push(seg);
  }
  return out.join('/');
};

export function rebaseImages(text, rel) {
  const dir = dirOf(rel);
  if (!dir) return text;
  let fence = false;
  return text.split('\n').map((ln) => {
    if (/^ {0,3}(```|~~~)/.test(ln)) { fence = !fence; return ln; }
    if (fence) return ln;
    return ln.replace(/(!\[[^\]]*\]\()(<[^>\n]*>|[^)\s]+)/g, (m, open, src) => {
      const raw = src[0] === '<' ? src.slice(1, -1) : src;
      if (EXTERNAL.test(raw)) return m;
      let p = raw;
      try { p = decodeURI(raw); } catch { p = raw; }
      const n = norm(dir + p);
      return n === null ? m : `${open}${encodeURI(n).replace(/\(/g, '%28').replace(/\)/g, '%29')}`;
    });
  }).join('\n');
}

export const issueText = (i) => `${i.path}: ${ISSUE[i.kind] || i.kind}${i.href ? ` (${i.href})` : i.text ? ` (${i.text})` : ''}`;

export function bibliographyWarnings(b) {
  return [
    ...b.missing.map((m) => `Reference @${m.key} not found in any bibliography (${m.paths.join(', ')})`),
    ...b.conflicts.map((c) => `Reference @${c.id} differs between ${c.kept || 'collection'} and ${c.dropped}; the first is used`),
  ];
}

export function summarize(results) {
  const s = { ok: 0, failed: 0, canceled: 0, pages: 0, warnings: 0 };
  for (const r of results) {
    s[r.status === 'ok' ? 'ok' : r.status === 'failed' ? 'failed' : 'canceled']++;
    s.pages += r.pages || 0;
    s.warnings += (r.warnings || []).length;
  }
  return s;
}

export const summaryLine = (s) => `${s.ok} exported${s.failed ? `, ${s.failed} failed` : ''}${s.canceled ? `, ${s.canceled} canceled` : ''} · ${s.pages} pages · ${s.warnings} warning${s.warnings === 1 ? '' : 's'}`;
