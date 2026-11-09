import fs, { promises as fsp } from 'node:fs';
import path from 'node:path';
import { hashBuffer } from '../fs/read-document.js';

const BACKOFF = [100, 250, 500, 1000, 2000, 5000];
const MISSING_TRIES = 3;
const gone = (err) => err.code === 'ENOENT' || err.code === 'ENOTDIR';

export function createDocWatcher({ onEvent, delay = 200, backoff = BACKOFF, watchFn = fs.watch }) {
  const docs = new Map();
  const emit = (e, type, extra) => onEvent({ id: e.id, type, path: e.path, ...extra });

  const schedule = (e, ms = delay) => {
    if (e.dead) return;
    clearTimeout(e.timer);
    e.timer = setTimeout(() => run(e), ms);
    e.timer.unref?.();
  };

  async function findMoved(e) {
    if (!e.ino) return null;
    const dir = path.dirname(e.path);
    let names;
    try { names = await fsp.readdir(dir); } catch { return null; }
    for (const n of names) {
      const p = path.join(dir, n);
      try { if ((await fsp.stat(p)).ino === e.ino) return p; } catch { /* vanished */ }
    }
    return null;
  }

  async function fail(e, err) {
    e.fails++;
    if (gone(err)) {
      if (e.state !== 'deleted' && e.fails <= MISSING_TRIES) return schedule(e, backoff[e.fails - 1]);
      const to = await findMoved(e);
      if (to) {
        const from = e.path;
        e.path = to; e.fails = 0; e.state = 'ok';
        emit(e, 'renamed', { from, to });
        return schedule(e, 0);
      }
      if (e.state !== 'deleted') { e.state = 'deleted'; emit(e, 'deleted'); }
      return;
    }
    e.state = 'unreadable';
    emit(e, 'unreadable', { error: err.code || 'E_READ', attempt: e.fails });
    schedule(e, backoff[Math.min(e.fails - 1, backoff.length - 1)]);
  }

  async function probe(e) {
    if (e.hold) return;
    let buf, st;
    try { st = await fsp.stat(e.path); buf = await fsp.readFile(e.path); } catch (err) { return fail(e, err); }
    e.fails = 0; e.ino = st.ino;
    const hash = hashBuffer(buf);
    if (e.state !== 'ok') { e.state = 'ok'; emit(e, 'restored'); }
    if (hash !== e.hash) { e.hash = hash; emit(e, 'modified', { hash }); }
  }

  async function run(e) {
    if (e.busy) { e.again = true; return; }
    e.busy = true;
    try { do { e.again = false; await probe(e); } while (e.again && !e.dead); } finally { e.busy = false; }
  }

  function attach(e) {
    const poll = () => { e.poll ||= setInterval(() => schedule(e), 2000); e.poll.unref?.(); };
    try {
      const name = path.basename(e.path);
      e.watcher = watchFn(path.dirname(e.path), (_t, f) => { if (!f || String(f) === name) schedule(e); });
      e.watcher.on?.('error', () => { try { e.watcher.close(); } catch { /* closed */ } poll(); });
    } catch { poll(); }
  }

  function unwatch(id) {
    const e = docs.get(id);
    if (!e) return;
    e.dead = true;
    clearTimeout(e.timer); clearInterval(e.poll);
    try { e.watcher?.close(); } catch { /* closed */ }
    docs.delete(id);
  }

  return {
    watch(id, file, hash) {
      unwatch(id);
      const e = { id, path: file, hash, ino: 0, state: 'ok', fails: 0, hold: 0 };
      docs.set(id, e);
      fsp.stat(file).then((s) => { e.ino = s.ino; }, () => {});
      attach(e);
    },
    unwatch,
    setHash(id, hash) { const e = docs.get(id); if (e) e.hash = hash; },
    suspend(id) {
      const e = docs.get(id);
      if (!e) return () => {};
      e.hold++;
      return (hash) => { e.hold = Math.max(0, e.hold - 1); if (hash) e.hash = hash; schedule(e); };
    },
    has: (id) => docs.has(id),
    close() { [...docs.keys()].forEach(unwatch); },
  };
}
