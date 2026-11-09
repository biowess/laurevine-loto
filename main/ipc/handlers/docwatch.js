import { CH } from '../../../shared/channels.js';
import { createDocWatcher } from '../../services/watcher/doc-watcher.js';
import { safePath } from '../../services/fs/safe-path.js';
import { run } from './reply.js';

const wins = new Map();

function watcherFor(sender) {
  let w = wins.get(sender.id);
  if (w) return w;
  w = createDocWatcher({ onEvent: (e) => { if (!sender.isDestroyed()) sender.send(CH.DOC_CHANGED, e); } });
  wins.set(sender.id, w);
  const id = sender.id;
  sender.once('destroyed', () => { w.close(); wins.delete(id); });
  return w;
}

export const watch = ({ id, path, hash }, event) => run(async () => {
  const { path: p } = await safePath(path);
  const w = watcherFor(event.sender);
  w.unwatch(id);
  w.watch(id, p, hash);
  return {};
});

export const unwatch = ({ id }, event) => run(async () => {
  wins.get(event.sender.id)?.unwatch(id);
  return {};
});
