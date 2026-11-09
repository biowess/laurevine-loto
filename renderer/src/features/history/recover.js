import * as api from '../../services/history-client.js';
import { stat } from '../../services/doc-client.js';
import { baseName } from '../../core/documents/paths.js';
import { runCommand } from '../../ui/shell/panels.js';

const n = (p) => p.replace(/\\/g, '/').toLowerCase();

export async function openRecover(ctx) {
  const { h, openDialog, toast } = ctx.ui, root = ctx.store.get().workspace.root;
  let gone;
  try {
    const r = root ? `${n(root)}/` : '', all = (await api.files()).files.filter((f) => n(f.path).startsWith(r));
    gone = (await Promise.all(all.map((f) => stat(f.path).then(() => null, () => f)))).filter(Boolean).sort((a, b) => b.last - a.last);
  } catch (e) { return toast(e.message || 'Could not read history.'); }
  const dlg = openDialog({
    title: 'Recover deleted files', icon: 'archive-restore', width: 560, buttons: [{ label: 'Close' }],
    body: h('div', { class: 'lv-hist-rec' }, gone.length ? h('p', {}, 'These files have saved history but no longer exist on disk.') : h('p', {}, 'No deleted files with history were found in this workspace.'),
      ...gone.map((f) => h('div', { class: 'lv-hist-rec__row' }, h('span', {}, h('b', {}, baseName(f.path)), h('small', {}, f.path), h('small', {}, `${f.versions} version${f.versions === 1 ? '' : 's'} · last ${new Date(f.last).toLocaleString()}`)),
        h('button', { type: 'button', class: 'btn', dataset: { cmd: 'hist.recover-file' }, onclick: () => { dlg.close(); runCommand('hist.recover-file', f.path); } }, 'Recover…')))),
  });
}
