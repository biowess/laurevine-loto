import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { writeJsonAtomic } from '../store/json-store.js';

export const KEY = /^[A-Za-z0-9_-]{1,80}$/;
const LIMITS = { files: 100, bytes: 50e6, doc: 8e6 };
const meta = (s) => ({ key: s.key, name: s.name, path: s.path, size: s.size, savedAt: s.savedAt, mode: s.mode, caret: s.caret });

// Snapshots of dirty documents in <dir>/<key>.json. A `running.lock` marker exists while the app runs; finding it at start means the last exit was unclean.
export function createRecovery({ dir, limits = LIMITS }) {
  const lock = path.join(dir, 'running.lock'), file = (k) => path.join(dir, `${k}.json`);
  const index = new Map(), left = new Set();
  let chain = Promise.resolve(), crashed = false;
  const seq = (fn) => (chain = chain.then(fn, fn));
  const rm = (k) => { index.delete(k); left.delete(k); return fsp.rm(file(k), { force: true }); };

  const init = () => seq(async () => {
    await fsp.mkdir(dir, { recursive: true });
    crashed = await fsp.access(lock).then(() => true, () => false);
    for (const n of await fsp.readdir(dir)) {
      if (!n.endsWith('.json')) continue;
      const key = n.slice(0, -5);
      let s = null;
      try { s = JSON.parse(await fsp.readFile(path.join(dir, n), 'utf8')); } catch { /* corrupt */ }
      if (crashed && KEY.test(key) && s && s.key === key && typeof s.text === 'string') { index.set(key, meta(s)); left.add(key); } else await fsp.rm(path.join(dir, n), { force: true });
    }
    await fsp.writeFile(lock, String(Date.now()));
    return { crashed };
  });

  const put = (s) => seq(async () => {
    const size = Buffer.byteLength(s.text, 'utf8');
    if (size > limits.doc) return { skipped: true };
    const snap = { key: s.key, name: s.name, path: s.path, text: s.text, caret: s.caret, mode: s.mode, size, savedAt: Date.now() };
    await writeJsonAtomic(file(s.key), snap);
    index.set(s.key, meta(snap));
    let total = [...index.values()].reduce((n, i) => n + i.size, 0);
    for (const i of [...index.values()].sort((a, b) => a.savedAt - b.savedAt)) {
      if (index.size <= limits.files && total <= limits.bytes) break;
      if (i.key === s.key) continue;
      total -= i.size;
      await rm(i.key);
    }
    return { skipped: false };
  });

  const drop = (keys) => seq(async () => { for (const k of keys) if (KEY.test(k)) await rm(k); });
  const dropAll = () => seq(async () => { for (const k of [...index.keys()]) await rm(k); });
  const list = () => [...left].map((k) => index.get(k)).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
  const read = (key) => seq(async () => (KEY.test(key) && index.has(key) ? JSON.parse(await fsp.readFile(file(key), 'utf8')) : null));
  const shutdown = () => seq(async () => { for (const k of [...index.keys()]) await rm(k); await fsp.rm(lock, { force: true }); });

  const idle = () => chain.catch(() => {});

  return { init, put, drop, dropAll, list, read, shutdown, idle };
}
