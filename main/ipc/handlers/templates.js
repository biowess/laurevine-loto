import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import { run } from './reply.js';
import { listTemplates } from '../../services/templates.js';
import * as store from '../../services/template-store.js';
import { pickOpen, pickSave } from '../../services/fs/dialogs.js';

const dir = () => path.join(app.getPath('userData'), 'templates');

export const list = () => run(async () => ({ items: await listTemplates(dir()) }));
export const save = (p) => run(() => store.save(dir(), p));
export const update = (p) => run(() => store.update(dir(), p));
export const duplicate = (p) => run(() => store.duplicate(dir(), p));
export const remove = (p) => run(async () => { await store.remove(dir(), p, (f) => shell.trashItem(f)); return {}; });
export const importFiles = (_p, event) => run(async () => {
  const paths = await pickOpen(event);
  return paths.length ? store.importFiles(dir(), paths) : { ids: [], skipped: 0 };
});
export const exportOne = (p, event) => run(async () => {
  const t = await store.getTemplate(dir(), p.id), dest = await pickSave(event, { defaultPath: `${t.name}.md`, title: 'Export Template' });
  if (!dest) return { canceled: true };
  await fsp.writeFile(dest, t.text, 'utf8');
  return { canceled: false };
});
