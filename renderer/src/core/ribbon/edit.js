import { LIMITS, parseItem, resolve } from './layout.js';

export function reorder(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

const tabOf = (model, id, fn) => model.map((t) => (t.id === id ? fn(t) : t));
const groupOf = (model, id, gi, fn) => tabOf(model, id, (t) => ({ ...t, groups: t.groups.map((g, i) => (i === gi ? fn(g) : g)) }));

export function setTabHidden(model, id, hide) {
  if (hide && model.filter((t) => !t.hide).length <= 1) return model;
  return tabOf(model, id, (t) => ({ ...t, hide }));
}

export const setGroupHidden = (model, id, gi, hide) => groupOf(model, id, gi, (g) => ({ ...g, hide }));
export const moveGroup = (model, id, from, to) => tabOf(model, id, (t) => ({ ...t, groups: reorder(t.groups, from, to) }));
export const setItemHidden = (model, id, gi, ii, hide) => groupOf(model, id, gi, (g) => ({ ...g, items: g.items.map((it, i) => (i === ii ? { ...it, hide } : it)) }));
export const moveItem = (model, id, gi, from, to) => groupOf(model, id, gi, (g) => ({ ...g, items: reorder(g.items, from, to) }));

export function addGroup(model, id, name, key) {
  const t = model.find((x) => x.id === id);
  if (!t || t.groups.length >= LIMITS.groups || t.groups.some((g) => g.key === key)) return model;
  return tabOf(model, id, (x) => ({ ...x, groups: [...x.groups, { key, name, icon: 'puzzle', per: 0, custom: true, hide: false, items: [] }] }));
}

export const removeGroup = (model, id, gi) => tabOf(model, id, (t) => ({ ...t, groups: t.groups.filter((g, i) => i !== gi || !g.custom) }));
export const renameGroup = (model, id, gi, name) => groupOf(model, id, gi, (g) => (g.custom ? { ...g, name: name.replace(/\s+/g, ' ').trim().slice(0, LIMITS.name) || g.name } : g));

export function addItem(model, id, gi, cmdId) {
  return groupOf(model, id, gi, (g) => (!g.custom || g.items.length >= LIMITS.items || g.items.some((i) => i.id === cmdId) ? g : { ...g, items: [...g.items, parseItem(cmdId)] }));
}

export const removeItem = (model, id, gi, ii) => groupOf(model, id, gi, (g) => (g.custom ? { ...g, items: g.items.filter((_, i) => i !== ii) } : g));

export const resetTab = (model, base, has, id) => {
  const fresh = resolve(base, null, has).model.find((t) => t.id === id);
  return fresh ? tabOf(model, id, () => fresh) : model;
};

export const resetAll = (base, has) => resolve(base, null, has).model;
