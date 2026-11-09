export const GROUPS = Object.freeze([
  ['preserved', 'Preserved', 'Carried over exactly as written.'],
  ['unsupported', 'Unsupported', 'Kept as plain text or left behind; Laurevine does not interpret it.'],
  ['unresolved', 'Unresolved', 'References that point nowhere or are ambiguous; nothing is rewritten.'],
]);

export function bytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1, x = v;
  do { x /= 1024; i++; } while (x >= 1024 && i < u.length - 1);
  return `${x >= 100 ? Math.round(x) : x.toFixed(1)} ${u[i]}`;
}

const num = (n) => Number(n || 0).toLocaleString('en-US');
const pairs = (o, n = 8) => Object.entries(o || {}).slice(0, n).map(([k, v]) => `${k} (${num(v)})`).join(', ');

export function summary(R) {
  const t = R.totals, L = R.links, unsupported = Object.values(R.unsupported).reduce((s, u) => s + u.count, 0);
  return [
    ['Source', `${R.source.name || 'Unnamed'}${R.source.kinds.length ? ` (${R.source.kinds.join(', ')})` : ''}`],
    ['Markdown Documents', num(t.documents)],
    ['Attachments', `${num(t.attachments)} (${bytes(t.attachmentBytes)})`],
    ['Workspace Size', `${bytes(t.bytes)} in ${num(t.files)} files`],
    ['Internal Links', `${num(L.internal + L.wiki + L.embeds)} (${num(L.internal)} Markdown, ${num(L.wiki)} wiki, ${num(L.embeds)} embeds)`],
    ['External Links', num(L.external)],
    ['Documents with Frontmatter', `${num(R.frontmatter.documents)}${R.frontmatter.errors ? ` (${num(R.frontmatter.errors)} with errors)` : ''}`],
    ['Documents with Wiki-Links', num(R.wikiDocuments)],
    ['Callouts', num(R.callouts.total)],
    ['Unsupported Syntax', `${num(unsupported)} in ${Object.keys(R.unsupported).length} kinds`],
    ['Broken references', num(R.brokenTotal)],
  ];
}

export function items(R) {
  const L = R.links, lists = R.lists || {}, t = R.totals, out = [];
  const brokenBy = (...kinds) => R.broken.filter((b) => kinds.includes(b.kind)).length;
  const add = (group, id, title, count, note, rows, total) => out.push({ id, group, title, count, note, rows, more: Math.max(0, (total ?? count) - rows.length) });
  const fm = lists.frontmatter || [];
  add('preserved', 'frontmatter', 'Frontmatter', R.frontmatter.documents, `${pairs(R.frontmatter.keys, 10) || 'No keys'}${R.frontmatter.errors ? `; ${R.frontmatter.errors} with parse errors` : ''}`, fm);
  add('preserved', 'wiki', 'Wiki-links', L.wiki - brokenBy('wiki'), 'Resolved [[links]]; broken ones are under Unresolved.', lists.wiki || []);
  add('preserved', 'embeds', 'Embeds', L.embeds - R.embeds.broken, `${num(R.embeds.notes)} notes, ${num(R.embeds.attachments)} attachments; broken ones are under Unresolved.`, lists.embed || []);
  add('preserved', 'callouts', 'Callouts', R.callouts.total, pairs(R.callouts.types) || 'None', lists.callout || []);
  add('preserved', 'internal', 'Internal links', L.internal - brokenBy('link', 'image'), `${num(L.images)} images; ${num(L.anchors)} in-page anchors not listed.`, lists.internal || []);
  add('preserved', 'external', 'External links', L.external, pairs(R.externalHosts, 6) || 'None', lists.external || []);
  add('preserved', 'attachments', 'Attachments', t.attachments, pairs(R.attachmentTypes, 10) || 'None', []);
  add('preserved', 'unreferenced', 'Unreferenced attachments', R.unreferencedTotal, 'Copied with the workspace; no document links to them.', R.unreferenced.map((path) => ({ path, line: 0, text: '' })));
  for (const [kind, u] of Object.entries(R.unsupported)) add('unsupported', `unsupported-${kind}`, kind, u.count, `${num(u.documents)} documents; first examples shown.`, u.examples.map((e) => ({ path: e.path, line: e.line, text: '' })));
  add('unsupported', 'skipped', 'Skipped files', R.skipped.length, 'Not scanned.', R.skipped.map((s) => ({ path: s.path, line: 0, text: s.reason })));
  add('unresolved', 'broken', 'Broken references', R.brokenTotal, 'Target not found or outside the source.', R.broken.map((b) => ({ path: b.path, line: b.line, text: `${b.kind}: ${b.target} (${b.reason})` })));
  add('unresolved', 'ambiguous', 'Ambiguous references', L.ambiguous, 'More than one file matches the target.', lists.ambiguous || []);
  return out;
}

