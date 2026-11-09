// Visual table editor dialog: editable grid over the table model, toolbar, drag reorder, live Markdown source.
import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { openDialog } from '../../ui/kit/dialog.js';
import { serializeTable, normalise, addRow, removeRow, moveRow, addCol, removeCol, moveCol, setAlign, step, MAX, tidy, modelError, cellError } from '../../core/table/index.js';

const nm = (j) => (j > 25 ? String.fromCharCode(64 + ((j / 26) | 0)) : '') + String.fromCharCode(65 + (j % 26));
const HINT = 'Click or F2 edits · Shift+Enter adds a line · Enter, Tab and arrows move · Esc cancels';
const TOOLS = [
  ['row-above', 'Add Row Above', 'between-horizontal-start'], ['row-below', 'Add Row Below', 'between-horizontal-end'],
  ['col-left', 'Add Column Left', 'between-vertical-start'], ['col-right', 'Add Column Right', 'between-vertical-end'], '-',
  ['del-row', 'Delete Row', 'trash-2'], ['del-col', 'Delete Column', 'trash-2'], '-',
  ['row-up', 'Move Row Up', 'arrow-up'], ['row-down', 'Move Row Down', 'arrow-down'],
  ['col-move-left', 'Move Column Left', 'arrow-left'], ['col-move-right', 'Move Column Right', 'arrow-right'], '-',
  ['align-left', 'Align Left', 'align-left'], ['align-center', 'Align Center', 'align-center'], ['align-right', 'Align Right', 'align-right'],
];

