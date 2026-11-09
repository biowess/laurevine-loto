import { createHash } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

export const workspaceId = (root) => createHash('sha1').update(process.platform === 'win32' ? root.toLowerCase() : root).digest('hex').slice(0, 12);

// Optional `<root>/.laurevine/workspace.json`: { name? }. Read-only: the app never creates or edits it.
export async function readConfig(root) {
  try {
    const c = JSON.parse(await fsp.readFile(path.join(root, '.laurevine', 'workspace.json'), 'utf8'));
    return typeof c?.name === 'string' && c.name.trim() ? { name: c.name.trim().slice(0, 100) } : {};
  } catch {
    return {};
  }
}

const clean = (a) => (Array.isArray(a)
  ? a.filter((i) => i && typeof i.id === 'string' && typeof i.root === 'string').map((i) => ({ id: i.id, root: i.root, name: String(i.name || path.basename(i.root) || i.root), lastOpened: Number(i.lastOpened) || 0 }))
  : []);

// workspaces.json data: { items: [{ id, root, name, lastOpened }] }, newest first, capped at `max`.
export function createRegistry({ store, max = 50 }) {
  const list = () => clean(store.get().items).sort((a, b) => b.lastOpened - a.lastOpened);
  return {
    list,
    recent: (n = 10) => list().slice(0, n),
    remove(root) {
      const next = list().filter((i) => i.id !== workspaceId(root));
      store.set({ ...store.get(), items: next });
      return next;
    },
    touch(root, name) {
      const entry = { id: workspaceId(root), root, name, lastOpened: Date.now() };
      store.set({ ...store.get(), items: [entry, ...list().filter((i) => i.id !== entry.id)].slice(0, max) });
      return entry;
    },
  };
}
