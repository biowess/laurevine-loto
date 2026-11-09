import { FORMATS, outputNames } from '../../core/publish/batch-plan.js';
import { confirmDialog } from '../files/dialogs.js';
import { pickPdfDir } from '../../services/pdf-client.js';
import { exportExists } from '../../services/doc-client.js';
import * as pandoc from '../../services/pandoc-client.js';

const MAX_SHOWN = 40;

export async function openBatchBuilder(ctx, root, md, o, onRun) {
  const { h, openDialog, toast } = ctx.ui;
  const info = await pandoc.detect().catch(() => null), docx = !!(info && info.found && info.supported);
  const st = { format: o.format === 'docx' && !docx ? 'pdf' : o.format, name: o.name, dir: '', sel: new Set(o.files), query: '', exists: new Set() };
  const files = () => md.filter((f) => st.sel.has(f)), outs = () => outputNames(files(), st.format, st.name || 'Export');
  const isFolder = () => !!FORMATS.find((f) => f.id === st.format).folder;
  let seq = 0;

  const list = h('div', { class: 'col-list', role: 'list' }), count = h('span', { class: 'col-count', 'aria-live': 'polite' });
  const head = h('p', { class: 'bx-head', role: 'status' }), prev = h('ul', { class: 'bx-prev' }), dest = h('span', { class: 'bx-dest' }, 'No folder chosen');
  const fmt = h('select', { class: 'col-sel', 'aria-label': 'Format', onchange: () => { st.format = fmt.value; nameField.hidden = !isFolder(); refresh(); } },
    ...FORMATS.map((f) => h('option', { value: f.id, selected: f.id === st.format, disabled: f.id === 'docx' && !docx }, f.id === 'docx' && !docx ? 'Word DOCX (Pandoc not found)' : f.label)));
  const nameIn = h('input', { type: 'text', class: 'col-name', value: st.name, 'aria-label': 'Output folder name', oninput: () => { st.name = nameIn.value; refresh(); } });
  const nameField = h('label', { class: 'col-field', hidden: !isFolder() }, h('span', null, 'Folder name'), nameIn);
  const btn = (t, fn) => h('button', { type: 'button', class: 'btn', onclick: fn }, t);

  function drawList() {
    const q = st.query.trim().toLowerCase(), rows = md.filter((f) => !q || f.toLowerCase().includes(q));
    list.replaceChildren(...(rows.length ? rows : [null]).map((f) => {
      if (!f) return h('div', { class: 'col-empty' }, 'No Markdown documents match.');
      const cb = h('input', { type: 'checkbox', checked: st.sel.has(f), 'aria-label': `Include ${f}`, onchange: () => { if (cb.checked) st.sel.add(f); else st.sel.delete(f); refresh(); } });
      return h('label', { class: 'col-row', role: 'listitem' }, cb, h('span', { class: 'col-path', title: f }, f));
    }));
  }

  function drawPreview() {
    const all = outs(), over = all.filter((x) => st.exists.has(x.out));
    count.textContent = `${st.sel.size} of ${md.length} selected`;
    head.textContent = !st.sel.size ? 'Select at least one document.' : `${all.length} file${all.length === 1 ? '' : 's'}${st.dir ? ` will be written to ${st.dir}` : ' — choose a destination folder'}${st.format === 'site' ? '; images are added when the site is built' : ''}.${over.length ? ` ${over.length} existing file${over.length === 1 ? ' is' : 's are'} flagged and will only be replaced after you confirm.` : ''}`;
    prev.replaceChildren(...all.slice(0, MAX_SHOWN).map((x) => h('li', { class: st.exists.has(x.out) ? 'is-over' : '' }, h('span', null, x.out), st.dir ? h('em', null, st.exists.has(x.out) ? 'replaces existing' : 'new') : null)),
      ...(all.length > MAX_SHOWN ? [h('li', null, `…and ${all.length - MAX_SHOWN} more`)] : []));
  }

  async function refresh() {
    const n = ++seq, all = outs();
    st.exists = new Set();
    if (st.dir && all.length) {
      try { const r = await exportExists(st.dir, all.map((x) => x.out)); if (n !== seq) return; st.exists = new Set(r.exists); } catch (e) { toast(`Could not check the folder: ${e.message}`); }
    }
    drawPreview();
  }

  async function go() {
    if (!st.sel.size) { toast('Select at least one document.'); return; }
    if (!st.dir) { toast('Choose a destination folder first.'); return; }
    await refresh();
    const over = outs().map((x) => x.out).filter((n) => st.exists.has(n));
    if (over.length && !(await confirmDialog(ctx, { title: 'Replace existing files?', text: `${over.length} file${over.length === 1 ? '' : 's'} already exist in the destination and will be replaced: ${over.slice(0, 5).join(', ')}${over.length > 5 ? ', …' : ''}.`, label: 'Replace' }))) return;
    dlg.close();
    onRun({ format: st.format, name: st.name || 'Export', dir: st.dir, files: files(), confirmed: new Set(over) });
  }

  const search = h('input', { type: 'search', class: 'col-search', placeholder: 'Filter documents', 'aria-label': 'Filter documents', oninput: () => { st.query = search.value; drawList(); } });
  const pick = btn('Choose folder…', async () => {
    const r = await pickPdfDir().catch((e) => { toast(`Could not choose a folder: ${e.message}`); return null; });
    if (!r || r.canceled) return;
    st.dir = r.dir;
    dest.textContent = r.dir;
    refresh();
  });
  const all = (on) => () => { for (const f of md) if (on) st.sel.add(f); else st.sel.delete(f); drawList(); refresh(); };
  const body = h('div', { class: 'col' },
    h('div', { class: 'col-opts' }, h('label', { class: 'col-field' }, h('span', null, 'Format'), fmt), nameField, h('div', { class: 'col-field' }, h('span', null, 'Destination'), h('span', { class: 'bx-pick' }, pick, dest))),
    h('div', { class: 'col-bar' }, search, btn('All', all(true)), btn('None', all(false)), count), list,
    h('h3', { class: 'bx-title' }, 'Preview'), head, prev);
  drawList();
  drawPreview();
  const dlg = openDialog({ title: 'Batch Export', icon: 'package', width: 820, cls: 'col-dlg', body, focus: '.col-search',
    buttons: [{ label: 'Export', primary: true, onClick: () => { go(); return false; } }, { label: 'Close' }] });
  return dlg;
}
