import { BrowserWindow, dialog, shell } from 'electron';
import { sep } from 'node:path';
import { recentsService } from '../../services/fs/index.js';
import { track } from '../../services/history/index.js';
import * as ops from '../../services/fs/ops.js';
import { DocError } from '../../services/fs/safe-path.js';
import { settingsService } from '../../services/settings/index.js';
import * as tree from '../../services/fs/tree.js';
import { activeRoot } from '../../services/workspace/index.js';
import { run } from './reply.js';

export const listDir = (payload, event) => run(async () => {
  const root = activeRoot(event);
  if (!root) throw new DocError('E_PATH', 'No workspace is open.');
  return tree.listDir(root, payload.path, payload);
});

const rootOf = (event) => {
  const root = activeRoot(event);
  if (!root) throw new DocError('E_PATH', 'No workspace is open.');
  return root;
};

const follow = async (pairs) => {
  try { const r = await recentsService(); for (const [from, to] of pairs) if (to && to !== from) { r.rename(from, to); for (const i of r.list().items) if (i.path.startsWith(from + sep)) r.rename(i.path, to + i.path.slice(from.length)); } } catch (err) { console.error('[recents]', err.message); }
  for (const [from, to] of pairs) if (to && to !== from) await track((h) => h.relink(from, to));
};

const pickFolder = async (event, title) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const opts = { title, properties: ['openDirectory', 'createDirectory'] };
  const r = await (win ? dialog.showOpenDialog(win, opts) : dialog.showOpenDialog(opts));
  return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
};

const transfer = (fn, title) => (p, event) => run(async () => {
  const root = rootOf(event);
  const extra = p.toDir ? null : await pickFolder(event, title);
  if (!p.toDir && !extra) return { canceled: true, results: [] };
  const results = await fn(root, p.paths, p.toDir ?? extra, extra);
  if (fn === ops.move) await follow(results.map((r) => [r.from, r.path]));
  return { canceled: false, results };
});

export const createFile = (p, event) => run(async () => ({ path: await ops.createFile(rootOf(event), p.dir, p.name) }));
export const createFolder = (p, event) => run(async () => ({ path: await ops.createFolder(rootOf(event), p.dir, p.name) }));
export const duplicate = (p, event) => run(async () => ({ path: await ops.duplicate(rootOf(event), p.path) }));
export const rename = (p, event) => run(async () => {
  const path = await ops.rename(rootOf(event), p.path, p.name);
  await follow([[p.path, path]]);
  return { path };
});
export const move = transfer(ops.move, 'Move to');
export const copy = transfer(ops.copy, 'Copy to');

export const del = (p, event) => run(async () => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const confirm = settingsService().get('explorer.confirmDelete') === false ? null : async (names) => {
    const opts = {
      type: 'warning', buttons: ['Move to Trash', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
      message: names.length === 1 ? `Move "${names[0]}" to the Trash?` : `Move ${names.length} items to the Trash?`,
      detail: `${names.slice(0, 8).map((n) => '• ' + n).join('\n')}${names.length > 8 ? `\n… and ${names.length - 8} more` : ''}\n\nTo restore, open the OS trash (Trash or Recycle Bin).`,
    };
    return (await (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts))).response === 0;
  };
  return ops.remove(rootOf(event), p.paths, { trash: (f) => shell.trashItem(f), confirm });
});
