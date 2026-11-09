import { app } from 'electron';
import path from 'node:path';
import { CH } from '../../../shared/channels.js';
import { ensureSubdir } from '../store/json-store.js';
import { createIndexer } from './indexer.js';

const active = new Map(); // webContents id -> indexer

export const indexerFor = (id) => active.get(id) ?? null;

export function stopIndexer(id) {
  active.get(id)?.close();
  active.delete(id);
}

// Starts (or replaces) the window's index for a workspace entry { id, root }.
export async function startIndexer(sender, entry) {
  stopIndexer(sender.id);
  const dir = await ensureSubdir(app.getPath('userData'), 'indexes');
  const ix = createIndexer({
    root: entry.root, cacheFile: path.join(dir, `${entry.id}.json`),
    emit: (p) => { if (!sender.isDestroyed()) sender.send(CH.WORKSPACE_INDEX_PROGRESS, p); },
  });
  active.set(sender.id, ix);
  ix.start();
}
