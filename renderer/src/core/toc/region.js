import { scanLines, extractHeadings } from './headings.js';
import { generateToc, withIds } from './generate.js';
import { anchorWarning, DEFAULT_SLUG_STRATEGY } from '../markdown/slug.js';

const START = /^ {0,3}<!--\s*laurevine:toc:start(?:\s+id="([^"\n]*)")?(?:\s+(\{.*\}))?\s*-->\s*$/;
const END = /^ {0,3}<!--\s*laurevine:toc:end\s*-->\s*$/;

// Marker lines for a region; options are written as compact JSON ('<' and '>' escaped so a title cannot close the comment).
export function tocMarkers(id, options = {}) {
  const json = Object.keys(options).length ? ` ${JSON.stringify(options).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')}` : '';
  return { start: `<!-- laurevine:toc:start id="${String(id).replace(/["\r\n]/g, '')}"${json} -->`, end: '<!-- laurevine:toc:end -->' };
}

// -> { regions: [{id, opts, startLine, endLine, from, to, error?}], problems: [{kind, line, message, region?}] }
// Markers sit alone on a line outside fenced code; `from`/`to` bound the content between them. Nothing is guessed.
export function findRegions(text) {
  const ls = scanLines(text), regions = [], problems = [];
  let open = null;
  const bad = (kind, line, message, region) => problems.push({ kind, line, message, ...(region ? { region: true } : {}) });
  ls.forEach((l, i) => {
    if (l.code || !l.s.includes('laurevine:toc:')) return;
    const st = START.exec(l.s);
    if (st) {
      if (open) return bad('nested-start', i, `TOC start inside the region opened on line ${open.startLine + 1}.`);
      let opts = {}, err = null;
      if (st[2]) { try { opts = JSON.parse(st[2]); } catch { err = 'bad-options'; } if (!err && (!opts || typeof opts !== 'object' || Array.isArray(opts))) err = 'bad-options'; }
      open = { id: st[1] ?? '', opts: err ? {} : opts, startLine: i, from: ls[i + 1] ? ls[i + 1].off : text.length, ...(err ? { error: err } : {}) };
    } else if (END.test(l.s)) {
      if (!open) return bad('orphan-end', i, 'TOC end without a start.');
      regions.push({ ...open, endLine: i, to: l.off });
      open = null;
    } else bad('bad-marker', i, 'Unrecognized TOC marker.');
  });
  if (open) bad('unclosed', open.startLine, 'TOC start without an end.');
  const count = new Map();
  regions.forEach((r) => count.set(r.id, (count.get(r.id) || 0) + 1));
  regions.forEach((r) => {
    if (r.error) bad('bad-options', r.startLine, 'TOC options are not a valid JSON object.', true);
    else if (count.get(r.id) > 1) { r.error = 'duplicate-id'; bad('duplicate-id', r.startLine, `TOC id "${r.id}" is used more than once.`, true); }
  });
  return { regions, problems };
}

// Rebuilds the content between TOC markers (all valid regions, or only `id`). Text outside the regions is never touched.
// Any structural marker problem (nested/orphan/unclosed/unrecognised) leaves the text unchanged; bad or duplicated regions are skipped.
// -> { text, changed, refreshed: [ids], problems, warnings }
export function refreshToc(text, { strategy = DEFAULT_SLUG_STRATEGY, id } = {}) {
  const { regions, problems } = findRegions(text);
  const res = { text, changed: false, refreshed: [], problems, warnings: [] };
  if (problems.some((p) => !p.region)) return res;
  const todo = regions.filter((r) => !r.error && (id == null || r.id === id));
  if (id != null && !regions.some((r) => r.id === id)) problems.push({ kind: 'not-found', line: -1, message: `No TOC region with id "${id}".` });
  if (!todo.length) return res;
  const hs = extractHeadings(text, { skip: todo.map((r) => [r.startLine, r.endLine]) });
  todo.forEach((r) => {
    const t = String(r.opts.title || '').replace(/[\r\n]+/g, ' ').trim();
    if (t) hs.push({ level: Math.min(6, Math.max(1, r.opts.titleLevel | 0 || 2)), text: t, line: r.startLine, synthetic: true });
  });
  hs.sort((a, b) => a.line - b.line);
  const all = withIds(hs.map(({ id: _x, ...h }) => h), strategy);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let out = text;
  for (const r of [...todo].reverse()) {
    const md = generateToc(all, { ...r.opts, strategy, containerLine: r.startLine });
    out = out.slice(0, r.from) + (md ? md.replace(/\n/g, eol) + eol : '') + out.slice(r.to);
  }
  const w = anchorWarning(strategy, all.filter((h) => !h.synthetic).map((h) => h.text));
  if (w) res.warnings.push(w);
  return { ...res, text: out, changed: out !== text, refreshed: todo.map((r) => r.id) };
}
