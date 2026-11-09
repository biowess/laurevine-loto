import { documentActions } from '../../state/slices/documents.js';
import { groupActions } from '../../state/slices/editor-groups.js';
import { MODES } from '../../state/slices/ui.js';
import { WELCOME } from '../../core/documents/welcome.js';
import { capture, clean, toGroups } from '../../core/session/model.js';
import { readPath } from '../../services/doc-client.js';
import * as api from '../../services/session-client.js';
import { getSetting } from '../../services/settings-client.js';

export function register(ctx) {
  const { store, ui } = ctx, D = ctx.services.documents, pos = new Map(), scrollTo = new Map();
  let armed = false, last = '', timer = 0;

  const posOf = (t) => {
    const e = D.getEntry(t.id);
    if (!e) return {};
    const v = store.get().documents.activeId === t.id ? D.editorRun('view') : null, s = v ? v.state : e.state, sel = s ? s.selection.main : null;
    const p = { ...pos.get(t.id), ...(sel ? { anchor: sel.anchor, head: sel.head } : e.caret != null ? { anchor: e.caret, head: e.head ?? e.caret } : {}), ...(v ? { scroll: Math.round(v.scrollDOM.scrollTop) } : {}), mode: e.mode || undefined };
    pos.set(t.id, p);
    return p;
  };
  const save = () => {
    if (!armed) return;
    const s = store.get(), snap = capture(s, new Map(s.documents.tabs.map((t) => [t.id, posOf(t)])), s.workspace.root), j = JSON.stringify(snap);
    if (j !== last) { last = j; api.set(snap).catch(() => {}); }
  };
  const soon = () => { clearTimeout(timer); timer = setTimeout(save, 600); };
  const applyScroll = (id) => {
    const px = scrollTo.get(id);
    if (px == null) return;
    scrollTo.delete(id);
    requestAnimationFrame(() => requestAnimationFrame(() => { const v = D.editorRun('view'); if (v) v.scrollDOM.scrollTop = px; }));
  };

  async function restore() {
    const s = await api.get().then((r) => clean(r.session), () => null);
    if (!s || !s.docs.length || getSetting('session.restore') !== 'last') return;
    const ids = [], missing = [];

    async function restoreDoc(d, i) {
      const disk = await readPath(d.path).then((r) => r.doc, () => null);
      if (!disk) { missing.push(d.path.split(/[\\/]/).pop()); return null; }
      const doc = D.openDocument({ name: disk.path.split(/[\\/]/).pop(), path: disk.path, text: disk.text, caret: d.anchor ?? null, encoding: disk.encoding, bom: disk.bom, eol: disk.eol, dominantEol: disk.dominantEol, diskHash: disk.hash });
      const e = D.getEntry(doc.id);
      if (d.head != null) e.head = d.head;
      if (MODES.includes(d.mode)) e.mode = d.mode;
      if (d.scroll) scrollTo.set(doc.id, d.scroll);
      ids[i] = doc.id;
      if (d.pinned) store.dispatch(documentActions.pin(doc.id, true));
      return doc.id;
    }

    // Progressive restore: restore active document first immediately so UI is responsive
    const actIdx = s.active >= 0 && s.active < s.docs.length ? s.active : 0;
    const actId = await restoreDoc(s.docs[actIdx], actIdx);
    if (actId) {
      const w = store.get().documents.tabs.find((t) => !t.path && !t.dirty && D.getEntry(t.id) && D.getEntry(t.id).doc.text === WELCOME);
      if (w) D.closeDocument(w.id);
      D.activate(actId);
      applyScroll(actId);
      if (s.root && !getSetting('explorer.lastWorkspace')) Promise.resolve(ui.runCommand('workspace.open', s.root)).catch(() => {});
    }

    // Restore background documents progressively in idle slices
    const others = s.docs.map((d, i) => [i, d]).filter(([i]) => i !== actIdx);
    for (const [i, d] of others) {
      await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 250 }) : setTimeout(r, 16)));
      await restoreDoc(d, i);
      store.dispatch(groupActions.replace(toGroups(s.groups, ids, store.get().documents.tabs.map((t) => t.id))));
    }

    if (missing.length) ui.toast(`Skipped ${missing.length} missing file${missing.length > 1 ? 's' : ''}: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`, { timeout: 6000 });
  }

  store.subscribe((st) => st.documents.activeId, applyScroll);
  store.subscribe((st) => st.documents, soon);
  store.subscribe((st) => st.editorGroups, soon);
  store.subscribe((st) => st.workspace.root, soon);
  setInterval(save, 3000);
  window.addEventListener('blur', save);
  window.addEventListener('pagehide', save);
  api.hold(restore().catch(() => {}).finally(() => { armed = true; save(); }));
}
