// Current problems of the active document: list, severity counts, subscription (status bar and panel read it).
let list = [], total = 0;
const c = { error: 0, warning: 0, info: 0 }, subs = new Set();

export const getProblems = () => list;
export const counts = () => c;
export const totalProblems = () => total;
export const onProblems = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function setProblems(l, n, t = l.length) {
  list = l; total = t;
  Object.assign(c, { error: n.error, warning: n.warning, info: n.info });
  subs.forEach((f) => f());
}
