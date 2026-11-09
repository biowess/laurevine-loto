// Pure editor-group model: { groups: [{ id, tabIds, activeId }], activeGroupId, orientation }.
// Limitation: a document lives in exactly one group (no same-document views in two groups).
// 'horizontal' places groups side by side, 'vertical' stacks them. Max two groups.
export const ORIENT = ['horizontal', 'vertical'];
export const MAX_GROUPS = 2;

export const initialGroups = () => ({ groups: [{ id: 'g1', tabIds: [], activeId: null }], activeGroupId: 'g1', orientation: 'horizontal' });
export const activeIndex = (s) => Math.max(0, s.groups.findIndex((g) => g.id === s.activeGroupId));
export const activeDocId = (s) => s.groups[activeIndex(s)].activeId;

const keep = (a, b) => (JSON.stringify(a) === JSON.stringify(b) ? a : b);
const after = (ids, at) => ids[Math.max(0, Math.min(at, ids.length - 1))] ?? null;

// A group left without tabs collapses while another group remains.
function tidy(s) {
  let groups = s.groups.length > 1 ? s.groups.filter((g) => g.tabIds.length) : s.groups;
  if (!groups.length) groups = s.groups.slice(0, 1);
  return { ...s, groups, activeGroupId: groups.some((g) => g.id === s.activeGroupId) ? s.activeGroupId : groups[0].id };
}

// Syncs group membership with the open tab ids; `activeId` is the store's active document.
export function reconcile(s, ids, activeId, closed) {
  const have = new Set(ids);
  let groups = s.groups.map((g) => {
    const tabIds = g.tabIds.filter((i) => have.has(i));
    return { ...g, tabIds, activeId: tabIds.includes(g.activeId) ? g.activeId : after(tabIds, g.tabIds.indexOf(g.activeId)) };
  });
  const known = new Set(groups.flatMap((g) => g.tabIds)), fresh = ids.filter((i) => !known.has(i)), ai = activeIndex(s);
  if (fresh.length) groups = groups.map((g, i) => (i === ai ? { ...g, tabIds: [...g.tabIds, ...fresh], activeId: fresh.includes(activeId) ? activeId : g.activeId ?? fresh[0] } : g));
  let activeGroupId = s.activeGroupId;
  if (!closed && activeId) {
    const g = groups.find((x) => x.tabIds.includes(activeId));
    if (g) { activeGroupId = g.id; groups = groups.map((x) => (x === g ? { ...x, activeId } : x)); }
  }
  return keep(s, tidy({ ...s, groups, activeGroupId }));
}

export const focusIndex = (s, i) => (s.groups[i] && s.groups[i].id !== s.activeGroupId ? { ...s, activeGroupId: s.groups[i].id } : s);
export const setOrientation = (s, o) => (ORIENT.includes(o) && o !== s.orientation ? { ...s, orientation: o } : s);

// Moves a document to the other group; with one group it opens a second (needs two tabs).
export function moveDoc(s, id, orientation) {
  const from = s.groups.findIndex((g) => g.tabIds.includes(id));
  if (from < 0 || (s.groups.length === 1 && s.groups[0].tabIds.length < 2)) return s;
  let groups = s.groups.slice(), to = 1 - from;
  if (groups.length === 1) { groups.push({ id: groups[0].id === 'g1' ? 'g2' : 'g1', tabIds: [], activeId: null }); to = 1; }
  groups = groups.map((g, i) => {
    if (i === from) { const tabIds = g.tabIds.filter((x) => x !== id); return { ...g, tabIds, activeId: g.activeId === id ? after(tabIds, g.tabIds.indexOf(id)) : g.activeId }; }
    return i === to ? { ...g, tabIds: [...g.tabIds, id], activeId: id } : g;
  });
  return keep(s, tidy({ ...s, groups, activeGroupId: groups[to].id, orientation: ORIENT.includes(orientation) ? orientation : s.orientation }));
}

// Folds the other group's tabs into the active group (its active tab stays active).
export function mergeGroups(s) {
  if (s.groups.length < 2) return s;
  const ai = activeIndex(s), a = s.groups[ai], b = s.groups[1 - ai];
  const g = { ...a, tabIds: ai ? [...b.tabIds, ...a.tabIds] : [...a.tabIds, ...b.tabIds] };
  return { ...s, groups: [g], activeGroupId: g.id };
}

export const serializeGroups = (s) => ({
  version: 1, orientation: s.orientation, active: activeIndex(s),
  groups: s.groups.map((g) => ({ tabIds: [...g.tabIds], activeId: g.activeId })),
});

// Rebuilds a valid state from untrusted data; `validIds` (optional) are the open document ids.
export function restoreGroups(raw, validIds) {
  const ok = validIds ? new Set(validIds) : null, seen = new Set(), r = raw && typeof raw === 'object' ? raw : {};
  const take = (g) => {
    const tabIds = (Array.isArray(g && g.tabIds) ? g.tabIds : []).filter((i) => typeof i === 'string' && i && (!ok || ok.has(i)) && !seen.has(i) && seen.add(i));
    return { tabIds, activeId: tabIds.includes(g && g.activeId) ? g.activeId : tabIds[0] ?? null };
  };
  let list = (Array.isArray(r.groups) ? r.groups : []).slice(0, MAX_GROUPS).map(take).filter((g) => g.tabIds.length);
  const rest = ok ? [...ok].filter((i) => !seen.has(i)) : [];
  if (rest.length) { if (!list.length) list = [{ tabIds: [], activeId: null }]; list[0] = { tabIds: [...list[0].tabIds, ...rest], activeId: list[0].activeId ?? rest[0] }; }
  if (!list.length) return initialGroups();
  const groups = list.map((g, i) => ({ id: `g${i + 1}`, ...g }));
  return { groups, activeGroupId: groups[Number.isInteger(r.active) && groups[r.active] ? r.active : 0].id, orientation: ORIENT.includes(r.orientation) ? r.orientation : 'horizontal' };
}
