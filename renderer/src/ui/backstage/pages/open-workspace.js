import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { store } from '../../../state/store.js';
import { uiActions } from '../../../state/slices/ui.js';
import { register, has } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import * as workspaces from '../../../services/workspace-client.js';
import { formatWhen } from '../../../core/backstage/doc-state.js';
import { page, cta } from '../page-kit.js';

let box = null;
async function load() {
  const el = box;
  let items = [];
  try { items = (await workspaces.list()).items; } catch { /* no bridge */ }
  const cur = store.get().workspace.root;
  el.replaceChildren(...(items.length ? [h('div', { class: 'md-list' }, ...items.map((w) => h('div', { class: 'lv-hrow' },
    h('button', { type: 'button', class: 'lv-hmain', title: w.root, dataset: { cmd: 'workspace.open' }, onclick: async () => { const r = await runCommand('workspace.open', w.root); if (r && r.ok) store.dispatch(uiActions.backstage(false)); } },
      icon('folder-open'), h('b', {}, w.name), h('small', {}, `${w.root} · ${w.root === cur ? 'Current · ' : ''}Last opened ${formatWhen(w.lastOpened)}`)),
    h('span', { class: 'lv-hacts is-on' }, h('button', { type: 'button', class: 'tbtn', title: 'Remove from list', 'aria-label': `Remove ${w.name} from list`, dataset: { cmd: 'workspace.forget' }, onclick: () => runCommand('workspace.forget', w.root) }, icon('x'))))))]
    : [h('p', { class: 'lv-hnone' }, 'No workspaces yet. Open a folder to add one.')]));
}
if (!has('workspace.forget')) register({ id: 'workspace.forget', title: 'Remove Workspace from List', group: 'File', run: async (root) => { await workspaces.forget(root); if (box && box.isConnected) load(); } });

export default {
  id: 'open-workspace', title: 'Open Workspace', icon: 'folders',
  render: () => { box = h('div', { style: { maxWidth: '680px' } }); return page('Open Workspace', 'Folders you have opened before.', cta(['workspace.open', 'Open Workspace…', 'folders', 1]), h('h4', {}, 'Workspaces'), box); },
  after: load,
};
