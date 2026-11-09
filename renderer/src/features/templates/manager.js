import { icon } from '../../ui/kit/icons.js';
import { baseName } from '../../core/documents/paths.js';
import * as docs from '../../services/doc-client.js';
import * as TC from '../../services/templates-client.js';
import { categories } from '../../core/templates/gallery-model.js';
import { confirmDialog } from '../files/dialogs.js';
import { detailsDialog } from './details-dialog.js';

export function mountManager(ctx) {
  const { commands, ui } = ctx, { h } = ui, D = ctx.services.documents;
  let dlg = null, box = null, off = null;
  const def = (id, title, run) => commands.register({ id, title, group: 'File', run });
  const all = async () => (await TC.list()).items;
  const fail = (err) => ui.toast(err.message || 'The operation failed.', { timeout: 4000 });
  const act = (cmd, title, ic, id) => h('button', { type: 'button', class: 'tbtn', title, 'aria-label': title, dataset: { cmd }, onclick: () => commands.execute(cmd, id) }, icon(ic));

  async function paint() {
    if (!box) return;
    let items = [];
    try { items = await all(); } catch (err) { fail(err); }
    box.replaceChildren(...items.map((t) => h('div', { class: 'lv-trow' }, icon('layout-template'),
      h('div', { class: 'lv-tmeta' }, h('b', {}, t.name, h('i', { class: 'lv-tag' }, t.builtin ? 'Built-in' : 'Yours')), h('small', {}, `${t.category} · ${t.description}`)),
      h('span', { class: 'lv-hacts' }, ...(t.builtin ? [] : [act('templates.edit', 'Edit Content in a Tab', 'file-text', t.id), act('templates.details', 'Rename or Edit Details', 'pen-line', t.id)]),
        act('templates.duplicate', 'Duplicate', 'copy', t.id), act('templates.export', 'Export…', 'file-down', t.id), ...(t.builtin ? [] : [act('templates.delete', 'Delete', 'trash-2', t.id)])))));
  }

  commands.register({ id: 'custom.templates', title: 'Templates', icon: 'layout-template', group: 'Tools', run: () => {
    if (dlg) return;
    box = h('div', { class: 'lv-tlist' });
    off = TC.onChange(paint);
    paint();
    dlg = ui.openDialog({ title: 'Manage Templates', icon: 'layout-template', width: 680, body: box,
      buttons: [{ label: 'Import…', onClick: () => { commands.execute('templates.import'); return false; } }, { label: 'Close', primary: true }],
      onClose: () => { off(); dlg = null; box = null; TC.changed(); } });
  } });

  def('templates.edit', 'Edit Template Content', async (id) => {
    let t, doc;
    try { t = (await all()).find((x) => x.id === id); } catch (err) { return fail(err); }
    if (!t || !t.path) return;
    const open = D.findByPath(t.path);
    if (open) D.activate(open);
    else {
      try { doc = (await docs.openPath(t.path)).doc; } catch (err) { return fail(err); }
      D.openDocument({ ...doc, name: baseName(doc.path), diskHash: doc.hash });
    }
    if (dlg) dlg.close();
  });
  def('templates.details', 'Edit Template Details', async (id) => {
    let items;
    try { items = await all(); } catch (err) { return fail(err); }
    const t = items.find((x) => x.id === id);
    if (t && !t.builtin) detailsDialog(ctx, { title: 'Template Details', label: 'Save', name: t.name, description: t.description, category: t.category, categories: categories(items).slice(1), onSubmit: (v) => TC.update({ id, ...v }) });
  });
  def('templates.duplicate', 'Duplicate Template', async (id) => { try { await TC.duplicate(id); ui.toast('Template duplicated'); } catch (err) { fail(err); } });
  def('templates.delete', 'Delete Template', async (id) => {
    let t;
    try { t = (await all()).find((x) => x.id === id); } catch (err) { return fail(err); }
    if (!t || t.builtin || !(await confirmDialog(ctx, { title: 'Delete Template', text: `Delete “${t.name}”? It moves to the system trash.`, label: 'Delete' }))) return;
    try { await TC.remove(id); } catch (err) { fail(err); }
  });
  def('templates.import', 'Import Templates…', async () => {
    try { const r = await TC.importFiles(); if (r.skipped) ui.toast(`${r.skipped} file(s) could not be imported.`, { timeout: 4000 }); } catch (err) { fail(err); }
  });
  def('templates.export', 'Export Template…', async (id) => { try { await TC.exportOne(id); } catch (err) { fail(err); } });
}
