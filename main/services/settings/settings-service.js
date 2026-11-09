import { getSettingDef, settingDefaults, validateSetting } from '../../../shared/settings-schema.js';

// Persists only user overrides ({ values }). Invalid or unknown stored entries are ignored when reading, never rewritten.
export function createSettingsService({ store, emit = () => {} }) {
  const stored = () => store.get().values ?? {};
  const effective = () => {
    const out = settingDefaults();
    for (const [id, v] of Object.entries(stored())) if (validateSetting(id, v).ok) out[id] = v;
    return out;
  };

  function commit(changes) {
    const before = effective();
    store.update((d) => {
      const values = { ...(d.values ?? {}) };
      for (const [id, v] of Object.entries(changes)) { if (v === undefined) delete values[id]; else values[id] = v; }
      return { ...d, values };
    });
    const after = effective(), changed = {};
    for (const id of Object.keys(after)) if (!Object.is(after[id], before[id])) changed[id] = after[id];
    if (Object.keys(changed).length) emit(changed);
    return { ok: true, values: after };
  }

  function patch(entries) {
    const list = Object.entries(entries ?? {});
    for (const [id, v] of list) {
      const r = validateSetting(id, v);
      if (!r.ok) return r;
    }
    return commit(Object.fromEntries(list));
  }

  function reset(id) {
    if (id === undefined || id === null) return commit(Object.fromEntries(Object.keys(stored()).map((k) => [k, undefined])));
    if (!getSettingDef(id)) return { ok: false, error: `Unknown setting: ${id}` };
    return commit({ [id]: undefined });
  }

  return {
    getAll: effective,
    get: (id) => effective()[id],
    set: (id, value) => patch({ [id]: value }),
    patch, reset,
    flush: () => store.flush(),
  };
}
