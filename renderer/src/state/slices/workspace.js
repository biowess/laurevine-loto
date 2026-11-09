const initial = { root: null, name: '', expanded: [], selected: null };
const path = (v) => typeof v === 'string' && v.length > 0;

function reducer(s = initial, a) {
  switch (a.type) {
    case 'workspace/set': return path(a.root) ? { root: a.root, name: typeof a.name === 'string' ? a.name : '', expanded: [], selected: null } : s;
    case 'workspace/close': return s.root === null ? s : initial;
    case 'workspace/toggle': {
      if (!path(a.path)) return s;
      const on = s.expanded.includes(a.path);
      return { ...s, expanded: on ? s.expanded.filter((p) => p !== a.path) : [...s.expanded, a.path] };
    }
    case 'workspace/expanded': return Array.isArray(a.paths) ? { ...s, expanded: a.paths.filter(path) } : s;
    case 'workspace/select': return (a.path === null || path(a.path)) && a.path !== s.selected ? { ...s, selected: a.path } : s;
    default: return s;
  }
}

export const workspaceActions = {
  set: (root, name) => ({ type: 'workspace/set', root, name }),
  close: () => ({ type: 'workspace/close' }),
  toggle: (path) => ({ type: 'workspace/toggle', path }),
  expanded: (paths) => ({ type: 'workspace/expanded', paths }),
  select: (path) => ({ type: 'workspace/select', path }),
};

export const workspace = { initial, reducer };
