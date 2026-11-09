import { buildIndex, resolveWiki } from './resolve.js';
import { classify } from './report.js';

export const MAX_DOC = 10 * 1024 * 1024;
const WIKI = /(!?)\[\[([^[\]\n|]+)(?:\|([^[\]\n]*))?\]\]/g;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
const slugOf = (t) => t.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');

export function relPath(from, to) {
  const a = from.split('/').slice(0, -1), b = to.split('/');
  let n = 0;
  while (n < a.length && n < b.length - 1 && a[n] === b[n]) n++;
  return [...Array(a.length - n).fill('..'), ...b.slice(n)].join('/');
}

function segment(seg, from, idx, hit, line) {
  return seg.replace(WIKI, (m, bang, raw, alias) => {
    const [name, ...rest] = raw.split('#'), nm = name.trim(), heading = rest.join('#').trim();
    const r = nm ? resolveWiki(from, nm, idx) : null;
    const known = r && r.state === 'ok' && r.target && r.target !== from && idx.all.has(r.target.toLowerCase());
    const doc = known && classify(r.target) === 'document';
    if (!known || (bang && doc)) { hit.skipped++; return m; }
    const text = alias && !/^\d+(x\d+)?$/.test(alias.trim()) ? alias.trim() : '';
    const anchor = doc && heading && !heading.startsWith('^') ? `#${slugOf(heading)}` : '';
    const href = enc(relPath(from, r.target)) + anchor;
    const out = bang ? `![${text}](${href})` : `[${text || (heading && !heading.startsWith('^') ? `${nm} > ${heading}` : nm)}](${href})`;
    hit.count++;
    if (hit.examples.length < 3) hit.examples.push({ line, from: m, to: out });
    return out;
  });
}

// Wiki-links and attachment embeds -> relative Markdown links. Code, front matter, unresolved or ambiguous targets and note embeds are left untouched.
export function convertText(text, from, idx) {
  const lines = text.split('\n'), hit = { count: 0, skipped: 0, examples: [] };
  let fence = null, fm = lines[0] === '---' && lines.slice(1).some((l) => l.trim() === '---');
  const out = lines.map((ln, i) => {
    if (fm) { if (i > 0 && ln.trim() === '---') fm = false; return ln; }
    const f = FENCE.exec(ln);
    if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !ln.replace(FENCE, '').trim()) fence = null; return ln; }
    if (f) { fence = f[1]; return ln; }
    if (!ln.includes('[[')) return ln;
    return ln.split(/(`+[^`]*`+)/).map((s, k) => (k % 2 ? s : segment(s, from, idx, hit, i + 1))).join('');
  });
  return { text: out.join('\n'), ...hit };
}

// docs: [{ path, text }] of the copy; paths: every file of the copy. -> { files: [{ path, text, count, skipped, examples }], links, skipped }
export function planConversions(docs, paths) {
  const idx = buildIndex(paths), files = [];
  let links = 0, skipped = 0;
  for (const d of docs) {
    const r = convertText(d.text, d.path, idx);
    skipped += r.skipped;
    if (r.count && r.text !== d.text) { files.push({ path: d.path, text: r.text, count: r.count, skipped: r.skipped, examples: r.examples }); links += r.count; }
  }
  return { files, links, skipped };
}

export const planCopy = (files) => files.filter((f) => ['document', 'attachment'].includes(classify(f.path)));

export const needsKnowledge = (report) => !!report && (report.wikiDocuments > 0 || report.links.wiki > 0 || report.links.embeds > 0 || report.callouts.total > 0);

// -> [[settingKey, value, label]] suggested for a new workspace
export function suggestSettings(report) {
  const list = [], o = report.obsidian, wiki = report.wikiDocuments > 0 || report.links.wiki > 0 || report.links.embeds > 0;
  if (wiki) list.push(['markdown.wikiLinks', true, 'Recognize wiki-links and embeds']);
  const dir = o && o.attachmentFolder.mode === 'folder' && o.attachmentFolder.path.length <= 120 ? o.attachmentFolder.path : report.totals.attachments > 0 ? 'assets' : '';
  if (dir) list.push(['images.assetDir', dir, `Attachment folder: ${dir}`]);
  return list;
}