// onApply(markdown) runs on Apply; returning false keeps the dialog open.
export function openTableEditor({ model, row = -1, col = 0, onApply }) {
  let m = normalise(model), r = row, c = col, ed = null, dg = null;
  const get = (i, j) => (i < 0 ? m.header[j] : m.rows[i][j]);
  const put = (i, j, v) => { m = i < 0 ? { ...m, header: m.header.map((x, k) => (k === j ? v : x)) } : { ...m, rows: m.rows.map((x, k) => (k === i ? x.map((y, l) => (l === j ? v : y)) : x)) }; };
  const err = h('div', { class: 'tb-err te-err', role: 'alert' }), say = (s) => { err.textContent = s || ''; };
  const wrap = h('div', { class: 'te-wrap' }), src = h('pre', { class: 'te-src', 'aria-label': 'Markdown source preview' });
  const view = () => { src.textContent = serializeTable(normalise(m)); };
  const done = (keep) => { if (ed == null) return; if (!keep) put(r, c, ed); ed = null; say(''); };
  const room = (kind) => {
    const full = kind === 'row' ? m.rows.length + 1 >= MAX.rows : m.header.length >= MAX.cols;
    if (full) say(`A table can have at most ${kind === 'row' ? MAX.rows + ' rows' : MAX.cols + ' columns'}`);
    return !full;
  };
  const nav = (i, j) => { r = i; c = j; paint(); };
  const mvRow = (f, t) => { m = moveRow(m, f, t); r = Math.max(0, Math.min(t, m.rows.length - 1)); };
  const mvCol = (f, t) => { m = moveCol(m, f, t); c = Math.max(0, Math.min(t, m.header.length - 1)); };
  const OPS = {
    'row-above': () => { if (room('row')) { r = Math.max(r, 0); m = addRow(m, r); } },
    'row-below': () => { if (room('row')) { m = addRow(m, r + 1); r++; } },
    'col-left': () => { if (room('col')) m = addCol(m, c); },
    'col-right': () => { if (room('col')) { m = addCol(m, c + 1); c++; } },
    'del-row': () => { if (r < 0) return say('The header row cannot be deleted'); m = removeRow(m, r); r = Math.min(r, m.rows.length - 1); },
    'del-col': () => { if (m.header.length < 2) return say('A table needs at least one column'); m = removeCol(m, c); c = Math.min(c, m.header.length - 1); },
    'row-up': () => { if (r > 0) mvRow(r, r - 1); else say(r < 0 ? 'The header row cannot be moved' : 'Already the first row'); },
    'row-down': () => { if (r >= 0 && r < m.rows.length - 1) mvRow(r, r + 1); else say(r < 0 ? 'The header row cannot be moved' : 'Already the last row'); },
    'col-move-left': () => { if (c > 0) mvCol(c, c - 1); },
    'col-move-right': () => { if (c < m.header.length - 1) mvCol(c, c + 1); },
  };
  ['left', 'center', 'right'].forEach((a) => { OPS['align-' + a] = () => { m = setAlign(m, c, m.align[c] === a ? null : a); }; });

  const grab = (el, kind, i) => {
    el.draggable = true;
    el.addEventListener('dragstart', (e) => { dg = { kind, i }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `${kind} ${i}`); });
    el.addEventListener('dragend', () => { dg = null; wrap.querySelectorAll('.te-over').forEach((x) => x.classList.remove('te-over')); });
  };
  const drop = (el, kind, i) => {
    el.addEventListener('dragover', (e) => { if (dg && dg.kind === kind) { e.preventDefault(); el.classList.add('te-over'); } });
    el.addEventListener('dragleave', () => el.classList.remove('te-over'));
    el.addEventListener('drop', (e) => {
      if (!dg || dg.kind !== kind) return;
      e.preventDefault();
      const f = dg.i;
      dg = null; done(true);
      (kind === 'row' ? mvRow : mvCol)(f, i);
      paint();
    });
  };

  const aligns = [], tools = h('div', { class: 'te-tools', role: 'toolbar', 'aria-label': 'Table tools' });
  TOOLS.forEach((t) => {
    if (t === '-') return tools.append(h('span', { class: 'te-sep' }));
    const b = h('button', { type: 'button', class: 'te-btn', title: t[1], 'aria-label': t[1] }, icon(t[2]));
    b.addEventListener('click', () => { done(true); say(''); OPS[t[0]](); paint(false); });
    if (t[0].startsWith('align-')) aligns.push([t[0].slice(6), b]);
    tools.append(b);
  });

  const editor = (i, j) => {
    const ta = h('textarea', { class: 'te-in', spellcheck: 'false', 'aria-label': `Cell ${nm(j)}, ${i < 0 ? 'header' : 'row ' + (i + 1)}` });
    ta.value = get(i, j); ta.rows = ta.value.split('\n').length;
    ta.addEventListener('input', () => {
      put(i, j, ta.value); ta.rows = ta.value.split('\n').length;
      const e = cellError(ta.value);
      ta.setAttribute('aria-invalid', String(!!e)); say(e); view();
    });
    return ta;
  };

  function paint(focus = true) {
    const n = m.header.length, st = wrap.scrollTop, sl = wrap.scrollLeft, t = h('table', { class: 'te-grid', role: 'grid' }), hr = h('tr');
    hr.append(h('th', { class: 'te-corner' }));
    for (let j = 0; j < n; j++) {
      const th = h('th', { class: 'te-ch' + (j === c ? ' is-on' : ''), scope: 'col', title: `Column ${nm(j)} · drag to reorder` }, nm(j));
      th.addEventListener('click', () => { done(true); nav(r, j); });
      grab(th, 'col', j); drop(th, 'col', j); hr.append(th);
    }
    const body = h('tbody');
    for (let i = -1; i < m.rows.length; i++) {
      const tr = h('tr', { class: i < 0 ? 'te-hrow' : '' }), rh = h('th', { class: 'te-rh' + (i === r ? ' is-on' : ''), scope: 'row', title: i < 0 ? 'Header row' : `Row ${i + 1} · drag to reorder` }, i < 0 ? 'H' : String(i + 1));
      rh.addEventListener('click', () => { done(true); nav(i, c); });
      if (i >= 0) { grab(rh, 'row', i); drop(tr, 'row', i); }
      tr.append(rh);
      for (let j = 0; j < n; j++) {
        const on = i === r && j === c, td = h('td', { class: 'te-c' + (on ? ' is-sel' : '') + (m.align[j] ? ' al-' + m.align[j] : ''), role: 'gridcell', tabindex: on ? '0' : '-1' });
        if (on && ed != null) td.append(editor(i, j)); else td.textContent = get(i, j);
        td.addEventListener('click', () => { if (on && ed != null) return; done(true); r = i; c = j; ed = get(i, j); paint(); });
        drop(td, 'col', j); tr.append(td);
      }
      body.append(tr);
    }
    t.append(h('thead', {}, hr), body);
    wrap.replaceChildren(t);
    wrap.scrollTop = st; wrap.scrollLeft = sl;
    aligns.forEach(([a, b]) => b.setAttribute('aria-pressed', String(m.align[c] === a)));
    view();
    if (!focus) return;
    const f = wrap.querySelector('textarea') || wrap.querySelector('td[tabindex="0"]');
    if (f) { f.focus(); if (f.tagName === 'TEXTAREA') f.setSelectionRange(f.value.length, f.value.length); }
  }

  const key = (e) => {
    if (e.isComposing || !wrap.contains(e.target)) return;
    const k = e.key, stop = () => { e.preventDefault(); e.stopPropagation(); };
    const tab = () => {
      const s = step(m, r, c, e.shiftKey ? -1 : 1);
      if (!s) return;
      stop(); done(true);
      if (s.add) { if (!room('row')) return paint(); m = addRow(m); }
      nav(s.row, s.col);
    };
    if (ed != null) {
      if (k === 'Escape') { stop(); done(false); paint(); }
      else if (k === 'F2') { stop(); done(true); paint(); }
      else if (k === 'Enter' && !e.shiftKey) {
        stop(); done(true);
        const add = r + 1 >= m.rows.length;
        if (add && !room('row')) paint(); else { if (add) m = addRow(m); nav(r + 1, c); }
      } else if (k === 'Tab') tab();
      return;
    }
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) { stop(); nav(Math.max(-1, Math.min(m.rows.length - 1, r + mv[0])), Math.max(0, Math.min(m.header.length - 1, c + mv[1]))); }
    else if (k === 'Enter') { stop(); nav(Math.min(r + 1, m.rows.length - 1), c); }
    else if (k === 'Tab') tab();
    else if (k === 'F2') { stop(); ed = get(r, c); paint(); }
    else if (k === 'Delete' || k === 'Backspace') { stop(); put(r, c, ''); paint(); }
  };

  const apply = () => {
    done(true);
    const t = tidy(m), e = modelError(t);
    if (e) { say(e); return false; }
    return onApply(serializeTable(t));
  };
  paint(false);
  window.addEventListener('keydown', key, true);
  return openDialog({
    title: 'Table Editor', icon: 'table-properties', width: 760, cls: 'te-dlg', focus: '.te-c[tabindex="0"]',
    body: [tools, wrap, err, h('div', { class: 'te-hint' }, HINT), h('div', { class: 'te-lbl' }, 'Markdown source'), src],
    buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: apply }],
    onClose: () => window.removeEventListener('keydown', key, true),
  });
}
