// Table transfer: spreadsheet/HTML paste -> table, Text to Table popover, Table Templates menu.
import { findTableAt, serializeTable, cellAt, cellRange, modelError, toModel, parseDelimited, detect, htmlRows, place, DELIMS, TEMPLATES } from '../../core/table/index.js';
import * as clip from '../../services/clipboard-client.js';
import { getSetting } from '../../services/settings-client.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';
import { openPopover, closePopover } from '../../ui/kit/popover.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const NO_SEL = 'Select the tabular text first';

export function register(ctx) {
  const { commands, store, services: { documents }, ui: { h, toast, openMenu } } = ctx;
  const src = document.getElementById('src');
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  const hasSel = () => ready() && !view().state.selection.main.empty;
  const anchorFor = (v, pos = v.state.selection.main.head) => {
    const a = document.activeElement, c = v.coordsAtPos(pos);
    return a && a.closest('.ribbon, .tabrow') ? a : { x: c ? c.left : 80, y: c ? c.bottom : 80, restore: v.contentDOM };
  };
  const raw = (v, text) => { v.dispatch({ ...v.state.replaceSelection(text.replace(/\r\n?/g, '\n')), userEvent: 'input.paste', scrollIntoView: true }); v.focus(); };

  // Where pasted data may become a table: caret in a table, or on an empty line outside code fences. force: anywhere.
  function target(v, force) {
    const s = v.state.selection.main, doc = v.state.doc.toString();
    if (force) return { doc, from: s.from, to: s.to, tbl: s.empty ? findTableAt(doc, s.head) : null };
    if (!s.empty) return null;
    const tbl = findTableAt(doc, s.head);
    if (tbl) return { doc, from: s.head, to: s.head, tbl };
    return v.state.doc.lineAt(s.head).text.trim() || (doc.slice(0, s.head).match(/^\s*(```|~~~)/gm) || []).length % 2 ? null : { doc, from: s.head, to: s.head };
  }

  function source(text, html) {
    let rows = html && htmlRows(html);
    if (!rows) {
      const d = detect(text, ['\t', ',', ';']);
      rows = d && parseDelimited(text, d);
      if (!rows || (rows.length < 2 && d !== '\t')) return null;
    }
    return rows.length && rows[0].length && rows[0].every((_, i) => rows.some((r) => (r[i] || '').trim())) ? rows : null;
  }

  // Validates and returns { err, info, run(v) }. In a table the rows are added below the caret row.
  function prep(t, rows, header) {
    if (!rows.length) return { err: 'Nothing to convert', info: '', run() {} };
    const m = toModel(rows, header && !t.tbl), n = m.header.length;
    let nm = m, at = 0;
    if (t.tbl) {
      at = cellAt(t.doc, t.tbl, t.from).row + 1;
      const add = m.rows.map((r) => Array.from({ length: t.tbl.header.length }, (_, i) => r[i] ?? ''));
      nm = { ...t.tbl, rows: [...t.tbl.rows.slice(0, at), ...add, ...t.tbl.rows.slice(at)] };
    }
    return {
      err: modelError(nm),
      info: t.tbl ? `Add ${rows.length} row${rows.length === 1 ? '' : 's'} to this table` : `${rows.length} rows × ${n} columns`,
      run: (v) => {
        const md = serializeTable(nm);
        if (t.tbl) {
          const { from, to } = t.tbl.range;
          v.dispatch({ changes: { from, to, insert: md }, selection: { anchor: cellRange(md, from, at, 0)[0] }, userEvent: 'input.paste', scrollIntoView: true });
        } else {
          const p = place(t.doc, t.from, t.to, md);
          v.dispatch({ changes: p.changes, selection: { anchor: p.caret }, userEvent: 'input.paste', scrollIntoView: true });
        }
        v.focus();
      },
    };
  }

  function offer(v, t, rows, text) {
    let done = false;
    const hdr = h('input', { type: 'checkbox' }), p0 = prep(t, rows, true);
    hdr.checked = true;
    const finish = (convert) => { done = true; closePopover(); if (convert) prep(t, rows, hdr.checked).run(v); else raw(v, text); };
    const go = h('button', { type: 'button', class: 't2-go', onclick: () => finish(true) }, 'Paste as table');
    const el = h('div', { class: 't2-pop', role: 'dialog', 'aria-label': 'Paste as table' },
      h('div', { class: 't2-title' }, 'Paste as table?'), h('div', { class: 't2-info' }, p0.info),
      t.tbl ? null : h('label', { class: 't2-row' }, hdr, 'First row is the header'),
      h('div', { class: 't2-btns' }, h('button', { type: 'button', onclick: () => finish(false) }, 'Keep as text'), go));
    if (openPopover(anchorFor(v, t.from), el, { onClose: () => { if (!done) raw(v, text); } })) go.focus();
  }

  // Ctrl+V and Paste as Table; returns true when the paste was taken over.
  function handle(v, text, html, force) {
    const mode = force ? 'auto' : getSetting('editor.pasteTable');
    if (mode === 'off') return false;
    const t = target(v, force), rows = t && source(text, html);
    if (!rows) return false;
    const p = prep(t, rows, true);
    if (p.err) { toast(p.err); return false; }
    if (mode === 'auto') p.run(v); else offer(v, t, rows, text);
    return true;
  }

  if (src) src.addEventListener('paste', (e) => {
    const v = view(), cd = e.clipboardData;
    if (!v || !cd || e.defaultPrevented || !handle(v, cd.getData('text/plain'), cd.getData('text/html'), false)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  commands.register({ id: 'edit.paste-table', title: 'Paste as Table', icon: 'table', group: 'Clipboard', enabled: ready, reason: NO_EDITOR, run: async () => {
    const v = view();
    if (!v) return;
    const [text, html] = await Promise.all([clip.readText(), clip.readHtml()]);
    if (!handle(v, text, html, true)) toast('The clipboard has no table data');
  } });

  function fromText() {
    const v = view(), s = v.state.selection.main, all = v.state.sliceDoc(s.from, s.to), text = all.trim();
    if (!text) return toast(NO_SEL);
    const from = s.from + all.length - all.trimStart().length, t = { doc: v.state.doc.toString(), from, to: from + text.length };
    const auto = Math.max(0, DELIMS.findIndex((d) => d[0] === detect(text)));
    const sel = h('select', { 'aria-label': 'Delimiter' }, ...DELIMS.map((d, i) => h('option', { value: i }, d[1] + (i === auto ? ' (detected)' : ''))));
    const hdr = h('input', { type: 'checkbox' }), info = h('div', { class: 't2-info', 'aria-live': 'polite' }), go = h('button', { type: 'button', class: 't2-go' }, 'Convert');
    sel.value = auto;
    hdr.checked = true;
    const cur = () => prep(t, parseDelimited(text, DELIMS[sel.value][0]), hdr.checked);
    const upd = () => { const p = cur(); info.textContent = p.err || p.info; info.classList.toggle('is-err', !!p.err); go.disabled = !!p.err; };
    sel.onchange = hdr.onchange = upd;
    go.onclick = () => {
      closePopover();
      if (v.state.sliceDoc(t.from, t.to) !== text) toast('The selection changed'); else cur().run(v);
    };
    const el = h('div', { class: 't2-pop', role: 'dialog', 'aria-label': 'Text to table' },
      h('div', { class: 't2-title' }, 'Convert text to table'), h('label', { class: 't2-row' }, 'Separated by', sel),
      h('label', { class: 't2-row' }, hdr, 'First row is the header'), info,
      h('div', { class: 't2-btns' }, h('button', { type: 'button', onclick: () => closePopover(true) }, 'Cancel'), go));
    upd();
    if (openPopover(anchorFor(v), el)) sel.focus();
  }
  commands.register({ id: 'ins.table-from-text', title: 'Text to Table', icon: 'text-select', group: 'Tables', enabled: hasSel, reason: NO_SEL, run: fromText });

  function insertTemplate(v, m) {
    const doc = v.state.doc.toString(), s = v.state.selection.main, tb = findTableAt(doc, s.head), at = tb ? tb.range.to : s.to;
    const md = serializeTable(m), p = place(doc, at, at, md), [a, b] = cellRange(md, p.caret - md.length, -1, 0);
    v.dispatch({ changes: p.changes, selection: { anchor: a, head: b }, userEvent: 'input.format', scrollIntoView: true });
    v.focus();
  }
  commands.register({ id: 'ins.table-templates', title: 'Table Templates', icon: 'layout-template', group: 'Tables', enabled: ready, reason: NO_EDITOR, run: () => {
    const v = view();
    if (v) openMenu(anchorFor(v), TEMPLATES.map(([, label, m]) => ({ label, icon: 'table', onSelect: () => insertTemplate(v, m) })));
  } });

  let prev = '';
  const sync = () => { const s = String(hasSel()); if (s !== prev) { prev = s; commands.invalidate('ins.table-from-text'); } };
  onEditorActivity(sync);
  store.subscribe((s) => s.ui.mode, sync);
}
