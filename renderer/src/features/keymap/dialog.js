import { h } from '../../ui/kit/dom.js';
import { list } from '../../commands/registry.js';
import * as K from '../../commands/keymap.js';

export function openShortcuts(ctx) {
  const groups = new Map(), seen = new Set();
  for (const c of list((x) => !x.planned)) {
    const keys = K.effective(c.id).map((x) => K.display(x)).join(' / '), id = `${c.title}|${keys}`;
    if (!keys || seen.has(id)) continue;
    seen.add(id);
    (groups.get(c.group || 'Other') || groups.set(c.group || 'Other', []).get(c.group || 'Other')).push([c.title, keys]);
  }
  const cols = h('div', { class: 'km-cols' }, ...[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([g, rows]) => h('section', { class: 'km-sec' }, h('h4', {}, g),
    ...rows.sort((a, b) => a[0].localeCompare(b[0])).map(([t, k]) => h('div', { class: 'km-row' }, h('span', {}, t), h('kbd', {}, k))))));
  ctx.ui.openDialog({ title: 'Keyboard Shortcuts', icon: 'keyboard', width: 760, cls: 'km-sheet', body: cols, buttons: [
    { label: 'Close' }, { label: 'Customize…', onClick: () => { ctx.commands.execute('prefs.goto', { page: 'shortcuts' }); } }, { label: 'Print', primary: true, onClick: () => { window.print(); return false; } }] });
}
