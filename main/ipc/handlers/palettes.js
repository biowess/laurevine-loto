import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import { run } from './reply.js';
import * as store from '../../services/palettes.js';
import { paletteFile } from '../../../shared/palette.js';
import { pickOpen, pickSave } from '../../services/fs/dialogs.js';

const dir = () => path.join(app.getPath('userData'), 'palettes');

export const list = () => run(async () => ({ items: await store.list(dir()) }));
export const save = (p) => run(() => store.save(dir(), p));
export const update = (p) => run(() => store.update(dir(), p));
export const duplicate = (p) => run(() => store.duplicate(dir(), p));
export const remove = (p) => run(async () => { await store.remove(dir(), p, (f) => shell.trashItem(f)); return {}; });
export const importFiles = (_p, event) => run(async () => {
  const paths = await pickOpen(event);
  return paths.length ? store.importFiles(dir(), paths) : { ids: [], skipped: 0 };
});
export const exportOne = (p, event) => run(async () => {
  const t = await store.get(dir(), p.id), dest = await pickSave(event, { defaultPath: `${t.name}.json`, title: 'Export Palette' });
  if (!dest) return { canceled: true };
  await fsp.writeFile(dest, paletteFile(t.palette), 'utf8');
  return { canceled: false };
});
