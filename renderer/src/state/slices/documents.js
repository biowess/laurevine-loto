import { place } from '../../core/tabs/tab-ops.js';

const PATCH = { title: 'string', path: 'string', dirty: 'boolean', pinned: 'boolean', saveFailed: 'boolean', deleted: 'boolean', saving: 'boolean', conflict: 'boolean' };
const initial = { tabs: [], activeId: null };

const norm = (t) => ({
  id: String(t.id), title: typeof t.title === 'string' && t.title ? t.title : 'Untitled',
  path: typeof t.path === 'string' ? t.path : null, dirty: !!t.dirty, pinned: !!t.pinned, saveFailed: !!t.saveFailed, deleted: !!t.deleted, saving: !!t.saving, conflict: !!t.conflict,
});

function reducer(s = initial, a) {
  switch (a.type) {
    case 'documents/open': {
      if (!a.tab || a.tab.id == null || a.tab.id === '') return s;
      const id = String(a.tab.id);
      if (s.tabs.some((t) => t.id === id)) return s.activeId === id ? s : { ...s, activeId: id };
      return { tabs: [...s.tabs, norm(a.tab)], activeId: id };
    }
    case 'documents/close': {
      const i = s.tabs.findIndex((t) => t.id === a.id);
      if (i < 0) return s;
      const tabs = s.tabs.filter((t) => t.id !== a.id);
      const next = s.activeId !== a.id ? s.activeId : (tabs[i] || tabs[i - 1] || {}).id || null;
      return { tabs, activeId: next };
    }
    case 'documents/move': {
      const tabs = place(s.tabs, a.id, a.at);
      return tabs.every((t, i) => t === s.tabs[i]) ? s : { ...s, tabs };
    }
    case 'documents/pin': {
      const t = s.tabs.find((x) => x.id === a.id);
      if (!t || t.pinned === !!a.on) return s;
      return { ...s, tabs: place(s.tabs.map((x) => (x === t ? { ...t, pinned: !!a.on } : x)), a.id, a.on ? Infinity : 0) };
    }
    case 'documents/activate': return s.tabs.some((t) => t.id === a.id) && s.activeId !== a.id ? { ...s, activeId: a.id } : s;
    case 'documents/update': {
      const t = s.tabs.find((x) => x.id === a.id);
      if (!t || !a.patch) return s;
      const patch = {};
      for (const k of Object.keys(PATCH)) if (typeof a.patch[k] === PATCH[k] && a.patch[k] !== t[k]) patch[k] = a.patch[k];
      if (!Object.keys(patch).length) return s;
      return { ...s, tabs: s.tabs.map((x) => (x === t ? { ...t, ...patch } : x)) };
    }
    default: return s;
  }
}

export const documentActions = {
  open: (tab) => ({ type: 'documents/open', tab }),
  close: (id) => ({ type: 'documents/close', id }),
  activate: (id) => ({ type: 'documents/activate', id }),
  move: (id, at) => ({ type: 'documents/move', id, at }),
  pin: (id, on) => ({ type: 'documents/pin', id, on }),
  update: (id, patch) => ({ type: 'documents/update', id, patch }),
};

export const documents = { initial, reducer };
