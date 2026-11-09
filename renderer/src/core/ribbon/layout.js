export const LIMITS = Object.freeze({ groups: 24, items: 40, name: 40 });
const ID = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;
const KEY = /^\+[a-z0-9]{1,12}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function parseItem(raw) {
  const big = raw[0] === '*', [id, menu] = (big ? raw.slice(1) : raw).split('|');
  return { raw, id, big, menu: menu ? menu.split('/') : null, hide: false };
}

export function parseLayout(text) {
  if (!text) return { layout: null };
  let o;
  try { o = JSON.parse(text); } catch { return { layout: null, error: 'The layout is not valid JSON.' }; }
  if (!isObj(o) || o.v !== 1 || !isObj(o.tabs)) return { layout: null, error: 'The layout is not a Laurevine Loto ribbon layout.' };
  return { layout: o };
}

const cleanName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.name);

function builtGroup(def, stored, seen, has) {
  const [name, icon, per, ...rows] = def, pool = new Map(), items = [];
  for (const r of rows) {
    const it = parseItem(r);
    if (!has(it.id)) continue;
    if (!pool.has(it.id)) pool.set(it.id, []);
    pool.get(it.id).push(it);
  }
  for (const s of Array.isArray(stored?.items) ? stored.items.slice(0, LIMITS.items * 2) : []) {
    const hide = typeof s === 'string' && s[0] === '!', id = typeof s === 'string' ? (hide ? s.slice(1) : s) : '';
    const it = ID.test(id) ? pool.get(id)?.shift() : null;
    if (it) items.push({ ...it, hide }); else seen.add(String(s).slice(0, 60));
  }
  for (const list of pool.values()) items.push(...list);
  return { key: name, name, icon, per, custom: false, hide: !!stored?.hide, items };
}

function customGroup(stored, seen, has) {
  const items = [];
  for (const s of Array.isArray(stored.items) ? stored.items : []) {
    const hide = typeof s === 'string' && s[0] === '!', id = typeof s === 'string' ? (hide ? s.slice(1) : s) : '';
    if (!ID.test(id) || !has(id)) { seen.add(String(s).slice(0, 60)); continue; }
    if (!items.some((i) => i.id === id) && items.length < LIMITS.items) items.push({ ...parseItem(id), hide });
  }
  return { key: stored.k, name: cleanName(stored.n) || 'Custom Group', icon: 'puzzle', per: 0, custom: true, hide: !!stored.hide, items };
}

export function resolve(base, layout, has) {
  const seen = new Set();
  let badGroups = 0;
  const stored = isObj(layout?.tabs) ? layout.tabs : {};
  const known = new Set(base.map((t) => t.id));
  const badTabs = Object.keys(stored).filter((k) => !known.has(k)).length;
  const model = base.map((t) => {
    const s = isObj(stored[t.id]) ? stored[t.id] : {}, defs = new Map(t.groups.map((g) => [g[0], g])), used = new Set(), groups = [];
    for (const sg of Array.isArray(s.groups) ? s.groups.slice(0, LIMITS.groups) : []) {
      if (!isObj(sg) || typeof sg.k !== 'string') { badGroups++; continue; }
      if (sg.k[0] === '+') {
        if (!KEY.test(sg.k) || used.has(sg.k)) { badGroups++; continue; }
        used.add(sg.k); groups.push(customGroup(sg, seen, has));
      } else if (defs.has(sg.k) && !used.has(sg.k)) {
        used.add(sg.k); groups.push(builtGroup(defs.get(sg.k), sg, seen, has));
      } else badGroups++;
    }
    for (const [k, def] of defs) if (!used.has(k)) groups.push(builtGroup(def, null, seen, has));
    return { id: t.id, label: t.label, hide: !!s.hide, groups };
  });
  if (model.every((t) => t.hide)) model[0].hide = false;
  return { model, ignored: { ids: [...seen], groups: badGroups + badTabs } };
}

export function noteFor({ ids, groups }) {
  const parts = [];
  if (ids.length) parts.push(`${ids.length} unknown command${ids.length === 1 ? '' : 's'} ignored (${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ', …' : ''})`);
  if (groups) parts.push(`${groups} unknown tab or group entr${groups === 1 ? 'y' : 'ies'} ignored`);
  return parts.join('; ');
}

export const toRibbon = (model) => model.filter((t) => !t.hide).map((t) => ({
  id: t.id, label: t.label,
  groups: t.groups.filter((g) => !g.hide).map((g) => [g.name, g.icon, g.per, ...g.items.filter((i) => !i.hide).map((i) => i.raw)]).filter((g) => g.length > 3),
}));

const entry = (t) => ({
  ...(t.hide ? { hide: 1 } : {}),
  groups: t.groups.map((g) => ({ k: g.key, ...(g.custom ? { n: g.name } : {}), ...(g.hide ? { hide: 1 } : {}), items: g.items.map((i) => (i.hide ? '!' : '') + i.id) })),
});

export function serialize(model, base, has) {
  const def = resolve(base, null, has).model, tabs = {};
  model.forEach((t, i) => { if (JSON.stringify(entry(t)) !== JSON.stringify(entry(def[i]))) tabs[t.id] = entry(t); });
  return Object.keys(tabs).length ? JSON.stringify({ v: 1, tabs }) : '';
}
