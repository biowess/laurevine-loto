import { createHash } from 'node:crypto';
import { HISTORY_LABELS } from '../../../shared/channels.js';

export const LABELS = HISTORY_LABELS;

const sha = (s, n) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, n);
export const hashText = (text) => sha(text, 64);
export const fileId = (key) => sha(key, 32);

export function normPath(p, platform = process.platform) {
  const s = p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
  return platform === 'win32' ? s.toLowerCase() : s;
}

// Saved files are keyed by normalised path, untitled documents by document id.
export const historyKey = ({ path, docId }, platform) => (path ? `p:${normPath(path, platform)}` : `d:${docId}`);

// New key after `from` (file or folder) moved to `to`, or null when the key is unaffected.
export function relinkKey(key, from, to, platform) {
  if (!key.startsWith('p:')) return null;
  const f = normPath(from, platform), t = normPath(to, platform), p = key.slice(2);
  if (p === f) return `p:${t}`;
  return p.startsWith(`${f}/`) ? `p:${t}${p.slice(f.length)}` : null;
}

// Autosaves are kept only after `interval` ms or a size change of `delta` bytes since the latest version.
export function wantSnapshot(label, last, cur, { autosaveInterval, autosaveDelta }) {
  if (!last) return true;
  if (last.hash === cur.hash) return false;
  if (label !== 'Autosave') return true;
  return cur.at - last.at >= autosaveInterval || Math.abs(cur.size - last.size) >= autosaveDelta;
}

// items: [{ f, at, size, pinned }] across all files. Returns the items to delete, oldest first:
// too old, then over the per-file count, then over the global byte cap. Pinned items and each file's latest `keepLatest` are never returned.
export function prune(items, { now, maxVersions, maxAge, keepLatest, maxBytes }) {
  const by = new Map(), keep = new Set(), drop = new Set();
  for (const i of items) (by.get(i.f) ?? by.set(i.f, []).get(i.f)).push(i);
  for (const list of by.values()) {
    list.sort((a, b) => a.at - b.at);
    for (const i of list.slice(-keepLatest)) keep.add(i);
    for (const i of list) if (i.pinned) keep.add(i);
    let n = list.length;
    for (const i of list) if (!keep.has(i) && now - i.at > maxAge) { drop.add(i); n--; }
    for (const i of list) if (n > maxVersions && !keep.has(i) && !drop.has(i)) { drop.add(i); n--; }
  }
  let total = items.reduce((s, i) => s + (drop.has(i) ? 0 : i.size), 0);
  for (const i of [...items].sort((a, b) => a.at - b.at)) {
    if (total <= maxBytes) break;
    if (!keep.has(i) && !drop.has(i)) { drop.add(i); total -= i.size; }
  }
  return [...drop];
}
