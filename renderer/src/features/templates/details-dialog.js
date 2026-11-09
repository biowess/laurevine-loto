export function detailsDialog(ctx, { title, label, name = '', description = '', category = '', categories = [], onSubmit }) {
  const { h, openDialog } = ctx.ui;
  const inp = (v, max, aria, extra) => h('input', { type: 'text', class: 'input', value: v, maxlength: max, 'aria-label': aria, ...extra });
  const n = inp(name, 60, 'Name'), d = inp(description, 200, 'Description'), c = inp(category, 30, 'Category', { list: 'lv-tpl-cats', placeholder: 'Yours' });
  const msg = h('div', { class: 'lv-files__err', role: 'alert' });
  let busy = false, api;
  const go = async () => {
    if (busy) return;
    busy = true;
    try { await onSubmit({ name: n.value.trim(), description: d.value.trim(), category: c.value.trim() }); api.close(); } catch (err) { msg.textContent = err.message || 'The operation failed.'; }
    busy = false;
  };
  const row = (t, el) => h('label', { class: 'lv-tfield' }, h('span', {}, t), el);
  [n, d, c].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } }));
  api = openDialog({
    title, icon: 'layout-template', width: 460, focus: 'input',
    body: h('div', { class: 'lv-files' }, row('Name', n), row('Description', d), row('Category', c), h('datalist', { id: 'lv-tpl-cats' }, ...categories.map((x) => h('option', { value: x }))), msg),
    buttons: [{ label: 'Cancel' }, { label, primary: true, onClick: () => { go(); return false; } }],
  });
}
