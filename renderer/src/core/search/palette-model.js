import { rank } from './fuzzy.js';

export function parseQuery(raw) {
  const s = String(raw).trimStart(), c = s[0];
  const mode = c === '@' ? 'headings' : c === ':' ? 'line' : 'commands';
  return { mode, q: ('@:>'.includes(c) && c ? s.slice(1) : s).trim() };
}

// Ribbon models -> command id -> { tab, group }.
export function buildWhere(tabs) {
  const m = new Map();
  for (const t of tabs) for (const g of t.groups || []) for (const s of g.slice(3)) {
    if (typeof s !== 'string') continue;
    const [main, menu] = (s[0] === '*' ? s.slice(1) : s).split('|');
    for (const id of [main, ...(menu ? menu.split('/') : [])]) if (id !== '-' && !m.has(id)) m.set(id, { tab: t.label, group: g[0] });
  }
  return m;
}

export const groupLabel = (c, where) => { const w = where.get(c.id); return w ? `${w.tab} › ${w.group}` : c.group || 'Other'; };

export function commandRows(cmds, q, { where, recent = [], can }) {
  const mk = (c, idx, section) => {
    const on = can(c);
    return { id: c.id, title: c.title, shortcut: c.shortcut, group: groupLabel(c, where), idx, section, on, reason: on ? '' : c.planned ? 'Planned: not available yet' : c.reason || 'Not available right now' };
  };
  if (q) return rank(cmds, q, (c) => [[c.title, 1], ...(c.aliases || []).map((a) => [a, 0.9]), [groupLabel(c, where), 0.4]], (c) => Math.max(0, 5 - recent.indexOf(c.id) * 0.4) * (recent.includes(c.id) ? 1 : 0))
    .map((r) => mk(r.item, r.field === 0 ? r.idx : []));
  const by = new Map(cmds.map((c) => [c.id, c])), rec = recent.map((id) => by.get(id)).filter(Boolean), seen = new Set(rec.map((c) => c.id));
  const rest = cmds.filter((c) => !seen.has(c.id)).map((c) => [groupLabel(c, where), c]).sort((a, b) => a[0].localeCompare(b[0]));
  return [...rec.map((c) => mk(c, [], 'Recent')), ...rest.map(([g, c]) => mk(c, [], g))];
}

export const headingRows = (hs, q) => rank(hs, q, (x) => [[x.text || '', 1]]).map((r) => ({
  id: `h${r.item.line}`, title: r.item.text || '(untitled)', group: `H${r.item.level}`, idx: r.idx, line: r.item.line, col: 1, on: true, reason: '',
}));
