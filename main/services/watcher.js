import fs, { promises as fsp } from 'node:fs';
import path from 'node:path';
import { isIgnored } from './fs/tree.js';

const MAX_POLL = 20000;

async function snapshot(root) {
  const map = new Map();
  const walk = async (dir) => {
    let list;
    try { list = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const d of list) {
      if (isIgnored(d.name) || map.size >= MAX_POLL) continue;
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        map.set(full, 'd');
        await walk(full);
      } else {
        try { const st = await fsp.lstat(full); map.set(full, `${st.mtimeMs}:${st.size}`); } catch { /* vanished */ }
      }
    }
  };
  await walk(root);
  return map;
}

// onChange({ root, dirs }): every event in the debounce window collapses into the set of parent folders to re-list
// (rename events for old and new names, and bursts of writes, coalesce). Falls back to polling when recursive watch is unavailable.
export function createWatcher({ root, onChange, delay = 150, pollMs = 2000, watch = fs.watch }) {
  let dirs = new Set(), timer = null, first = null, fsw = null, poll = null, prev = null, busy = false, closed = false;

  const flush = () => {
    const list = dirs.has(root) || dirs.size > 200 ? [root] : [...dirs];
    dirs = new Set();
    timer = first = null;
    if (list.length && !closed) onChange({ root, dirs: list });
  };
  const mark = (dir) => {
    if (dirs.size > 200 || dir === root) dirs = new Set([root]);
    else dirs.add(dir);
    first ??= Date.now();
    clearTimeout(timer);
    timer = setTimeout(flush, Date.now() - first > 1000 ? 0 : delay);
  };
  const startPoll = async () => {
    if (closed || poll) return;
    poll = setInterval(async () => {
      if (busy || !prev) return;
      busy = true;
      const next = await snapshot(root);
      busy = false;
      if (closed) return;
      for (const [p, v] of next) if (prev.get(p) !== v) mark(path.dirname(p));
      for (const p of prev.keys()) if (!next.has(p)) mark(path.dirname(p));
      prev = next;
    }, pollMs);
    poll.unref?.();
    prev = await snapshot(root);
  };
  const onEvent = (_type, name) => {
    if (!name) return mark(root);
    const rel = String(name);
    if (rel.split(/[\\/]/).some(isIgnored)) return;
    mark(path.dirname(path.join(root, rel)));
  };

  try {
    fsw = watch(root, { recursive: true, persistent: false }, onEvent);
    fsw.on('error', () => { fsw?.close(); fsw = null; startPoll(); });
  } catch {
    fsw = null;
    startPoll();
  }

  return {
    mode: () => (fsw ? 'watch' : 'poll'),
    close() {
      closed = true;
      clearTimeout(timer);
      clearInterval(poll);
      fsw?.close();
    },
  };
}
