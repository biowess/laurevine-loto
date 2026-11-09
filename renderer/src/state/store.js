import { slices } from './slices/index.js';

// slices: { name: { initial, reducer(state, action) } }. Reducers must return the same reference when nothing changed.
export function createStore(defs) {
  const keys = Object.keys(defs);
  let state = Object.freeze(Object.fromEntries(keys.map((k) => [k, defs[k].initial])));
  const subs = new Set();
  let depth = 0, dirty = false;

  const flush = () => {
    dirty = false;
    for (const s of [...subs]) {
      if (!subs.has(s)) continue;
      const v = s.sel(state);
      if (!s.eq(v, s.last)) { const p = s.last; s.last = v; s.fn(v, p); }
    }
  };

  function dispatch(action) {
    if (!action || typeof action.type !== 'string') throw new TypeError('store: action needs a string type');
    let next = state, changed = false;
    for (const k of keys) {
      const r = defs[k].reducer(state[k], action);
      if (r === state[k]) continue;
      if (!changed) { next = { ...state }; changed = true; }
      next[k] = r;
    }
    if (!changed) return state;
    state = Object.freeze(next);
    if (depth) dirty = true; else flush();
    return state;
  }

  function batch(fn) {
    depth++;
    try { fn(); } finally { if (!--depth && dirty) flush(); }
  }

  function subscribe(sel, fn, eq = Object.is) {
    const s = { sel, fn, eq, last: sel(state) };
    subs.add(s);
    return () => subs.delete(s);
  }

  return { get: () => state, dispatch, batch, subscribe };
}

export const store = createStore(slices);
