import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { runCommand } from '../../shell/panels.js';
import { GROUPS, REPORT_NOTE, summary, items, rowLabel } from '../../../core/migration/report-view.js';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const BADGE = { preserved: 'check', unsupported: 'triangle-alert', unresolved: 'circle-help' };

function item(it) {
  const body = h('div', { class: 'lv-mig__rows' });
  const d = h('details', { class: `lv-mig__item lv-mig__item--${it.group}`, dataset: { item: it.id } },
    h('summary', {}, h('b', {}, it.title), h('span', { class: 'lv-mig__n' }, num(it.count))), h('p', { class: 'sub' }, it.note), body);
  d.addEventListener('toggle', () => {
    if (!d.open || body.childElementCount) return;
    const list = it.rows.map((r) => h('li', {}, h('code', {}, rowLabel(r)), r.text ? h('small', {}, r.text) : null));
    if (it.more) list.push(h('li', { class: 'lv-mig__more' }, `… ${num(it.more)} more not listed`));
    body.append(list.length ? h('ul', {}, list) : h('p', { class: 'sub' }, 'No file or line details are available for this item.'));
  });
  return d;
}

export function reportView(R) {
  const all = items(R);
  return [
    h('p', { class: 'lv-mig__note' }, icon('info'), REPORT_NOTE),
    h('dl', { class: 'lv-mig__sum' }, summary(R).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
    ...GROUPS.map(([g, title, blurb]) => h('section', { class: `lv-mig__grp lv-mig__grp--${g}` },
      h('h4', {}, icon(BADGE[g]), title), h('p', { class: 'sub' }, blurb), ...all.filter((i) => i.group === g).map(item))),
    R.warnings.length ? h('section', { class: 'lv-mig__grp' }, h('h4', {}, icon('triangle-alert'), 'Warnings'), h('ul', {}, R.warnings.map((w) => h('li', {}, w)))) : null,
    h('div', { class: 'md-cta' },
      h('button', { type: 'button', class: 'btn', dataset: { cmd: 'migration.export-md' }, onclick: () => runCommand('migration.export-md') }, icon('file-text'), 'Export Compatibility Report (Markdown)'),
      h('button', { type: 'button', class: 'btn', dataset: { cmd: 'migration.export-html' }, onclick: () => runCommand('migration.export-html') }, icon('globe'), 'Export Compatibility Report (HTML)')),
  ];
}
