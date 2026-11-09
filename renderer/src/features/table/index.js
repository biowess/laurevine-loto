// Insert > Table (size popover + custom size), contextual Table ribbon tab, Tab/Enter cell navigation, editor and preview table context menus.
import { findTableAt, serializeTable, addRow, insertTable, blank, sizeError, cellAt, cellRange, step, PLAN, toTSV, MAX, isHeaderless } from '../../core/table/index.js';
import { openTableEditor } from './editor.js';
import { render } from '../../core/markdown/renderer.js';
import { writeText } from '../../services/clipboard-client.js';
import { addKeyHook } from '../../services/editor-hooks.js';
import { onEditorActivity, setPreviewMenu } from '../../ui/editor/editor-pane.js';
import { contextual } from '../../ui/ribbon/ribbon.js';
import { openPopover, closePopover } from '../../ui/kit/popover.js';
import { openContextMenu } from '../../ui/kit/menu.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const NO_TABLE = 'Needs the caret inside a Markdown table in the Source or Split editor';
const ACTS = [
  ['row-above', 'Add Row Above', 'between-horizontal-start'], ['row-below', 'Add Row Below', 'between-horizontal-end'],
  ['col-left', 'Add Column Left', 'between-vertical-start'], ['col-right', 'Add Column Right', 'between-vertical-end'],
  ['del-row', 'Delete Row', 'trash-2'], ['del-col', 'Delete Column', 'trash-2'],
  ['row-up', 'Move Row Up', 'arrow-up'], ['row-down', 'Move Row Down', 'arrow-down'],
  ['col-move-left', 'Move Column Left', 'arrow-left'], ['col-move-right', 'Move Column Right', 'arrow-right'],
  ['align-left', 'Align Left', 'align-left'], ['align-center', 'Align Center', 'align-center'], ['align-right', 'Align Right', 'align-right'],
  ['header', 'Header Row', 'heading'], ['sort-asc', 'Sort Ascending', 'arrow-down-a-z'], ['sort-desc', 'Sort Descending', 'arrow-down-z-a'],
  ['format', 'Format Table', 'wand-sparkles'],
];
const OTHER = [['edit', 'Table Editor…', 'table-properties'], ['select', 'Select Table', 'text-select'], ['copy-html', 'Copy as HTML', 'code-xml'], ['copy-tsv', 'Copy as TSV', 'copy'], ['copy-md', 'Copy as Markdown', 'copy']];
const MENU = ['edit', '-', 'row-above', 'row-below', 'col-left', 'col-right', '-', 'del-row', 'del-col', '-', 'row-up', 'row-down', 'col-move-left', 'col-move-right', '-', 'align-left', 'align-center', 'align-right', '-', 'header', 'sort-asc', 'sort-desc', 'format', '-', 'select', 'copy-html', 'copy-tsv', 'copy-md'];
const TAB = [
  ['Rows & Columns', 'table', 0, '*table.row-below', 'table.row-above', 'table.col-left', 'table.col-right', 'table.del-row', 'table.del-col', 'table.row-up', 'table.row-down', 'table.col-move-left', 'table.col-move-right'],
  ['Alignment', 'align-left', 0, '*table.align-left', 'table.align-center', 'table.align-right'],
  ['Table', 'table-properties', 0, '*table.header', 'table.sort|table.sort-asc/table.sort-desc', 'table.format', 'table.select', 'table.copy-html', 'table.copy-tsv', 'table.copy-md', 'table.edit'],
];
const CHECK = { 'align-left': 'left', 'align-center': 'center', 'align-right': 'right' };

