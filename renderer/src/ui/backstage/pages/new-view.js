import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { register } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import { page } from '../page-kit.js';
import { list, onChange } from '../../../services/templates-client.js';
import { getSetting } from '../../../services/settings-client.js';
import { render } from '../../../core/markdown/renderer.js';
import { vars, fill, firstLines, categories, filterTemplates } from '../../../core/templates/gallery-model.js';

const st = { items: [], q: '', cat: 'All', sel: 'blank' }, thumbs = new Map();
let paint = () => {}, mark = () => {}, off = null;

register({ id: 'templates.select', title: 'Select Template', group: 'File', run: (id) => { st.sel = id; mark(); } });
register({ id: 'templates.category', title: 'Filter Templates by Category', group: 'File', run: (c) => { st.cat = c; paint(); } });

const thumb = (t) => {
  const key = `${t.id}\0${t.text}`;
  if (!thumbs.has(key)) {
    const box = h('div', { class: 'md-prev' });
    box.innerHTML = render(firstLines(fill(t.text, vars(getSetting('user.name')))), { profile: getSetting('markdown.defaultProfile') }).html;
    thumbs.set(key, h('div', { class: 'lv-tpl-thumb', 'aria-hidden': 'true' }, box));
  }
  return thumbs.get(key);
};

export function newView() {
  st.q = ''; st.cat = 'All'; thumbs.clear();
  const grid = h('div', { class: 'lv-tgal' }), chips = h('div', { class: 'lv-chips', role: 'group', 'aria-label': 'Category' });
  const label = h('span', {}, 'Create'), sum = h('div', { class: 'lv-tsum', 'aria-live': 'polite' });
  const create = h('button', { type: 'button', class: 'btn btn--primary', dataset: { cmd: 'file.new-from-template' }, onclick: () => runCommand('file.new-from-template', st.sel) }, icon('file-plus-2'), label);
  const search = h('input', { type: 'search', class: 'lv-hsearch', placeholder: 'Search templates', 'aria-label': 'Search templates', oninput: (e) => { st.q = e.target.value; paint(); } });
  const card = (t) => h('button', { type: 'button', class: 'lv-tcard' + (t.id === st.sel ? ' is-on' : ''), 'aria-pressed': String(t.id === st.sel), dataset: { cmd: 'templates.select', id: t.id },
    onclick: () => runCommand('templates.select', t.id), ondblclick: () => runCommand('file.new-from-template', t.id) },
  thumb(t), h('b', {}, t.name), h('span', {}, t.description), h('i', { class: 'lv-badge' }, t.builtin ? 'Built-in' : 'Yours'));
  mark = () => {
    grid.querySelectorAll('.lv-tcard').forEach((c) => { const on = c.dataset.id === st.sel; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
    create.disabled = !grid.querySelector(`.lv-tcard[data-id="${CSS.escape(st.sel)}"]`);
    const t = st.items.find((x) => x.id === st.sel);
    label.textContent = t ? `Create ${t.name}` : 'Create';
    sum.replaceChildren(...(t ? [h('b', {}, t.name), h('span', {}, `${t.description} Opens as a new unsaved document; nothing is written to disk until you save.`), h('i', { class: 'lv-badge' }, t.category || 'General')] : []));
  };
  paint = () => {
    chips.replaceChildren(...categories(st.items).map((c) => h('button', { type: 'button', class: 'lv-chip' + (c === st.cat ? ' is-on' : ''), 'aria-pressed': String(c === st.cat), dataset: { cmd: 'templates.category' }, onclick: () => runCommand('templates.category', c) }, c)));
    const shown = filterTemplates(st.items, st.q, st.cat);
    grid.replaceChildren(...(shown.length ? shown.map(card) : [h('p', { class: 'lv-hnone' }, 'No templates match.')]));
    mark();
  };
  const load = async () => {
    try { st.items = (await list()).items; } catch { st.items = []; }
    if (!st.items.some((t) => t.id === st.sel) && st.items[0]) st.sel = st.items[0].id;
    paint();
  };
  if (off) off();
  off = onChange(() => { if (grid.isConnected) load(); });
  return { nodes: page('New document', 'Start from a template, or from a blank page.', h('div', { class: 'lv-tbar' }, search, create), sum, chips, grid), load };
}
