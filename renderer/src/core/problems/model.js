// Pure Problems model: runs validation (33a) and accessibility (33b) rules as small tasks, merges, de-duplicates, attaches safe quick fixes.
// plan(text, {disabled}) -> [() => raw[]]; finish(text, parts, {severity}) -> { list, counts, total } with
// list items { key, id, cat, severity, message, from, to, line, fix?: { label, from, to, insert, was, prompt? } } sorted by position.
import { listRules, runDiagnostics } from '../diagnostics/index.js';
import { lineIndex } from '../diagnostics/rules.js';
import { runA11y, CATS } from '../a11y/rules.js';
import { extractHeadings } from '../toc/headings.js';
import { findRepeated } from '../proofread/repeated-words.js';
import { styleHints } from '../proofread/style-hints.js';

export const TITLES = {
  'markdown-syntax': 'Markdown Syntax', 'heading-structure': 'Heading Hierarchy', links: 'Links', images: 'Images', frontmatter: 'Frontmatter',
  'table-structure': 'Table Structure', 'extension-compatibility': 'Compatibility', 'marker-integrity': 'TOC and Bibliography Markers',
  'a11y-headings': 'Accessibility: Headings', 'a11y-alt': 'Accessibility: Alt Text', 'a11y-links': 'Accessibility: Link Labels', 'a11y-tables': 'Accessibility: Table Headers',
  'repeated-words': 'Proofreading: Repeated Words', 'style-hints': 'Proofreading: Style Hints (English)', grammar: 'Proofreading: Grammar (online service)',
};
const MAX = 2000, SEV = ['error', 'warning', 'info'];
const DUP = { 'a11y.heading-empty': 'headings.empty', 'a11y.heading-skip': 'headings.skipped-level', 'a11y.alt-missing': 'images.empty-alt' };

export function plan(text, { disabled = new Set() } = {}) {
  const t = String(text ?? ''), tasks = [];
  let li;
  const L = () => li || (li = lineIndex(t));
  for (const r of listRules()) if (!disabled.has(r.id)) tasks.push(() => runDiagnostics(t, { rules: [r.id] }).map((d) => ({ ...d, cat: r.id })));
  for (const k of Object.keys(CATS)) {
    if (!disabled.has('a11y-' + k)) tasks.push(() => runA11y(t, k).map((f) => ({ id: f.id, severity: f.severity, message: f.message, range: L().lineRange(f.line - 1), cat: 'a11y-' + k })));
  }
  if (!disabled.has('repeated-words')) tasks.push(() => findRepeated(t).map((r) => ({ id: 'proofread.repeated-word', severity: 'warning', message: `Repeated word “${r.word}”`, range: { from: r.from, to: r.to }, fix: { label: 'Remove duplicate', from: r.fix.from, to: r.fix.to, insert: '' }, cat: 'repeated-words' })));
  if (!disabled.has('style-hints')) tasks.push(() => styleHints(t).map((x) => ({ id: 'style.' + x.kind, severity: 'info', message: x.message, range: { from: x.from, to: x.to }, cat: 'style-hints' })));
  return tasks;
}

export function finish(text, parts, { severity = {} } = {}) {
  const t = String(text ?? ''), { lines, starts, lineRange } = lineIndex(t);
  const lineOf = (p) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= p) lo = m; else hi = m - 1; } return lo; };
  let all = parts.flat();
  const seen = new Set(all.filter((d) => !d.id.startsWith('a11y.')).map((d) => d.id + '@' + lineOf(d.range.from)));
  all = all.filter((d) => !(DUP[d.id] && seen.has(DUP[d.id] + '@' + lineOf(d.range.from))));
  const lvl = new Map();
  if (all.some((d) => /heading-skip|skipped-level/.test(d.id))) {
    let prev = 0;
    for (const h of extractHeadings(t)) { if (prev && h.level > prev + 1) lvl.set(h.line, prev + 1); prev = h.level; }
  }
  const counts = { error: 0, warning: 0, info: 0 };
  const list = all.map((d) => {
    const ln = lineOf(d.range.from), line = lines[ln] ?? '';
    let fix = d.fix;
    if (d.id === 'images.empty-alt' && fix) fix = { ...fix, prompt: 'Alt text' };
    else if (/heading-skip|skipped-level/.test(d.id) && lvl.has(ln)) {
      const m = /^( {0,3})(#{1,6})(?=\s|$)/.exec(line), at = starts[ln] + (m ? m[1].length : 0);
      if (m) fix = { label: `Change to H${lvl.get(ln)}`, from: at, to: at + m[2].length, insert: '#'.repeat(lvl.get(ln)) };
    } else if (/heading-empty|headings\.empty/.test(d.id) && /^\s{0,3}#{1,6}\s*#*\s*$/.test(line) && !t.slice(lineRange(ln).to).trim()) {
      fix = { label: 'Remove empty heading', from: starts[ln], to: t.length, insert: '' };
    }
    if (fix) fix = { ...fix, was: t.slice(fix.from, fix.to) };
    const sv = SEV.includes(severity[d.cat]) ? severity[d.cat] : SEV.includes(d.severity) ? d.severity : 'info';
    counts[sv]++;
    return { key: `${d.id}:${d.range.from}`, id: d.id, cat: d.cat, severity: sv, message: d.message, from: d.range.from, to: Math.max(d.range.to, d.range.from), line: ln + 1, fix };
  }).sort((a, b) => a.from - b.from || a.to - b.to);
  return { list: list.slice(0, MAX), counts, total: list.length };
}
