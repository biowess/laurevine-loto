import { initConflict, reduce, describe } from '../../core/documents/conflict.js';
import { baseName } from '../../core/documents/paths.js';
import * as api from '../../services/doc-client.js';
import * as dw from '../../services/docwatch-client.js';
import * as hist from '../../services/history-client.js';
import { getSetting } from '../../services/settings-client.js';
import { confirmDialog } from './dialogs.js';

const BTN = { reload: 'Reload from Disk', compare: 'Compare', keepMine: 'Keep My Version', saveAs: 'Save As…', overwrite: 'Overwrite…', merge: 'Merge by Hunks', dismiss: 'Dismiss', restoreFromHistory: 'Restore from History', finish: 'Finish Merge' };
const OPEN = ['external', 'conflict'];

export function mountConflict(ctx, write) {
  const { store, ui, commands } = ctx, { h } = ui, D = ctx.services.documents, S = new Map();
  const host = document.querySelector('.md-editor');
  const banner = h('div', { class: 'lv-conflict', role: 'status', hidden: true });
  if (host) host.prepend(banner);

  const get = (id) => {
    let st = S.get(id);
    if (!st) { const d = D.getEntry(id).doc; S.set(id, st = { c: initConflict(d.path, d.diskHash), t0: Date.now() }); }
    return st;
  };
  const fail = (err) => ui.toast((err && err.message) || 'The operation failed.', { timeout: 5000 });
  const when = (t) => (t ? new Date(t).toLocaleString() : 'unknown');

  function render() {
    const id = store.get().documents.activeId, st = id && S.get(id), e = id && D.getEntry(id);
    if (!st || !e || st.hidden || st.c.phase === 'ok') { banner.hidden = true; return; }
    const m = describe(st.c), acts = st.merge ? ['finish', 'compare', 'saveAs'] : m.actions.filter((a) => a !== 'retry');
    const more = [...S].filter(([k, v]) => k !== id && v.c.phase !== 'ok' && D.getEntry(k)).length;
    banner.replaceChildren(
      h('span', { class: 'lv-conflict__msg' }, `${e.doc.name}: ${st.merge ? 'Merging. Apply hunks, then Finish Merge.' : m.label}${m.retrying ? ` (retry ${m.attempt})` : ''}`),
      ...acts.map((a) => h('button', { type: 'button', class: 'lv-conflict__btn', onclick: () => RUN[a](id) }, BTN[a])),
      more ? h('small', { class: 'lv-conflict__more' }, `+${more} more`) : null);
    banner.hidden = false;
  }

  async function reload(id, auto) {
    const e = D.getEntry(id);
    if (!e) return;
    D.editorRun('flush');
    try {
      await hist.snapshot({ path: e.doc.path }, e.doc.text, 'Before reload');
      const { doc } = await api.readPath(e.doc.path);
      D.reloadDocument(id, { ...doc, name: baseName(doc.path), diskHash: doc.hash });
      const st = get(id);
      st.c = reduce(st.c, { type: 'synced', hash: doc.hash }).state; st.merge = null; st.hidden = false;
      render();
      ui.toast(auto ? `${baseName(doc.path)} reloaded from disk.` : 'Reloaded. Your previous version is in Change History.');
    } catch (err) { fail(err); }
  }

  async function overwrite(id) {
    const e = D.getEntry(id);
    if (!e) return;
    const d = e.doc, st = get(id);
    let mtime;
    try { mtime = (await api.stat(d.path)).mtimeMs; } catch { /* unknown */ }
    const ok = await confirmDialog(ctx, {
      title: 'Overwrite File on Disk?', label: 'Overwrite',
      text: h('div', {}, h('p', {}, `${d.name} was changed outside Laurevine Loto.`), h('p', {}, `Your version: last edited ${when(st.at || st.t0)}`), h('p', {}, `On disk: modified ${when(mtime)}`), h('p', {}, 'The disk version is saved to Change History before it is replaced.')),
    });
    if (!ok) return;
    try {
      const { doc } = await api.readPath(d.path);
      await hist.snapshot({ path: d.path }, doc.text, 'Before replace');
    } catch (err) { return fail(err); }
    await write('save', { id, e }, true);
  }

  async function view(id, merge) {
    const e = D.getEntry(id);
    if (!e) return;
    D.editorRun('flush');
    try {
      const { doc } = await api.readPath(e.doc.path);
      ctx.services.compareSides(`${merge ? 'Merge' : 'Compare'}: ${e.doc.name}`, { id, label: 'My Version', text: e.doc.text }, { label: 'On Disk', text: doc.text });
      if (merge) { get(id).merge = { hash: doc.hash }; render(); }
    } catch (err) { fail(err); }
  }

  const hide = (id) => { get(id).hidden = true; render(); };
  const RUN = {
    reload: (id) => reload(id, false),
    compare: (id) => view(id, false),
    merge: (id) => view(id, true),
    keepMine: hide,
    dismiss: hide,
    overwrite,
    saveAs: (id) => { const e = D.getEntry(id); if (e) write('as', { id, e }); },
    restoreFromHistory: () => commands.execute('hist.changes'),
    finish: (id) => {
      const st = get(id), hash = st.merge.hash;
      D.updateDoc(id, { diskHash: hash, conflict: false });
      st.c = reduce(st.c, { type: 'synced', hash }).state; st.merge = null;
      render();
    },
  };

  function handle(ev) {
    const e = D.getEntry(ev.id);
    if (!e) return;
    const d = e.doc, st = get(ev.id);
    if (d.saving && ev.type === 'modified') { st.pend = ev; return; }
    const r = reduce(st.c, ev, { dirty: d.dirty, autoReload: getSetting('files.onExternalChange') === 'reload', savedHash: d.diskHash });
    st.c = r.state; st.hidden = false; st.merge = null;
    for (const f of r.effects) {
      if (f.do === 'clear') { if (d.conflict || d.deleted) D.updateDoc(ev.id, { conflict: false, deleted: false }); }
      else if (f.do === 'reload') reload(ev.id, true);
      else if (f.do === 'banner' || f.do === 'conflict') D.updateDoc(ev.id, { conflict: true });
      else if (f.do === 'follow') D.updateDoc(ev.id, { path: f.path, name: baseName(f.path) });
      else if (f.do === 'markDeleted') D.updateDoc(ev.id, { deleted: true });
    }
    render();
  }

  function sync() {
    const ids = new Set();
    for (const t of store.get().documents.tabs) {
      const e = D.getEntry(t.id);
      if (!e) continue;
      const d = e.doc;
      ids.add(t.id);
      let st = S.get(t.id);
      if (!d.path) { if (st) { S.delete(t.id); dw.unwatch(t.id); } continue; }
      if (!st || st.c.path !== d.path) {
        if (!d.diskHash) continue;
        S.set(t.id, st = { c: initConflict(d.path, d.diskHash), t0: Date.now() });
        dw.watch(t.id, d.path, d.diskHash);
      }
      if (!d.saving && st.pend) { const p = st.pend; st.pend = null; handle(p); }
      else if (!d.conflict && OPEN.includes(st.c.phase)) st.c = { ...st.c, phase: 'ok', prev: 'ok', diskHash: d.diskHash };
      else if (st.c.phase === 'external' && d.dirty) st.c = reduce(st.c, { type: 'edited', dirty: true }).state;
    }
    for (const id of [...S.keys()]) if (!ids.has(id)) { S.delete(id); dw.unwatch(id); }
    render();
  }

  ctx.services.conflict = {
    async raise(id, manual) {
      const e = D.getEntry(id);
      if (!e) return;
      const d = e.doc, st = get(id);
      try {
        const { doc } = await api.readPath(d.path);
        st.c = reduce(st.c, { type: 'modified', hash: doc.hash }, { dirty: true, savedHash: d.diskHash }).state;
      } catch { /* keep state */ }
      if (st.c.phase === 'ok') st.c = { ...st.c, phase: 'conflict' };
      st.hidden = false;
      D.updateDoc(id, { conflict: true });
      render();
      if (manual && d.dirty) overwrite(id);
    },
  };

  dw.onChanged(handle);
  D.onDocChange((id) => { const e = D.getEntry(id), st = S.get(id); if (e && st && e.doc.dirty) st.at = Date.now(); sync(); });
  store.subscribe((s) => s.documents.tabs, sync);
  store.subscribe((s) => s.documents.activeId, render);
  sync();
}
