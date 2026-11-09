import { CH } from '../../../shared/channels.js';
import { getSettingDef, settingDefaults, validateSetting } from '../../../shared/settings-schema.js';
import { IpcError, invoke, on } from './ipc.js';

// Cached view of the persisted settings. Falls back to schema defaults when the desktop bridge is unavailable.
let cache = settingDefaults();
let listening = false;
const subs = new Set();

function merge(values) {
  const changed = {};
  for (const [id, v] of Object.entries(values ?? {})) {
    if (getSettingDef(id) && validateSetting(id, v).ok && !Object.is(cache[id], v)) changed[id] = v;
  }
  if (!Object.keys(changed).length) return;
  cache = { ...cache, ...changed };
  for (const fn of [...subs]) {
    try { fn(changed, cache); } catch (err) { console.error('[settings]', err); }
  }
}

export async function loadSettings() {
  if (!listening) {
    listening = true;
    try { on(CH.SETTINGS_CHANGED, (p) => merge(p?.values)); } catch (err) { console.warn('[settings] no push events:', err.message); }
  }
  try {
    merge((await invoke(CH.SETTINGS_GET_ALL)).values);
  } catch (err) {
    console.warn('[settings] using defaults:', err.message);
  }
  return cache;
}

export const getAllSettings = () => cache;
export const getSetting = (id) => (id in cache ? cache[id] : getSettingDef(id)?.default);

async function send(channel, payload) {
  const r = await invoke(channel, payload);
  if (!r.ok) throw new IpcError('INVALID_SETTING', r.error);
  merge(r.values);
  return cache;
}

export async function setSetting(id, value) {
  const check = validateSetting(id, value);
  if (!check.ok) throw new IpcError('INVALID_SETTING', check.error);
  await send(CH.SETTINGS_SET, { key: id, value });
  return getSetting(id);
}

export const resetSetting = (id) => send(CH.SETTINGS_RESET, id === undefined ? undefined : { key: id });

export function subscribeSettings(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export const settingsApi = Object.freeze({
  get: getSetting, getAll: getAllSettings, set: setSetting, reset: resetSetting, subscribe: subscribeSettings,
});
