import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { explain } from '../../core/preferences/model.js';
import { selectField } from '../../ui/kit/select.js';

const NAMES = { github: 'GitHub', gitlab: 'GitLab', pandoc: 'Pandoc', gfm: 'GFM', commonmark: 'CommonMark', ascii: 'ASCII', lf: 'LF', crlf: 'CRLF', docx: 'DOCX', html: 'HTML', pdf: 'PDF', ch: 'ch', px: 'px', md: '.md', markdown: '.markdown', txt: '.txt', 'utf-8': 'UTF-8', 'utf-8-bom': 'UTF-8 with BOM', 'utf-16le': 'UTF-16 LE', 'utf-16be': 'UTF-16 BE' };
const optLabel = (d, v) => (d.labels && d.labels[v]) || NAMES[v] || String(v).replace(/([a-z])([A-Z])/g, '$1 $2').split(/[-\s]+/).map((w) => NAMES[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// set(value) -> Promise<error message | null>. Returns { el, err, sync(value) }.
export function control(d, value, set) {
  const id = `pf-${d.id}`, err = h('div', { class: 'lv-pf__err', role: 'alert' });
  let main, read = () => main.value, write = (v) => { main.value = v; }, extra = null;
  const show = (m) => { err.textContent = m || ''; main.toggleAttribute('aria-invalid', !!m); };
  const commit = async (v) => { const m = explain(d, v); show(m); if (!m) show(await set(v)); };
  const on = (ev) => ({ [ev]: () => commit(read()) });
  const num = (el) => () => (el.value.trim() === '' ? NaN : Number(el.value));
  if (d.type === 'boolean') {
    main = h('input', { type: 'checkbox', role: 'switch', class: 'lv-pf__sw', id, ...on('onchange') });
    read = () => main.checked; write = (v) => { main.checked = v; };
  } else if (d.type === 'enum') {
    main = selectField(d.values.map((v) => [v, optLabel(d, v)]), d.default, { label: d.label, cls: 'lv-pf__sel' });
    main.id = id; main.addEventListener('change', () => commit(read()));
  } else if (d.type === 'number') {
    const attrs = { min: d.min, max: d.max, step: d.step || (d.integer ? 1 : 'any') };
    main = h('input', { type: 'number', class: 'input lv-pf__num', id, ...attrs, ...on('onchange') });
    read = num(main);
    if (d.control === 'slider' && d.min != null && d.max != null) {
      const r = h('input', { type: 'range', class: 'lv-pf__range', 'aria-label': d.label, ...attrs, oninput: () => { main.value = r.value; }, onchange: () => commit(Number(r.value)) });
      extra = r;
      write = (v) => { main.value = v; r.value = v; };
    }
  } else if (d.control === 'keybinding') {
    main = h('button', { type: 'button', class: 'btn', id, dataset: { cmd: 'prefs.keybinding' }, onclick: () => runCommand('prefs.keybinding', d.id) });
    write = (v) => { main.textContent = v || 'Not set'; };
  } else {
    main = h('input', { type: d.control === 'colour' ? 'color' : 'text', class: 'input' + (d.control === 'path' ? ' lv-pf__path' : ''), id, spellcheck: 'false', ...on('onchange') });
  }
  const sync = (v) => { if (document.activeElement !== main) { write(v); show(''); } };
  sync(value);
  return { el: h('span', { class: 'lv-pf__c' }, extra, main), err, sync };
}
