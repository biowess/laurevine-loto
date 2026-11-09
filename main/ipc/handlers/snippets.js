import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import { run } from './reply.js';
import * as store from '../../services/snippets.js';
import { snippetFile } from '../../../shared/snippets.js';
import { pickOpen, pickSave } from '../../services/fs/dialogs.js';

const dir = () => path.join(app.getPath('userData'), 'snippets');

export const list = () => run(async () => ({ items: await store.list(dir()) }));
export const save = (p) => run(() => store.save(dir(), p));
export const update = (p) => run(() => store.update(dir(), p));
export const duplicate = (p) => run(() => store.duplicate(dir(), p));
export const remove = (p) => run(async () => { await store.remove(dir(), p, (f) => shell.trashItem(f)); return {}; });
export const importFiles = (_p, event) => run(async () => {
  const paths = await pickOpen(event, { filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile', 'multiSelections'] });
  return paths.length ? store.importFiles(dir(), paths) : { ids: [], skipped: 0 };
});
export const exportOne = (p, event) => run(async () => {
  const s = await store.get(dir(), p.id), dest = await pickSave(event, { defaultPath: `${s.name}.json`, title: 'Export Snippet' });
  if (!dest) return { canceled: true };
  await fsp.writeFile(dest, snippetFile(s), 'utf8');
  return { canceled: false };
});
