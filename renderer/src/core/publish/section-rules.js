import { extractHeadings } from '../toc/headings.js';
import { slugify } from '../markdown/slug.js';

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 80);
const hash = (s) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.codePointAt(0), 16777619); return s ? (x >>> 0).toString(36) : ''; };

// Headings of Markdown text with stable keys: slug + occurrence index + fingerprint of the nearest text below. Pure; never edits the text.
export function outlineKeys(text) {
  const ls = text.split('\n'), hs = extractHeadings(text), seen = new Map(), stack = [];
  return hs.map((x, i) => {
    const slug = slugify(x.text) || 'section', occ = seen.get(slug) || 0;
    seen.set(slug, occ + 1);
    const body = ls.slice(x.line + 1, i + 1 < hs.length ? hs[i + 1].line : ls.length).filter((l) => l.trim() && !/^\s{0,3}(=+|-+)\s*$/.test(l)).join(' ');
    while (stack.length && stack[stack.length - 1] >= x.level) stack.pop();
    const depth = stack.length;
    stack.push(x.level);
    return { ...x, slug, occ, fp: hash(norm(body)), depth, key: `${slug}~${occ}` };
  });
}

const PASSES = [
  [(r, x) => r.slug === x.slug && r.occ === x.occ && r.fp === x.fp, false],
  [(r, x) => r.slug === x.slug && r.fp !== '' && r.fp === x.fp, false],
  [(r, x) => r.slug === x.slug && r.occ === x.occ, false],
  [(r, x) => r.fp !== '' && r.fp === x.fp && r.level === x.level, true],
];

// Re-matches stored rules to the current headings (exact, occurrence moved, text edited, heading renamed). -> { byHead: Map(index -> rule), stale: [rule] }
export function matchRules(rules, hs) {
  const byHead = new Map(), done = new Set(), free = hs.map((_, i) => i);
  for (const [test, unique] of PASSES) {
    for (const r of rules) {
      if (done.has(r.id)) continue;
      const c = free.filter((i) => !byHead.has(i) && test(r, hs[i])).sort((a, b) => Math.abs(hs[a].occ - r.occ) - Math.abs(hs[b].occ - r.occ));
      if (!c.length || (unique && c.length > 1)) continue;
      byHead.set(c[0], r); done.add(r.id);
    }
  }
  return { byHead, stale: rules.filter((r) => !done.has(r.id)) };
}

let n = 0;
const newId = (rules) => { let id; do id = `r${Date.now().toString(36)}${(n++).toString(36)}`; while (rules.some((r) => r.id === id)); return id; };

// Applies `patch` to the rules of headings `idx` (creating them), refreshing their keys. -> new rules list.
export function assignRules(rules, hs, byHead, idx, patch) {
  const out = rules.slice();
  for (const i of idx) {
    const x = hs[i], old = byHead.get(i), r = { ...(old || { id: newId(out) }), slug: x.slug, occ: x.occ, fp: x.fp, text: x.text.slice(0, 200), level: x.level, ...patch };
    const at = old ? out.findIndex((o) => o.id === old.id) : -1;
    if (at >= 0) out[at] = r; else out.push(r);
  }
  return out;
}

export const clearRules = (rules, byHead, idx) => {
  const ids = new Set(idx.map((i) => byHead.get(i)).filter(Boolean).map((r) => r.id));
  return rules.filter((r) => !ids.has(r.id));
};

// Determines if a section can be continuous or forces a new page and the reason.
export function sectionBreakInfo(rule, prevRule) {
  if (!rule) return { continuous: true, reason: '' };
  if (rule.brBefore) return { continuous: false, reason: 'Explicit page break before' };
  if (prevRule && prevRule.brAfter) return { continuous: false, reason: 'Previous section forced page break after' };
  if (rule.style && rule.style !== 'none') return { continuous: false, reason: `Page style (${rule.style}) requires a new page` };
  if (rule.mOn) return { continuous: false, reason: 'Margin override requires a new page' };
  if ((rule.hdr && rule.hdr !== 'inherit') || (rule.ftr && rule.ftr !== 'inherit')) {
    return { continuous: false, reason: 'Header/footer override requires a new page' };
  }
  const curCols = rule.cols || 'auto';
  const prevCols = (prevRule && prevRule.cols) || 'auto';
  if (prevCols !== 'auto' && prevCols !== '1' && curCols !== 'auto' && curCols !== '1' && curCols !== prevCols) {
    return { continuous: false, reason: `Switching between ${prevCols} and ${curCols} columns requires a new page` };
  }
  return { continuous: true, reason: '' };
}

const NONE = '@top-left{content:none}@top-center{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}';
const q = (s) => `"${String(s || '').replace(/[\\"]/g, '\\$&')}"`;

// Emits @page and section layout CSS for active section rules.
export function sectionRulesCss(rules, cfg = {}) {
  if (!rules || !rules.length) return '';
  const out = [];
  for (const r of rules) {
    const sel = `.lv-sec-${r.id}`;
    if (r.cols && r.cols !== 'auto') {
      const gap = r.gap > 0 ? `${r.gap}mm` : '1.5em';
      const sep = r.sep === 'line' ? 'column-rule: 1px solid var(--bd);' : r.sep === 'none' ? 'column-rule: none;' : '';
      out.push(`${sel}{column-count:${r.cols};column-gap:${gap};${sep}}`);
      if (r.cols === '1' && cfg.columns && cfg.columns.count > 1) out.push(`${sel}{column-span:all;width:100%}`);
    }
    const pName = `lv-page-${r.id}`;
    const needsPage = r.mOn || (r.hdr && r.hdr !== 'inherit') || (r.ftr && r.ftr !== 'inherit') || (r.style && r.style !== 'none');
    if (needsPage) {
      out.push(`${sel}{page:${pName}}`);
      const pgRules = [];
      if (r.mOn) pgRules.push(`margin:${r.mt}mm ${r.mr}mm ${r.mb}mm ${r.ml}mm;`);
      if (r.hdr === 'hide') pgRules.push('@top-left{content:none}@top-center{content:none}@top-right{content:none}');
      else if (r.hdr === 'custom') pgRules.push(`@top-center{content:${q(r.hdrText)};font-size:9pt;color:var(--t2);}`);
      if (r.ftr === 'hide') pgRules.push('@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}');
      else if (r.ftr === 'custom') pgRules.push(`@bottom-center{content:${q(r.ftrText)};font-size:9pt;color:var(--t2);}`);
      if (r.style === 'cover') pgRules.push(NONE);
      out.push(`@page ${pName}{${pgRules.join('')}}`);
    }
  }
  out.push('.lv-sec{box-sizing:border-box}.lv-sec.lv-pb{break-before:page}.lv-sec.lv-pa{break-after:page}');
  out.push('.lv-sec-cover{min-height:60vh;display:flex;flex-direction:column;justify-content:center;text-align:center}');
  return out.join('\n');
}
