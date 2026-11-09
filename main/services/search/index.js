import { Worker } from 'node:worker_threads';
import { CH } from '../../../shared/channels.js';

const CAP = 5000;
const active = new Map(); // webContents id -> { w, id, sender }
let seq = 0;

const emit = (s, p) => { if (!s.isDestroyed()) s.send(CH.SEARCH_RESULTS, p); };

// Terminates the window's running search; `notify` tells the renderer it was canceled.
export function cancelSearch(wcId, notify = false) {
  const cur = active.get(wcId);
  if (!cur) return;
  active.delete(wcId);
  cur.w.terminate();
  if (notify) emit(cur.sender, { id: cur.id, done: true, canceled: true });
}

// A new query cancels the previous one. Results stream as `search:results` events; returns the search id.
export function startSearch(sender, root, q) {
  cancelSearch(sender.id, true);
  const id = ++seq, max = q.max ?? CAP, w = new Worker(new URL('./worker.js', import.meta.url));
  active.set(sender.id, { w, id, sender });
  const end = () => { if (active.get(sender.id)?.w === w) active.delete(sender.id); w.terminate(); };
  w.on('message', (m) => {
    if (m.id !== id) return;
    if (m.type === 'results') return emit(sender, { id, items: m.items });
    end();
    emit(sender, {
      id, done: true, total: m.total, files: m.files, truncated: !!m.truncated, error: m.error,
      notice: m.truncated ? `Showing the first ${max.toLocaleString('en-US')} results. Refine the query to narrow them.` : undefined,
    });
  });
  w.on('error', (e) => { end(); emit(sender, { id, done: true, error: String((e && e.message) || e) }); });
  w.postMessage({
    id, root, query: q.query, scopes: q.scopes ?? ['content'], caseSensitive: !!q.caseSensitive, wholeWord: !!q.wholeWord,
    regex: !!q.regex, include: q.include ?? [], exclude: q.exclude ?? [], max,
  });
  return id;
}
