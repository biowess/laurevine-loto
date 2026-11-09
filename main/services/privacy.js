import { app } from 'electron';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { ensureSubdir } from './store/json-store.js';
import { historyService } from './history/index.js';

export async function clearFolder(name) {
  if (name === 'history') return (await historyService()).clear();
  const dir = await ensureSubdir(app.getPath('userData'), name);
  const names = await fsp.readdir(dir);
  await Promise.all(names.map((n) => fsp.rm(path.join(dir, n), { recursive: true, force: true })));
  return { cleared: names.length };
}
