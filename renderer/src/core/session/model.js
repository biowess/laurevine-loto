import { serializeGroups, restoreGroups } from '../documents/groups.js';

const int = (n) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined);

// Session snapshot: titled documents only (untitled text is covered by recovery); groups refer to docs by index.
export function capture(s, pos, root) {
  const tabs = s.documents.tabs.filter((t) => t.path), idx = new Map(tabs.map((t, i) => [t.id, i])), g = serializeGroups(s.editorGroups);
  const at = (id) => (idx.has(id) ? idx.get(id) : -1);
  return {
    version: 1, root: root || '', active: at(s.documents.activeId),
    docs: tabs.map((t) => ({ path: t.path, pinned: !!t.pinned, ...pos.get(t.id) })),
    groups: { orientation: g.orientation, active: g.active, groups: g.groups.map((x) => ({ tabs: x.tabIds.filter((i) => idx.has(i)).map(at), active: at(x.activeId) })) },
  };
}

export function clean(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.docs)) return null;
  const docs = raw.docs.filter((d) => d && typeof d.path === 'string' && d.path).map((d) => ({ path: d.path, pinned: !!d.pinned, anchor: int(d.anchor), head: int(d.head), scroll: int(d.scroll), mode: d.mode }));
  const ok = docs.length === raw.docs.length;
  return { root: typeof raw.root === 'string' ? raw.root : '', active: ok && Number.isInteger(raw.active) ? raw.active : -1, docs, groups: ok && raw.groups && Array.isArray(raw.groups.groups) ? raw.groups : { groups: [] } };
}

// ids[i] is the new document id for stored doc i (undefined when its file was skipped); `all` are every open tab id.
export const toGroups = (g, ids, all) => restoreGroups({
  orientation: g.orientation, active: g.active,
  groups: (g.groups || []).map((x) => ({ tabIds: (x.tabs || []).map((i) => ids[i]).filter(Boolean), activeId: ids[x.active] })),
}, all);
