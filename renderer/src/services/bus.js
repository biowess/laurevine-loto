const subs = new Map();
export const on = (ev, fn) => {
  const s = subs.get(ev) || subs.set(ev, new Set()).get(ev);
  s.add(fn);
  return () => s.delete(fn);
};
export const emit = (ev, payload) => { for (const f of [...(subs.get(ev) || [])]) try { f(payload); } catch (e) { console.error('[bus]', ev, e); } };
