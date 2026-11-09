// Shared warning collector (read by export preflight). Entries: { kind, message, line? }, replaced per kind and scope (document id).
const by = new Map(), subs = new Set();

export function setWarnings(kind, scope, list) {
  const k = `${kind}|${scope}`;
  if (!list.length && !by.has(k)) return;
  if (list.length) by.set(k, list); else by.delete(k);
  subs.forEach((f) => f());
}
export const getWarnings = (scope) => [...by].filter(([k]) => k.endsWith(`|${scope}`)).flatMap(([, v]) => v);
export const subscribeWarnings = (fn) => (subs.add(fn), () => subs.delete(fn));
