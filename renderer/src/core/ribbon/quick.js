import { reorder } from './edit.js';

export const QUICK_MAX = 16;
const ID = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;

export function parseQuick(text, has) {
  if (!text) return { ids: [], ignored: [], damaged: false };
  let list;
  try { list = JSON.parse(text); } catch { list = null; }
  if (!Array.isArray(list)) return { ids: [], ignored: [], damaged: true };
  const ids = [], ignored = [];
  for (const x of list) {
    if (typeof x !== 'string' || !ID.test(x) || !has(x)) { ignored.push(String(x).slice(0, 60)); continue; }
    if (!ids.includes(x) && ids.length < QUICK_MAX) ids.push(x);
  }
  return { ids, ignored, damaged: false };
}

export const addQuick = (ids, id) => (ids.includes(id) || ids.length >= QUICK_MAX ? ids : [...ids, id]);
export const removeQuick = (ids, id) => ids.filter((x) => x !== id);
export const moveQuick = (ids, id, by) => reorder(ids, ids.indexOf(id), ids.indexOf(id) + by);
export const serializeQuick = (ids) => (ids.length ? JSON.stringify(ids) : '');
