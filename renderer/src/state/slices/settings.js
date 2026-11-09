import { settingDefaults, validateSetting } from '../../../../shared/settings-schema.js';

const initial = { values: settingDefaults() };

function reducer(s = initial, a) {
  if (a.type !== 'settings/apply' || !a.values || typeof a.values !== 'object') return s;
  let next = null;
  for (const [id, v] of Object.entries(a.values)) {
    if (!validateSetting(id, v).ok || Object.is(s.values[id], v)) continue;
    (next ??= { ...s.values })[id] = v;
  }
  return next ? { values: next } : s;
}

export const settingsActions = { apply: (values) => ({ type: 'settings/apply', values }) };

export const settings = { initial, reducer };
