import * as PC from '../../services/presets-client.js';
import { readPath } from '../../services/doc-client.js';
import { orderItems, ORDER_MODES } from '../../core/publish/collection.js';
import { abs, toCollection } from '../../core/publish/collection-run.js';
import { presetState } from '../studio/presets-page.js';

const ORDER = { manual: 'Manual', filename: 'File Name', frontmatter: 'Front Matter “Order”' };

export async function openBuilder(ctx, root, state, { onRun, onChange }) {
  const { h, openDialog, toast } = ctx.ui;
  const pr = await PC.list().catch(() => null);
  const presetOpts = [['', `Active (${presetState.name})`], ...((pr && pr.items) || []).map((p) => [p.name, p.name])];
  const texts = {};
  let query = '', dragged = null, timer = 0;
  const find = (p) => state.items.find((i) => i.path === p);
  const shown = () => orderItems(toCollection(state), texts);
  const changed = () => { clearTimeout(timer); timer = setTimeout(() => onChange(state), 400); };
  const matches = (i) => { const q = query.trim().toLowerCase(); return !q || i.path.toLowerCase().includes(q) || i.title.toLowerCase().includes(q); };
  const select = (options, value, fn, label) => {
    const el = h('select', { class: 'col-sel', 'aria-label': label, onchange: () => fn(el.value) }, ...options.map(([v, t]) => h('option', { value: v, selected: v === value }, t)));
    return el;
  };
  const btn = (text, fn, label, cls = '') => h('button', { type: 'button', class: `btn ${cls}`, 'aria-label': label || text, onclick: fn }, text);
  const field = (text, el) => h('label', { class: 'col-field' }, h('span', null, text), el);
  const list = h('div', { class: 'col-list', role: 'list' });
  const count = h('span', { class: 'col-count', 'aria-live': 'polite' });
  const tally = () => { count.textContent = `${state.items.filter((i) => i.include).length} of ${state.items.length} selected`; };
  const orderSel = select(ORDER_MODES.map((m) => [m, ORDER[m]]), state.order, async (v) => {
    state.order = v;
    if (v === 'frontmatter') {
      await Promise.all(state.items.filter((i) => !(i.path in texts)).map(async (i) => {
        const r = await readPath(abs(root, i.path)).catch(() => null);
        texts[i.path] = r && r.doc ? r.doc.text : '';
      }));
    }
    changed();
    draw();
  }, 'Ordering preset');

  function reorder(path, to) {
    const cur = shown().map((i) => find(i.path)), from = cur.findIndex((i) => i.path === path);
    if (from < 0 || to < 0 || to >= cur.length || to === from) return;
    cur.splice(to, 0, cur.splice(from, 1)[0]);
    state.items = cur;
    state.order = 'manual';
    orderSel.value = 'manual';
    changed();
    draw();
  }

  function row(i, pos) {
    const cb = h('input', { type: 'checkbox', checked: i.include, 'aria-label': `Include ${i.path}`, onchange: () => { find(i.path).include = cb.checked; tally(); changed(); } });
    return h('div', {
      class: 'col-row', role: 'listitem', draggable: 'true',
      ondragstart: (e) => { dragged = i.path; e.dataTransfer.effectAllowed = 'move'; },
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => { e.preventDefault(); if (dragged && dragged !== i.path) reorder(dragged, shown().findIndex((x) => x.path === i.path)); dragged = null; },
      ondragend: () => { dragged = null; },
    },
    h('span', { class: 'col-grip', 'aria-hidden': 'true' }, '⠿'), cb,
    h('span', { class: 'col-path', title: i.path }, i.path),
    h('input', { class: 'col-title', placeholder: 'Title override', value: i.title, 'aria-label': `Title for ${i.path}`, oninput: (e) => { find(i.path).title = e.target.value; changed(); } }),
    state.mode === 'separate' ? select(presetOpts, state.presets[i.path] || '', (v) => { if (v) state.presets[i.path] = v; else delete state.presets[i.path]; changed(); }, `Preset for ${i.path}`) : null,
    btn('↑', () => reorder(i.path, pos - 1), `Move ${i.path} up`, 'col-mv'), btn('↓', () => reorder(i.path, pos + 1), `Move ${i.path} down`, 'col-mv'));
  }

  function draw() {
    list.replaceChildren();
    shown().forEach((i, pos) => { if (matches(i)) list.append(row(i, pos)); });
    if (!list.firstChild) list.append(h('div', { class: 'col-empty' }, state.items.length ? 'No documents match.' : 'No Markdown documents in this workspace.'));
    tally();
  }

  const setVisible = (v) => { state.items.forEach((i) => { if (matches(i)) i.include = v; }); changed(); draw(); };
  const search = h('input', { type: 'search', class: 'col-search', placeholder: 'Search documents', 'aria-label': 'Search documents', oninput: (e) => { query = e.target.value; draw(); } });
  const parts = h('input', { type: 'checkbox', checked: state.parts, onchange: () => { state.parts = parts.checked; changed(); } });
  const body = h('div', { class: 'col' },
    h('div', { class: 'col-bar' }, search, btn('Select visible', () => setVisible(true)), btn('Clear visible', () => setVisible(false)), count),
    h('div', { class: 'col-opts' },
      field('Order', orderSel),
      field('Output', select([['combined', 'One combined PDF'], ['separate', 'One PDF per document']], state.mode, (v) => { state.mode = v; changed(); draw(); }, 'Output')),
      field('Preset', select(presetOpts, state.preset, (v) => { state.preset = v; changed(); }, 'Preset')),
      h('label', { class: 'col-field col-field--check' }, parts, h('span', null, 'Folders as parts')),
      field('Collection title', h('input', { class: 'col-name', value: state.name, placeholder: 'Collection', oninput: (e) => { state.name = e.target.value; changed(); } }))),
    list);
  draw();
  return openDialog({
    title: 'Collection Builder', icon: 'library', width: 880, cls: 'col-dlg', body, focus: '.col-search',
    buttons: [
      { label: 'Generate PDF Collection', primary: true, onClick: () => { if (!state.items.some((i) => i.include)) { toast('Select at least one document.'); return false; } onRun(state); } },
      { label: 'Close' },
    ],
    onClose: () => { clearTimeout(timer); onChange(state); },
  });
}