export const REPORT_NOTE = 'This is a compatibility report, not a converted HTML publication. It lists what a migration would preserve, leave unsupported or leave unresolved. Your notes are not converted, copied or changed by it.';

export const rowLabel = (r) => (r.line ? `${r.path}:${r.line}` : r.path);

const code = (s) => { const run = Math.max(0, ...(String(s).match(/`+/g) || []).map((m) => m.length)), f = '`'.repeat(run + 1); return `${f} ${String(s).replace(/\s+/g, ' ')} ${f}`; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function toMarkdown(R) {
  const L = ['# Compatibility Report', '', `_${REPORT_NOTE}_`, '', '## Summary', '', ...summary(R).map(([k, v]) => `- **${k}:** ${v.replace(/[*_`<>\\]/g, '\\$&')}`)];
  for (const [g, title, blurb] of GROUPS) {
    L.push('', `## ${title}`, '', `_${blurb}_`);
    for (const it of items(R).filter((i) => i.group === g)) {
      L.push('', `### ${it.title.replace(/[*_`<>\\#]/g, '\\$&')} (${num(it.count)})`, '', it.note.replace(/[*_`<>\\[\]]/g, '\\$&'));
      if (it.rows.length) L.push('', ...it.rows.map((r) => `- ${code(rowLabel(r))}${r.text ? ` — ${code(r.text)}` : ''}`));
      if (it.more) L.push(`- … ${num(it.more)} more not listed`);
    }
  }
  if (R.warnings.length) L.push('', '## Warnings', '', ...R.warnings.map((w) => `- ${w.replace(/[*_`<>\\[\]]/g, '\\$&')}`));
  return `${L.join('\n')}\n`;
}

const CSS = ':root{color-scheme:light dark;--bg:#fff;--fg:#1d2330;--mut:#5d667a;--line:#d9dde6;--p:#1f7a4d;--u:#9a6700;--r:#b42318}@media(prefers-color-scheme:dark){:root{--bg:#161a22;--fg:#e6e9f0;--mut:#9aa3b5;--line:#2c3342;--p:#4cc38a;--u:#e3b341;--r:#ff7b72}}body{font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);max-width:880px;margin:0 auto;padding:24px 16px}h1{font-size:24px}h2{font-size:18px;margin-top:28px}dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}dt{color:var(--mut)}dd{margin:0}details{border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:8px 12px}summary{cursor:pointer;font-weight:600}small,p.n{color:var(--mut)}code{font:13px ui-monospace,monospace;overflow-wrap:anywhere}ul{padding-left:20px}.preserved h2{color:var(--p)}.unsupported h2{color:var(--u)}.unresolved h2{color:var(--r)}';

export function toHtml(R) {
  const body = GROUPS.map(([g, title, blurb]) => `<section class="${g}"><h2>${title}</h2><p class="n">${esc(blurb)}</p>${items(R).filter((i) => i.group === g).map((it) => `<details><summary>${esc(it.title)} (${num(it.count)})</summary><p class="n">${esc(it.note)}</p>${it.rows.length ? `<ul>${it.rows.map((r) => `<li><code>${esc(rowLabel(r))}</code>${r.text ? ` <small>${esc(r.text)}</small>` : ''}</li>`).join('')}${it.more ? `<li><small>… ${num(it.more)} more not listed</small></li>` : ''}</ul>` : it.more ? `<p><small>${num(it.more)} not listed</small></p>` : ''}</details>`).join('')}</section>`).join('');
  const warn = R.warnings.length ? `<section><h2>Warnings</h2><ul>${R.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compatibility Report</title><style>${CSS}</style></head><body><h1>Compatibility Report</h1><p class=\"n\">${esc(REPORT_NOTE)}</p><h2>Summary</h2><dl>${summary(R).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${body}${warn}</body></html>\n`;
}
