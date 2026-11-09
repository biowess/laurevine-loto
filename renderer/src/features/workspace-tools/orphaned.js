import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { clearToasts } from '../../ui/kit/toast.js';
import { baseName } from '../../core/documents/paths.js';
import { humanSize } from '../../core/text/attach.js';
import * as W from '../../services/workspace-client.js';
import { reveal } from '../../services/doc-client.js';
import { txPreview, txApply } from '../../services/tx-client.js';
import { recordOp, undoOp } from '../search/index.js';

export async function openOrphanedAssets(ctx) {
  const { store, commands, ui: { openDialog, toast } } = ctx;
  const root = store.get().workspace.root;
  if (!root) return toast('Open a workspace folder first.');

  const sep = root.includes('\\') ? '\\' : '/';
  const toAbs = (rel) => root.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep);

  toast('Scanning workspace for orphaned assets…', { timeout: 2000 });
  const res = await W.index('integrity').catch(() => null);
  const raw = [...(res?.orphanedAssets || []), ...(res?.unusedAttachments || [])];
  const byPath = new Map();
  for (const item of raw) {
    if (!byPath.has(item.path)) byPath.set(item.path, item);
  }
  let items = [...byPath.values()];

  if (!items.length) return toast('No orphaned assets found in the workspace.');

  let dlg;
  const filterInput = h('input', { type: 'text', class: 'input', placeholder: 'Filter by filename or path', spellcheck: 'false' });
  const list = h('div', { class: 'wt-list' });
  const countLabel = h('div', { class: 'wt-sub' });
  const selected = new Set();

  function renderList() {
    list.replaceChildren();
    selected.clear();
    const q = filterInput.value.trim().toLowerCase();
    const visible = q ? items.filter((it) => it.path.toLowerCase().includes(q)) : items;
    const totalBytes = visible.reduce((a, b) => a + (b.size || 0), 0);

    countLabel.textContent = `${visible.length} orphaned asset${visible.length === 1 ? '' : 's'} (${humanSize(totalBytes)}) not referenced by any document.`;

    if (!visible.length) {
      list.append(h('div', { class: 'wt-empty' }, 'No assets match the filter.'));
      return;
    }

    visible.forEach((it) => {
      const abs = toAbs(it.path);
      const cb = h('input', { type: 'checkbox', checked: true });
      selected.add(it.path);
      cb.addEventListener('change', () => { if (cb.checked) selected.add(it.path); else selected.delete(it.path); });

      const name = baseName(it.path);
      const isImg = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(name);
      const ic = isImg ? 'image' : /\.(mp4|webm|mov)$/i.test(name) ? 'video' : /\.(mp3|wav|ogg)$/i.test(name) ? 'music' : 'file';

      const revBtn = h('button', { type: 'button', class: 'btn btn--sm', title: 'Show in Folder', onclick: () => reveal(abs).catch(() => {}) }, icon('folder-open'));
      const delBtn = h('button', { type: 'button', class: 'btn btn--sm btn--danger', title: 'Delete Asset', onclick: () => deleteItems([it.path], `Delete ${name}`) }, icon('trash-2'));

      const row = h('div', { class: 'wt-item' },
        cb,
        h('span', { class: 'wt-ico' }, icon(ic)),
        h('div', { class: 'wt-item__content' },
          h('b', { class: 'wt-item__name' }, name),
          h('div', { class: 'wt-item__path' }, `${it.path} · ${humanSize(it.size || 0)}`)),
        h('div', { class: 'wt-actions' }, revBtn, delBtn));
      list.append(row);
    });
  }

  filterInput.addEventListener('input', renderList);

  async function deleteItems(paths, label = 'Delete Orphaned Assets') {
    if (!paths.length) return toast('No assets selected.');
    const totalBytes = items.filter((it) => paths.includes(it.path)).reduce((a, b) => a + (b.size || 0), 0);
    const confirmed = await new Promise((resolve) => {
      openDialog({
        title: 'Confirm Delete',
        icon: 'trash-2',
        width: 480,
        body: h('div', { class: 'wt-dlg' },
          h('p', {}, `Permanently delete ${paths.length} file${paths.length === 1 ? '' : 's'} (${humanSize(totalBytes)})?`),
          h('p', { class: 'wt-sub' }, 'This will record an undoable transaction, allowing you to restore the files if needed.')),
        buttons: [
          { label: 'Cancel' },
          { label: 'Delete', primary: true, onClick: () => resolve(true) },
        ],
        onClose: () => resolve(false),
      });
    });

    if (!confirmed) return;

    const ops = paths.map((rel) => ({ op: 'delete', path: toAbs(rel) }));
    const p = await txPreview(ops, label).catch((e) => ({ ok: false, error: e }));
    if (!p || !p.ok) return toast((p && p.error && p.error.message) || 'Delete preview failed.');

    const a = await txApply(p.id).catch((e) => ({ ok: false, error: e }));
    if (!a || !a.ok) return toast((a && a.error && a.error.message) || 'Delete operation failed.');

    const applied = a.results.filter((r) => r.status === 'applied');
    const failed = a.results.filter((r) => r.status !== 'applied');

    const op = recordOp({ label: `${label} (${applied.length} files)`, txId: p.id, tabs: [] });

    items = items.filter((it) => !applied.some((x) => x.path === toAbs(it.path)));
    renderList();

    clearToasts();
    const t = toast(`Deleted ${applied.length} file${applied.length === 1 ? '' : 's'}${failed.length ? `; ${failed.length} failed` : ''}.`, { timeout: 12000 });
    t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));
  }

  async function trashSelected() {
    const paths = [...selected];
    if (!paths.length) return toast('No assets selected.');
    const confirmed = await new Promise((resolve) => {
      openDialog({
        title: 'Move to Trash',
        icon: 'trash',
        width: 460,
        body: `Move ${paths.length} file${paths.length === 1 ? '' : 's'} to trash?`,
        buttons: [
          { label: 'Cancel' },
          { label: 'Move to Trash', primary: true, onClick: () => resolve(true) },
        ],
        onClose: () => resolve(false),
      });
    });
    if (!confirmed) return;

    const r = await W.del(paths.map(toAbs)).catch((e) => ({ ok: false, error: e }));
    const bad = r && r.results && r.results.find((x) => x.error);
    if (bad) toast(bad.error.message || bad.error);
    else toast(`Moved ${paths.length} file${paths.length === 1 ? '' : 's'} to trash.`);

    items = items.filter((it) => !paths.includes(it.path));
    renderList();
  }

  renderList();

  dlg = openDialog({
    title: 'Inspect Orphaned Assets',
    icon: 'file-warning',
    width: 660,
    body: h('div', { class: 'wt-dlg' },
      filterInput,
      countLabel,
      list),
    buttons: [
      { label: 'Open Attachments', onClick: () => { dlg.close(); commands.execute('attachments.manage'); return false; } },
      { label: 'Move to Trash', onClick: () => { trashSelected(); return false; } },
      { label: 'Delete Selected', primary: true, onClick: () => { deleteItems([...selected], `Delete ${selected.size} Orphaned Assets`); return false; } },
      { label: 'Close' },
    ],
  });
}
