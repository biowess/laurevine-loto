// Pure accessibility report: score and Markdown / HTML output (all text escaped in HTML).
import { CATS } from './rules.js';

const W = { error: 10, warning: 4, info: 1 };
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const HEAD = ['Element', 'Mode', 'Ratio', 'Required', 'Result'];

export const failing = (c) => (c || []).filter((r) => r.pass === false);
export const score = (findings, contrast) => Math.max(0, 100 - findings.reduce((n, f) => n + (W[f.severity] || 0), 0) - failing(contrast).length * 3);
export const contrastRow = (r) => [r.name, r.mode, r.ratio == null ? 'n/a' : r.ratio + ':1', r.need + ':1', r.pass == null ? 'Not measured' : r.pass ? 'Pass' : 'Fail'];

function model({ findings, contrast }) {
  const cats = Object.entries(CATS).map(([k, title]) => {
    const it = findings.filter((f) => f.cat === k), n = (s) => it.filter((f) => f.severity === s).length;
    return { title, items: it.map((f) => `Line ${f.line}: ${f.severity}: ${f.message}`), counts: [n('error'), n('warning'), n('info')] };
  });
  const bad = failing(contrast).length;
  cats.push({ title: 'Color contrast', items: [], counts: [bad, 0, 0], table: (contrast || []).map(contrastRow) });
  return cats;
}

export function buildReport({ name, findings, contrast, format = 'md', date }) {
  const sc = score(findings, contrast), cats = model({ findings, contrast }), theme = contrast?.[0]?.theme;
  if (format === 'html') {
    const sec = (c) => `<h2>${esc(c.title)}</h2>` + (c.table
      ? `<p>Preview theme: ${esc(theme || 'default')} (WCAG AA)</p><table><thead><tr>${HEAD.map((x) => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${c.table.map((r) => `<tr>${r.map((x, i) => (i ? `<td>${esc(x)}</td>` : `<th scope="row">${esc(x)}</th>`)).join('')}</tr>`).join('')}</tbody></table>`
      : c.items.length ? `<ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p>No issues found.</p>');
    return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Accessibility Report</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#222}table{border-collapse:collapse}th,td{border:1px solid #888;padding:.25rem .6rem;text-align:left}</style></head><body><h1>Accessibility Report</h1><ul><li>Document: ${esc(name)}</li><li>Date: ${esc(date)}</li><li>Score: ${sc}/100</li></ul><table><caption>Findings by category</caption><thead><tr><th scope="col">Category</th><th scope="col">Errors</th><th scope="col">Warnings</th><th scope="col">Info</th></tr></thead><tbody>${cats.map((c) => `<tr><th scope="row">${esc(c.title)}</th>${c.counts.map((n) => `<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table>${cats.map(sec).join('')}</body></html>\n`;
  }
  const L = ['# Accessibility Report', '', `- Document: ${name}`, `- Date: ${date}`, `- Score: ${sc}/100`, '', '| Category | Errors | Warnings | Info |', '|---|---:|---:|---:|'];
  for (const c of cats) L.push(`| ${c.title} | ${c.counts.join(' | ')} |`);
  for (const c of cats) {
    L.push('', `## ${c.title}`, '');
    if (c.table) L.push(`Preview theme: ${theme || 'default'} (WCAG AA)`, '', `| ${HEAD.join(' | ')} |`, '|---|---|---:|---:|---|', ...c.table.map((r) => `| ${r.join(' | ')} |`));
    else if (c.items.length) L.push(...c.items.map((i) => `- ${i}`));
    else L.push('No issues found.');
  }
  return L.join('\n') + '\n';
}
