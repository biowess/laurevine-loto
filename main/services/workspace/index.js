import { app, BrowserWindow, dialog } from 'electron';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { CH } from '../../../shared/channels.js';
import { DocError } from '../fs/safe-path.js';
import { createJsonStore } from '../store/json-store.js';
import { createWatcher } from '../watcher.js';
import { createRegistry, readConfig } from './registry.js';
import { indexerFor, startIndexer, stopIndexer } from '../indexer/index.js';
import { cancelSearch } from '../search/index.js';

let pending = null;
const active = new Map(); // webContents id -> { id, root, name, assetRoot, watcher }
const hooked = new WeakSet();

async function init() {
  const store = createJsonStore({ root: app.getPath('userData'), name: 'workspaces', defaults: { items: [] } });
  await store.load();
  let flushed = false;
  app.on('before-quit', (event) => {
    if (flushed) return;
    event.preventDefault();
    flushed = true;
    store.flush().finally(() => app.quit());
  });
  return createRegistry({ store });
}

export const workspaceRegistry = () => (pending ??= init());
export const activeRoot = (event) => active.get(event.sender.id)?.root ?? null;

const closeFor = (id) => {
  active.get(id)?.watcher.close();
  stopIndexer(id);
  cancelSearch(id);
  active.delete(id);
};
export const closeWorkspace = (event) => closeFor(event.sender.id);

// One active workspace per window. With no `picked` path the native folder dialog asks.
export async function openWorkspace(event, picked) {
  const sender = event.sender;
  let root = picked;
  if (!root) {
    const win = BrowserWindow.fromWebContents(sender);
    const opts = { title: 'Open Folder', properties: ['openDirectory', 'createDirectory'] };
    const r = await (win ? dialog.showOpenDialog(win, opts) : dialog.showOpenDialog(opts));
    if (r.canceled || !r.filePaths[0]) return { canceled: true };
    root = r.filePaths[0];
  }
  root = await fsp.realpath(root);
  if (!(await fsp.stat(root)).isDirectory()) throw new DocError('E_PATH', 'The path is not a folder.');
  const cfg = await readConfig(root);
  const entry = (await workspaceRegistry()).touch(root, cfg.name ?? (path.basename(root) || root));
  closeFor(sender.id);
  const watcher = createWatcher({ root, onChange: (p) => { if (!sender.isDestroyed()) sender.send(CH.FS_TREE_CHANGE, p); indexerFor(sender.id)?.update(p.dirs); } });
  const assetRoot = `ws-${sender.id}`;
  active.set(sender.id, { ...entry, assetRoot, watcher });
  startIndexer(sender, entry).catch((err) => console.error('[indexer]', err.message));
  if (!hooked.has(sender)) {
    hooked.add(sender);
    const id = sender.id;
    sender.once('destroyed', () => closeFor(id));
  }
  return { canceled: false, workspace: { id: entry.id, root, name: entry.name, assetRoot } };
}
