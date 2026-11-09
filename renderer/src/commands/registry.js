const cmds = new Map(), subs = new Set();
const ID = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;
const emit = (type, id) => { for (const f of [...subs]) try { f({ type, id }); } catch (e) { console.error('[commands]', e); } };
let sc = (_id, d) => d;
export const setShortcutResolver = (fn) => { sc = fn; };
const call = (fn, dflt) => { if (typeof fn !== 'function') return dflt; try { return fn(); } catch { return dflt; } };

// A planned command never replaces a real one; a real one replaces a planned one.
export function register(def) {
  if (!def || !ID.test(def.id || '')) throw new TypeError(`commands: bad id "${def && def.id}"`);
  if (typeof def.title !== 'string' || !def.title) throw new TypeError(`commands: ${def.id} needs a title`);
  const prev = cmds.get(def.id);
  if (def.planned) { if (prev) return prev; }
  else {
    if (prev && !prev.planned) throw new Error(`commands: duplicate ${def.id}`);
    if (typeof def.run !== 'function') throw new TypeError(`commands: ${def.id} needs run()`);
  }
  const c = Object.freeze({
    id: def.id, title: def.title, icon: def.icon || '', group: def.group || '', get shortcut() { return sc(def.id, def.shortcut || ''); }, defaultShortcut: def.shortcut || '', keyWhen: def.keyWhen,
    portable: def.portable || '', aliases: Object.freeze([...(def.aliases || [])]), when: def.when, enabled: def.enabled, reason: def.reason || '', checked: def.checked, run: def.run, planned: !!def.planned,
  });
  cmds.set(c.id, c);
  emit(prev ? 'replace' : 'register', c.id);
  return c;
}

export function registerAll(group, rows, extra) {
  for (const [id, title, icon, shortcut] of rows) register({ id, title, icon, group, shortcut, planned: true, ...extra });
}

export const get = (id) => cmds.get(id);
export const has = (id) => cmds.has(id);
export const list = (filter) => { const all = [...cmds.values()]; return filter ? all.filter(filter) : all; };
export const isChecked = (id) => { const c = cmds.get(id); return !!c && call(c.checked, false) === true; };
export const canRun = (id) => { const c = cmds.get(id); return !!c && !c.planned && call(c.when, true) !== false && call(c.enabled, true) !== false; };
export const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const invalidate = (id) => emit('change', id);

export async function execute(id, arg) {
  const c = cmds.get(id);
  if (!c) return { ok: false, error: `Unknown command: ${id}` };
  if (c.planned) return { ok: false, planned: true };
  if (!canRun(id)) return { ok: false, disabled: true };
  try { return { ok: true, value: await c.run(arg) }; } catch (e) { console.error('[commands]', id, e); return { ok: false, error: (e && e.message) || String(e) }; }
}
