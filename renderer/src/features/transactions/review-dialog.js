// Review Changes: files and matches with checkboxes, inline diff, conflict warnings; Apply writes open tabs as one undoable editor
// transaction and closed files through the transaction engine. files: [{ path, text (LF), edits: [{ from, to, insert }], mtimeMs?, size? }].
// Resolves { applied: [{ path, via }], skipped: [{ path, reason }], txId } or null when cancelled.
import { icon } from '../../ui/kit/icons.js';
import { applyEdits, cleanEdits, lineAt } from '../../core/diff/edits.js';
import { diffLines, hunks } from '../../core/diff/line-diff.js';
import { baseName } from '../../core/documents/paths.js';
import { stat } from '../../services/doc-client.js';
import { txApply, txPreview } from '../../services/tx-client.js';

const MAX_EDITS = 200, MAX_ROWS = 400, MAX_CHARS = 400000;
const short = (s) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > 40 ? t.slice(0, 40) + '…' : t; };

export function openReview(ctx, { title = 'Review Changes', files = [] } = {}) {
  const { ui: { h, toast, openDialog }, services: { documents } } = ctx;
  const S = files.map((f) => ({ f, edits: cleanEdits(f.edits, f.text.length), conflict: '', base: null, open: false })).filter((s) => s.edits.length);
  if (!S.length) return Promise.resolve(null);
  S.forEach((s) => { s.on = new Set(s.edits.map((_, i) => i)); });
  let ready = false, busy = false, result = null, apply = null;
  const picked = (s) => s.edits.filter((_, i) => s.on.has(i));
  const tabId = (s) => documents.findByPath(s.f.path);
  const sum = h('div', { class: 'rv-sum', 'aria-live': 'polite' });

  function summary() {
    const m = S.reduce((a, s) => a + s.on.size, 0), t = S.reduce((a, s) => a + s.edits.length, 0);
    sum.textContent = ready ? `${m} of ${t} changes selected in ${S.filter((s) => s.on.size).length} of ${S.length} files` : 'Checking files…';
    if (apply) apply.disabled = !ready || busy || !m;
  }

  async function check(s) {
    const id = tabId(s);
    if (id) return documents.getEntry(id).doc.text === s.f.text ? '' : 'The open document changed since the preview.';
    const r = await stat(s.f.path).catch(() => null);
    if (!r || !r.ok || !r.exists) return 'The file is missing.';
    s.base ||= { mtimeMs: s.f.mtimeMs ?? r.mtimeMs, size: s.f.size ?? r.size };
    return r.mtimeMs === s.base.mtimeMs && r.size === s.base.size ? '' : 'The file changed on disk since the preview.';
  }

  function diffNode(s) {
    const box = h('div', { class: 'rv-diff', role: 'group', 'aria-label': 'Diff preview' }), note = (t) => box.append(h('div', { class: 'rv-note' }, t));
    if (!s.on.size) { note('No changes selected.'); return box; }
    if (s.f.text.length > MAX_CHARS) { note('Preview too large.'); return box; }
    let n = 0;
    for (const g of hunks(diffLines(s.f.text, applyEdits(s.f.text, picked(s))))) {
      const hk = h('div', { class: 'rv-hunk' });
      for (const r of g) {
        if (n++ >= MAX_ROWS) { box.append(hk); note('More changes are not shown.'); return box; }
        const tx = h('span', { class: 'rv-tx' });
        if (r.words) r.words.forEach((w) => tx.append(w.t === 'eq' ? w.s : h('mark', {}, w.s)));
        else tx.append(r.text);
        hk.append(h('div', { class: 'rv-row rv-' + r.t }, h('span', { class: 'rv-ln' }, String(r.a ?? r.b)), h('span', { class: 'rv-sg' }, r.t === 'add' ? '+' : r.t === 'del' ? '−' : ' '), tx));
      }
      box.append(hk);
    }
    return box;
  }

  function section(s) {
    const cb = h('input', { type: 'checkbox', 'aria-label': 'Include ' + baseName(s.f.path) });
    const name = h('button', { type: 'button', class: 'rv-name', 'aria-expanded': 'false', title: s.f.path }, baseName(s.f.path));
    const tag = h('span', { class: 'rv-tag' }), count = h('span', { class: 'rv-count' }), warn = h('span', { class: 'rv-warn', role: 'alert' });
    const list = h('div', { class: 'rv-list' }), diff = h('div'), body = h('div', { class: 'rv-body' }, list, diff);
    body.hidden = true;
    const boxes = s.edits.slice(0, MAX_EDITS).map((e, i) => {
      const c = h('input', { type: 'checkbox', checked: true });
      c.addEventListener('change', () => { if (c.checked) s.on.add(i); else s.on.delete(i); s.refresh(); });
      list.append(h('label', { class: 'rv-match' }, c, h('span', { class: 'rv-lnno' }, 'Ln ' + lineAt(s.f.text, e.from)), h('del', {}, short(s.f.text.slice(e.from, e.to)) || '∅'), '→', h('ins', {}, short(e.insert) || '∅')));
      return c;
    });
    if (s.edits.length > MAX_EDITS) list.append(h('div', { class: 'rv-note' }, `${s.edits.length - MAX_EDITS} more changes follow the file checkbox.`));
    s.refresh = () => {
      cb.checked = s.on.size === s.edits.length;
      cb.indeterminate = s.on.size > 0 && s.on.size < s.edits.length;
      cb.disabled = !!s.conflict;
      count.textContent = `${s.on.size}/${s.edits.length}`;
      warn.replaceChildren(...(s.conflict ? [icon('triangle-alert', 'ic--chev'), ` ${s.conflict}`] : []));
      tag.textContent = tabId(s) ? 'Open in tab' : '';
      boxes.forEach((c, i) => { c.checked = s.on.has(i); c.disabled = !!s.conflict; });
      if (s.open) diff.replaceChildren(diffNode(s));
      summary();
    };
    cb.addEventListener('change', () => { s.on = new Set(cb.checked ? s.edits.map((_, i) => i) : []); s.refresh(); });
    name.addEventListener('click', () => {
      s.open = !s.open;
      body.hidden = !s.open;
      name.setAttribute('aria-expanded', String(s.open));
      if (s.open) diff.replaceChildren(diffNode(s));
    });
    s.refresh();
    return h('div', { class: 'rv-file' }, h('div', { class: 'rv-head' }, cb, name, tag, count), warn, body);
  }

  function tabApply(s) {
    const id = tabId(s), e = id && documents.getEntry(id), base = s.f.text, changes = picked(s);
    if (!e || e.doc.text !== base) return false;
    documents.activate(id);
    const v = documents.editorRun('view');
    if (v && ctx.store.get().documents.activeId === id && v.state.doc.toString() === base) { v.dispatch({ changes, userEvent: 'input.replace' }); return true; }
    if (e.state && e.state.doc.toString() === base) {
      e.state = e.state.update({ changes, userEvent: 'input.replace' }).state;
      documents.syncText(id, e.state.doc.toString());
      return true;
    }
    return false;
  }

  async function run(dlg) {
    busy = true;
    summary();
    try {
      for (const s of S) if (s.on.size) { const c = await check(s); if (c) { s.conflict = c; s.on = new Set(); s.refresh(); } }
      const live = S.filter((s) => s.on.size), tabs = live.filter((s) => tabId(s)), disk = live.filter((s) => !tabId(s));
      const applied = [], skipped = S.filter((s) => s.conflict).map((s) => ({ path: s.f.path, reason: 'changed' }));
      let txId = null;
      if (disk.length) {
        const p = await txPreview(disk.map((s) => ({ op: 'write', path: s.f.path, text: applyEdits(s.f.text, picked(s)) })), title);
        const a = p.ok && await txApply(p.id);
        if (!a || !a.ok) { toast((a || p).error?.message || 'The changes could not be applied.'); return; }
        txId = p.id;
        for (const r of a.results) { if (r.status === 'applied') applied.push({ path: r.path, via: 'disk' }); else skipped.push({ path: r.path, reason: r.reason || r.error }); }
      }
      for (const s of tabs) { if (tabApply(s)) applied.push({ path: s.f.path, via: 'tab' }); else skipped.push({ path: s.f.path, reason: 'changed' }); }
      result = { applied, skipped, txId };
      toast(`Applied to ${applied.length} file${applied.length === 1 ? '' : 's'}${skipped.length ? `; ${skipped.length} skipped (changed since the preview)` : ''}.`, { timeout: 4000 });
      dlg.close('Apply');
    } catch (err) {
      toast('The changes could not be applied.');
    } finally {
      busy = false;
      summary();
    }
  }

  return new Promise((resolve) => {
    const dlg = openDialog({
      title, icon: 'git-compare', width: 720, cls: 'rv-dlg', focus: '.rv-file input',
      body: [sum, h('div', { class: 'rv-files' }, ...S.map(section))],
      buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: () => { if (!busy) run(dlg); return false; } }],
      onClose: () => resolve(result),
    });
    apply = dlg.el.querySelector('.btn--primary');
    summary();
    Promise.all(S.map(async (s) => { s.conflict = await check(s).catch(() => 'The file could not be checked.'); if (s.conflict) s.on = new Set(); }))
      .then(() => { ready = true; S.forEach((s) => s.refresh()); });
  });
}