export function register(ctx) {
  const { commands, store, services: { documents }, ui: { h, toast, openDialog }, settings } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  let ctxPos = null, ms = null, mp = null, mr = null;

  const read = (v, pos) => {
    const doc = v.state.doc.toString(), m = findTableAt(doc, pos);
    return m && { v, doc, m, ...cellAt(doc, m, pos) };
  };
  const at = () => {
    const v = view();
    if (!v || (store.get().ui.mode === 'preview' && ctxPos == null)) return null;
    const pos = ctxPos ?? v.state.selection.main.head;
    if (ms !== v.state || mp !== pos) { ms = v.state; mp = pos; mr = read(v, pos); }
    return mr;
  };
  const put = (c, p) => {
    const t = serializeTable(p.m), { from, to } = c.m.range, [a, b] = cellRange(t, from, p.row, p.col);
    c.v.dispatch({ changes: t === c.doc.slice(from, to) ? undefined : { from, to, insert: t }, selection: { anchor: a, head: b }, userEvent: 'input.format', scrollIntoView: true });
    if (store.get().ui.mode !== 'preview') c.v.focus();
  };
  const go = (c, row, col) => {
    const { from, to } = c.m.range, [a, b] = cellRange(c.doc.slice(from, to), from, row, col);
    c.v.dispatch({ selection: { anchor: a, head: b }, scrollIntoView: true, userEvent: 'select' });
  };

  const insert = (rows, cols) => {
    const v = view();
    if (!v) return;
    const doc = v.state.doc.toString(), sel = v.state.selection.main, t = findTableAt(doc, sel.head);
    const r = insertTable(doc, t ? t.range.to : sel.to, rows, cols);
    v.dispatch({ changes: r.changes, selection: { anchor: r.caret }, userEvent: 'input.format', scrollIntoView: true });
    v.focus();
  };
  const anchorFor = () => {
    const v = view(), a = document.activeElement, c = v.coordsAtPos(v.state.selection.main.head);
    return a && a.closest('.ribbon, .tabrow') ? a : { x: c ? c.left : 80, y: c ? c.bottom : 80, restore: v.contentDOM };
  };

  function sizePopover() {
    const label = h('div', { class: 'tb-label', 'aria-live': 'polite' }, 'Choose a size');
    const cells = [];
    const mark = (r, c) => { cells.forEach((b) => b.classList.toggle('is-on', +b.dataset.r <= r && +b.dataset.c <= c)); label.textContent = r ? `${r} × ${c} table (header + ${r - 1} row${r === 2 ? '' : 's'})` : 'Choose a size'; };
    const grid = h('div', { class: 'tb-grid', role: 'grid', 'aria-label': 'Table size, rows by columns' });
    for (let r = 1; r <= 10; r++) for (let c = 1; c <= 10; c++) {
      const b = h('button', { type: 'button', class: 'tb-cell', tabindex: r === 1 && c === 1 ? '0' : '-1', dataset: { r, c }, 'aria-label': `${r} rows by ${c} columns`, onmouseenter: () => mark(r, c), onfocus: () => mark(r, c), onclick: () => { closePopover(); insert(r, c); } });
      cells.push(b); grid.append(b);
    }
    grid.addEventListener('mouseleave', () => mark(0, 0));
    grid.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 }[e.key], i = cells.indexOf(document.activeElement), n = cells[i + d];
      if (!d || !n) return;
      e.preventDefault();
      cells[i].tabIndex = -1; n.tabIndex = 0; n.focus();
    });
    const more = h('button', { type: 'button', class: 'tb-more', onclick: () => { closePopover(); commands.execute('ins.table-custom'); } }, 'Custom Size…');
    if (openPopover(anchorFor(), h('div', { class: 'tb-pop' }, grid, label, more))) cells[0].focus();
  }

  function customDialog() {
    const num = (id, label, v, max) => h('label', { class: 'tb-field' }, h('span', {}, label), h('input', { id, type: 'number', min: 1, max, step: 1, value: v, inputmode: 'numeric' }));
    const rows = num('tb-rows', 'Rows (including header)', 3, MAX.rows), cols = num('tb-cols', 'Columns', 3, MAX.cols), err = h('div', { class: 'tb-err', role: 'alert' });
    const val = () => { const r = rows.lastChild.value, c = cols.lastChild.value; const e = sizeError(/^\d+$/.test(r) ? +r : NaN, /^\d+$/.test(c) ? +c : NaN); err.textContent = e; return e ? null : [+r, +c]; };
    const submit = () => { const s = val(); if (!s) return false; insert(...s); };
    const dlg = openDialog({ title: 'Custom Table Size', icon: 'table', width: 380, focus: '#tb-rows', body: [rows, cols, err], buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: submit }] });
    [rows, cols].forEach((f) => { f.lastChild.addEventListener('input', val); f.lastChild.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (submit() !== false) dlg.close('Insert'); } }); });
  }

  function openEditor() {
    const v = view();
    if (!v) return;
    const c = at();
    if (c) {
      const { from, to } = c.m.range, orig = c.doc.slice(from, to);
      openTableEditor({ model: c.m, row: c.row, col: c.col, onApply: (t) => {
        if (v.state.doc.sliceString(from, to) !== orig) { toast('The table changed in the editor; reopen the Table Editor'); return false; }
        if (t === orig) return;
        const [a, b] = cellRange(t, from, -1, 0);
        v.dispatch({ changes: { from, to, insert: t }, selection: { anchor: a, head: b }, userEvent: 'input.format', scrollIntoView: true });
        v.focus();
      } });
      return;
    }
    openTableEditor({ model: blank(3, 3), onApply: (t) => {
      const d = v.state.doc.toString(), r = insertTable(d, v.state.selection.main.to, 1, 1), stub = serializeTable(blank(1, 1));
      v.dispatch({ changes: { ...r.changes, insert: r.changes.insert.replace(stub, () => t) }, selection: { anchor: r.caret }, userEvent: 'input.format', scrollIntoView: true });
      v.focus();
    } });
  }

  commands.register({ id: 'ins.table-visual', title: 'Table Editor', icon: 'table-properties', group: 'Tables', enabled: ready, reason: NO_EDITOR, run: openEditor });
  commands.register({ id: 'ins.table', title: 'Table', icon: 'table', group: 'Tables', enabled: ready, reason: NO_EDITOR, run: sizePopover });
  commands.register({ id: 'ins.table-3x4', title: 'Insert 3 × 4', icon: 'table', group: 'Tables', enabled: ready, reason: NO_EDITOR, run: () => insert(3, 4) });
  commands.register({ id: 'ins.table-custom', title: 'Custom Size…', icon: 'table-properties', group: 'Tables', enabled: ready, reason: NO_EDITOR, run: customDialog });

  const tableHtml = (m) => {
    const t = new DOMParser().parseFromString(render(serializeTable(m), { profile: settings.get('markdown.defaultProfile') }).html, 'text/html').querySelector('table');
    t.querySelectorAll('[data-src-line],[data-src-end]').forEach((e) => { e.removeAttribute('data-src-line'); e.removeAttribute('data-src-end'); });
    t.querySelectorAll('tr').forEach((r) => [...r.cells].forEach((c, i) => { if (m.align[i]) c.style.textAlign = m.align[i]; }));
    if (isHeaderless(m)) t.querySelector('thead')?.remove();
    return t.outerHTML;
  };
  const plan = (k) => { const c = at(); return c ? { c, p: PLAN[k](c.m, c.row, c.col) } : null; };
  const def = (k, title, icon, extra) => commands.register({ id: `table.${k}`, title, icon, group: 'Table', reason: NO_TABLE, ...extra });
  const exec = (k) => { const x = plan(k); if (x && x.p) put(x.c, x.p); };
  for (const [k, title, icon] of ACTS) {
    def(k, title, icon, {
      enabled: () => !!plan(k)?.p, run: () => exec(k),
      ...(CHECK[k] ? { checked: () => { const c = at(); return !!c && c.m.align[c.col] === CHECK[k]; } } : {}),
      ...(k === 'header' ? { checked: () => { const c = at(); return !!c && !isHeaderless(c.m); } } : {}),
    });
  }
  def('sort', 'Sort', 'arrow-down-a-z', { enabled: () => !!plan('sort-asc')?.p, run: () => exec('sort-asc') });
  const inTable = { enabled: () => !!at() };
  def('edit', 'Table Editor…', 'table-properties', { ...inTable, run: openEditor });
  def('select', 'Select Table', 'text-select', { ...inTable, run: () => { const c = at(); if (c) { c.v.dispatch({ selection: { anchor: c.m.range.from, head: c.m.range.to }, scrollIntoView: true }); if (store.get().ui.mode !== 'preview') c.v.focus(); } } });
  def('copy-html', 'Copy as HTML', 'code-xml', { ...inTable, run: async () => { const c = at(); if (!c) return; await writeText(tableHtml(c.m)); toast('Table copied as HTML'); } });
  def('copy-tsv', 'Copy as TSV', 'copy', { ...inTable, run: async () => { const c = at(); if (!c) return; await writeText(toTSV(c.m)); toast('Table copied as TSV'); } });
  def('copy-md', 'Copy as Markdown', 'copy', { ...inTable, run: async () => { const c = at(); if (!c) return; await writeText(c.doc.slice(c.m.range.from, c.m.range.to)); toast('Table copied as Markdown'); } });

  const items = (pos) => {
    const w = (f) => { ctxPos = pos ?? null; mp = null; try { return f(); } finally { ctxPos = null; mp = null; } };
    return MENU.map((k) => {
      if (k === '-') return '-';
      const id = `table.${k}`, d = commands.get(id);
      return { label: d.title, icon: d.icon, disabled: w(() => !commands.canRun(id)), checked: CHECK[k] || k === 'header' ? w(() => commands.isChecked(id)) : undefined, onSelect: () => w(() => commands.execute(id)) };
    });
  };

  const bound = new WeakSet();
  const bind = () => {
    const v = view();
    if (!v || bound.has(v.contentDOM)) return;
    bound.add(v.contentDOM);
    v.contentDOM.addEventListener('contextmenu', (e) => {
      const pos = v.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos == null || !findTableAt(v.state.doc.toString(), pos)) return;
      const s = v.state.selection.main;
      if (pos < s.from || pos > s.to) v.dispatch({ selection: { anchor: pos } });
      openContextMenu(e, items());
    });
  };

  setPreviewMenu((e) => {
    const v = view(), t = e.target.closest('table'), line = t && +t.dataset.srcLine;
    if (!v || !line || line > v.state.doc.lines) return null;
    const doc = v.state.doc.toString(), m = findTableAt(doc, v.state.doc.line(line).from), cell = e.target.closest('td,th');
    if (!m) return null;
    const row = cell ? (cell.tagName === 'TH' ? -1 : cell.parentElement.rowIndex - 1) : -1;
    return items(cellRange(doc.slice(m.range.from, m.range.to), m.range.from, Math.min(row, m.rows.length - 1), cell ? cell.cellIndex : 0)[0]);
  });

  addKeyHook((e, v) => {
    if (e.isComposing || e.altKey || e.metaKey || (e.key !== 'Tab' && e.key !== 'Enter') || (e.key === 'Tab' && e.ctrlKey)) return false;
    const c = read(v, v.state.selection.main.head);
    if (!c) return false;
    const { m, row, col } = c, sel = v.state.selection.main;
    if (e.key === 'Enter' && e.ctrlKey) {
      const after = c.doc.slice(m.range.to), tail = after.startsWith('\n\n') ? '' : after ? '\n' : '\n\n';
      v.dispatch({ changes: tail ? { from: m.range.to, insert: tail } : undefined, selection: { anchor: m.range.to + (after ? 1 : 2) }, scrollIntoView: true, userEvent: 'input.format' });
      return true;
    }
    if (e.ctrlKey) return false;
    if (e.key === 'Enter' && e.shiftKey) { v.dispatch({ changes: { from: sel.from, to: sel.to, insert: '<br>' }, selection: { anchor: sel.from + 4 }, userEvent: 'input.type', scrollIntoView: true }); return true; }
    const s = e.key === 'Tab' ? step(m, row, col, e.shiftKey ? -1 : 1) : e.shiftKey ? null : { row: row + 1, col, add: row + 1 >= m.rows.length };
    if (!s) return true;
    if (s.add) put(c, { m: addRow(m), row: s.row, col: s.col }); else go(c, s.row, s.col);
    return true;
  });

  let shown = false, sig = '';
  const sync = () => {
    bind();
    const c = ready() ? at() : null, b = !!c, next = c ? `${c.row}:${c.col}:${c.m.rows.length}:${c.m.header.length}:${c.m.align.join()}:${isHeaderless(c.m)}` : '';
    if (b !== shown) {
      shown = b;
      try { if (b) contextual.show('table', { label: 'Table', groups: TAB }); else contextual.hide('table'); } catch (e) { console.error('[table]', e.message); }
    }
    if (next !== sig) { sig = next; [...ACTS.map((a) => a[0]), 'sort', ...OTHER.map((o) => o[0])].forEach((k) => commands.invalidate(`table.${k}`)); }
  };
  onEditorActivity(sync);
  store.subscribe((s) => s.ui.mode, sync);
}
