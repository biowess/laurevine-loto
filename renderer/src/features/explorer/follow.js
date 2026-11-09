import { baseName } from '../../core/documents/paths.js';
import { inside, remap } from '../../core/explorer/move.js';

export function createFollow(ctx, onMoved) {
  const { store, services: { documents: D, bus } } = ctx;
  const tabs = () => store.get().documents.tabs.filter((t) => t.path);
  return {
    moved(pairs) {
      if (!pairs.length) return;
      bus.emit('fs:willRenameOrMove', pairs.map(([from, to]) => ({ from, to })));
      for (const t of tabs()) {
        const p = remap(t.path, pairs);
        if (p !== t.path) D.updateDoc(t.id, { path: p, name: baseName(p), deleted: false });
      }
      onMoved(pairs);
    },
    deleted(paths) {
      for (const t of tabs()) if (paths.some((p) => inside(p, t.path))) D.updateDoc(t.id, { deleted: true });
    },
  };
}
