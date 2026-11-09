import path from 'node:path';

const named = (i) => ({ ...i, name: path.basename(i.path) });
const clean = (a) => (Array.isArray(a) ? a.filter((i) => i && typeof i.path === 'string').map((i) => ({ path: i.path, pinned: !!i.pinned, openedAt: Number(i.openedAt) || 0 })) : []);

// Pinned entries first, then the most recently opened; only unpinned entries are trimmed to `max`.
export function createRecents({ store, max = 30 }) {
  const items = () => clean(store.get().items);
  const commit = (list) => {
    const byTime = (a, b) => b.openedAt - a.openedAt;
    const next = [...list.filter((i) => i.pinned).sort(byTime), ...list.filter((i) => !i.pinned).sort(byTime).slice(0, max)];
    store.set({ ...store.get(), items: next });
    return { items: next.map(named) };
  };
  const upsert = (p, patch) => {
    const cur = items();
    return commit(cur.some((i) => i.path === p) ? cur.map((i) => (i.path === p ? { ...i, ...patch } : i)) : [...cur, { path: p, pinned: false, openedAt: Date.now(), ...patch }]);
  };
  return {
    list: () => ({ items: items().map(named) }),
    add: (p) => upsert(p, { openedAt: Date.now() }),
    pin: (p) => upsert(p, { pinned: true }),
    unpin: (p) => (items().some((i) => i.path === p) ? upsert(p, { pinned: false }) : { items: items().map(named) }),
    remove: (p) => commit(items().filter((i) => i.path !== p)),
    rename: (a, b) => commit(items().filter((i) => i.path !== b).map((i) => (i.path === a ? { ...i, path: b } : i))),
    clear: () => commit(items().filter((i) => i.pinned)),
  };
}
