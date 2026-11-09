import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import { run } from './reply.js';
import * as store from '../../services/presets.js';
import { presetFile, bundleFile } from '../../../shared/presets.js';
import { pickOpen, pickSave } from '../../services/fs/dialogs.js';

const dir = () => path.join(app.getPath('userData'), 'presets');

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
  const t = await store.get(dir(), p.id), dest = await pickSave(event, { defaultPath: `${t.name}.json`, title: 'Export Preset' });
  if (!dest) return { canceled: true };
  await fsp.writeFile(dest, presetFile(t.name, t.config), 'utf8');
  return { canceled: false };
});
export const exportBundle = (_p, event) => run(async () => {
  const items = await store.list(dir()), dest = await pickSave(event, { defaultPath: 'export-presets-bundle.json', title: 'Export Presets Bundle' });
  if (!dest) return { canceled: true };
  await fsp.writeFile(dest, bundleFile(items), 'utf8');
  return { canceled: false };
});
