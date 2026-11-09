// Insert > Contents dialog: every TOC option, live Markdown preview, insert at caret or update the TOC under it.
import { TOC_DEFAULTS } from '../../core/toc/generate.js';
import { selectField } from '../../ui/kit/select.js';
import { planToc, tocAt } from '../../core/toc/edit.js';

const L6 = [1, 2, 3, 4, 5, 6];

export function openTocDialog(ctx, { text, pos, strategy, maintenance, onApply }) {
  const { ui: { h, openDialog } } = ctx, cur = tocAt(text, pos), o = { ...TOC_DEFAULTS, ...(cur ? cur.opts : {}) };
  const sel = (vals, v, label) => selectField(vals, v, { label });
  const chk = (label, v) => { const i = h('input', { type: 'checkbox' }); i.checked = !!v; return [i, h('label', { class: 'toc-chk' }, i, label)]; };
  const title = h('input', { type: 'text', class: 'toc-in', 'aria-label': 'Title', placeholder: 'No title', value: o.title }), tl = sel(L6.map((n) => [n, `H${n}`]), o.titleLevel, 'Title level');
  const lv = L6.map((n) => chk(`H${n}`, (o.levels || L6).map(Number).includes(n)));
  const start = sel([[0, 'Auto'], ...L6.map((n) => [n, `H${n}`])], o.startLevel, 'Start level'), depth = sel(L6.map((n) => [n, String(n)]), o.maxDepth, 'Maximum depth');
  const style = sel([['bullet', 'Bullets'], ['numbered', 'Numbered List'], ['none', 'Plain Lines']], o.style, 'List Style'), maint = sel([['manual', 'Manual'], ['auto', 'Automatic']], maintenance, 'Maintenance');
  const nested = chk('Nested', o.nested), nums = chk('Section numbers', o.numbers), links = chk('Links', o.links), cont = chk('Include the heading containing it', o.includeContainer);
  const pre = h('pre', { class: 'toc-pre', tabindex: '0', 'aria-label': 'Preview' }), err = h('p', { class: 'toc-err', role: 'alert' }), note = h('p', { class: 'toc-note' },
    'The list is plain Markdown. Laurevine keeps it current between two HTML comment markers (<!-- laurevine:toc:start … --> and <!-- laurevine:toc:end -->). Other tools ignore the comments, so elsewhere the list stays as written and will not refresh.');
  const row = (label, ...c) => h('div', { class: 'toc-row' }, h('span', { class: 'toc-lbl' }, label), ...c);
  const opts = () => ({ title: title.value.trim(), titleLevel: +tl.value, levels: L6.filter((n, i) => lv[i][0].checked), startLevel: +start.value, maxDepth: +depth.value, nested: nested[0].checked, numbers: nums[0].checked, links: links[0].checked, style: style.value, includeContainer: cont[0].checked });
  let plan = null;
  const upd = () => {
    plan = planToc(text, { pos, id: cur ? cur.id : undefined, opts: opts(), strategy });
    err.textContent = plan.error || (plan.warnings && plan.warnings[0]) || '';
    pre.textContent = plan.error ? '' : plan.change.insert;
  };
  const body = h('div', { class: 'toc-form' },
    row('Title', title, tl), row('Levels', h('span', { class: 'toc-levels' }, ...lv.map((c) => c[1]))), row('Start at', start, h('span', { class: 'toc-lbl' }, 'Depth'), depth),
    row('Style', style, nested[1]), row('Show', nums[1], links[1], cont[1]), row('Maintenance', maint),
    h('div', { class: 'toc-lbl' }, 'Preview'), pre, err, note);
  body.addEventListener('input', upd); body.addEventListener('change', upd);
  upd();
  openDialog({
    title: cur ? 'Edit Contents' : 'Insert Contents', icon: 'list-tree', width: 560, cls: 'toc-dlg', focus: '.toc-in',
    body, buttons: [{ label: 'Cancel' }, { label: cur ? 'Update' : 'Insert', primary: true, onClick: () => { if (plan.error) return false; onApply(plan, maint.value); } }],
  });
}
