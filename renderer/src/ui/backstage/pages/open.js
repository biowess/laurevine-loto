import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { store } from '../../../state/store.js';
import { uiActions } from '../../../state/slices/ui.js';
import { runCommand } from '../../shell/panels.js';
import * as recents from '../../../services/recents-client.js';
import { page } from '../page-kit.js';

const ACTS = [
  ['file.open', 'Open File', 'file-up', 'Choose a Markdown or text file.'], ['file.open-folder', 'Open Folder', 'folder-open', 'Browse a folder in the Explorer.'],
  ['workspace.open', 'Open Workspace', 'folders', 'Pick a folder as the workspace.'], ['file.open-path', 'Open from Path…', 'folder-input', 'Type or paste a file path.'],
  ['file.open', 'Open Multiple Files', 'files', 'Select several documents in one dialog.'],
];
let list;

export default {
  id: 'open', title: 'Open', icon: 'folder-open',
  render: () => {
    list = h('div', { class: 'md-list' });
    return h('div', { class: 'lv-open' }, ...page('Open', 'Open documents and folders.',
      h('button', { type: 'button', class: 'lv-dropzone', dataset: { cmd: 'file.open' }, onclick: () => runCommand('file.open') }, h('span', { class: 'lv-dz__ic' }, icon('file-up')), h('b', {}, 'Drop files here'), h('small', {}, 'or press Enter to choose files')),
      h('div', { class: 'md-list lv-acts' }, ...ACTS.map(([id, t, ic, d]) => h('button', { type: 'button', class: 'lv-hmain lv-hact', dataset: { cmd: id }, onclick: () => runCommand(id) }, h('span', { class: 'lv-oic' }, icon(ic)), h('span', { class: 'lv-ot' }, h('b', {}, t), h('small', {}, d))))),
      h('h4', { class: 'lv-ohead' }, h('span', {}, 'Recent'), h('button', { type: 'button', class: 'lv-hclear', dataset: { cmd: 'backstage.home' }, onclick: () => runCommand('backstage.home') }, 'More')), list));
  },
  after: async () => {
    const box = list;
    let items = [];
    try { items = (await recents.list()).items.slice(0, 6); } catch { /* no bridge */ }
    box.replaceChildren(...(items.length ? items.map((i) => h('div', { class: 'lv-hrow' }, h('button', { type: 'button', class: 'lv-hmain', title: i.path, dataset: { cmd: 'file.open-recent' },
      onclick: async () => { const r = await runCommand('file.open-recent', i.path); if (r && r.ok) store.dispatch(uiActions.backstage(false)); } }, h('span', { class: 'lv-oic' }, icon('file-text')), h('span', { class: 'lv-ot' }, h('b', {}, i.name), h('small', {}, i.path.replace(/[\\/][^\\/]*$/, ''))))))
      : [h('p', { class: 'lv-hnone', style: { padding: '8px 12px' } }, 'No recent documents.')]));
  },
};
