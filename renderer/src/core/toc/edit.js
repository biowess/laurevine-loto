import { scanLines } from './headings.js';
import { findRegions, refreshToc, tocMarkers } from './region.js';
import { TOC_DEFAULTS } from './generate.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const diffOpts = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => k in TOC_DEFAULTS && !same(v, TOC_DEFAULTS[k])));
const span = (ls, r) => [ls[r.startLine].off, ls[r.endLine].off + ls[r.endLine].s.length];

// Valid region whose marker lines or content contain `pos` -> region + {s, e} (offsets of start marker and end of end marker), or null.
export function tocAt(text, pos) {
  const ls = scanLines(text);
  for (const r of findRegions(text).regions) {
    const [s, e] = span(ls, r);
    if (pos >= s && pos <= e) return { ...r, s, e };
  }
  return null;
}

// Insert a new TOC at `pos` (id omitted) or replace the one under it (id given) -> { change:{from,to,insert}, id, text, warnings } | { error }.
export function planToc(text, { pos, id, opts = {}, strategy }) {
  const ls = scanLines(text), eol = text.includes('\r\n') ? '\r\n' : '\n', regs = findRegions(text).regions;
  const cur = id != null ? tocAt(text, pos) : null;
  if (id != null && !cur) return { error: 'The TOC under the caret is gone.' };
  if (id == null && tocAt(text, pos)) return { error: 'The caret is inside a TOC.' };
  const nid = id ?? `toc-${(() => { let n = 1; while (regs.some((r) => r.id === `toc-${n}`)) n++; return n; })()}`;
  const m = tocMarkers(nid, diffOpts(opts)), core = `${m.start}${eol}${m.end}`;
  let from, to, pre = '', suf = '';
  if (cur) { from = cur.s; to = cur.e; } else {
    let i = ls.length - 1;
    while (i > 0 && ls[i].off > pos) i--;
    const l = ls[i], blank = !l.s.trim();
    if (l.code) return { error: 'The caret is inside a code block.' };
    from = to = blank ? l.off : l.off + l.s.length;
    pre = blank ? (ls[i - 1] && ls[i - 1].s.trim() ? eol : '') : eol + eol;
    suf = blank ? eol : ls[i + 1] && ls[i + 1].s.trim() ? eol : '';
  }
  const t1 = text.slice(0, from) + pre + core + suf + text.slice(to), res = refreshToc(t1, { id: nid, strategy });
  const bad = res.problems.find((p) => !p.region);
  if (bad) return { error: `${bad.message} (line ${bad.line + 1})` };
  if (!res.refreshed.includes(nid)) return { error: (res.problems[0] || {}).message || 'The TOC could not be generated.' };
  return { id: nid, text: res.text, warnings: res.warnings, change: { from, to, insert: res.text.slice(from, res.text.length - (text.length - to)) } };
}

// Changes refreshing the valid regions (all, or `id`), skipping any that hold `skipPos`; only the content between markers changes.
// -> { changes:[{from,to,insert}], problems, warnings }
export function refreshChanges(text, { strategy, id, skipPos } = {}) {
  const res = refreshToc(text, { strategy, id }), changes = [];
  if (!res.changed) return { changes, problems: res.problems, warnings: res.warnings };
  const ls = scanLines(text), old = findRegions(text).regions, now = findRegions(res.text).regions;
  old.forEach((r, i) => {
    if (r.error || (id != null && r.id !== id)) return;
    const [s, e] = span(ls, r), ins = res.text.slice(now[i].from, now[i].to);
    if (ins !== text.slice(r.from, r.to) && !(skipPos != null && skipPos >= s && skipPos <= e)) changes.push({ from: r.from, to: r.to, insert: ins });
  });
  return { changes, problems: res.problems, warnings: res.warnings };
}
