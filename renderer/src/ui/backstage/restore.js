import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { groupActions } from '../../state/slices/editor-groups.js';
import { documentActions } from '../../state/slices/documents.js';
import { releaseAll, editorRun } from '../../services/documents.js';
import { capture, plan } from '../../core/backstage/snapshot.js';
import { $ } from '../kit/dom.js';
import { whenRestored } from '../../services/session-client.js';

let snap = null, opener = null, ready = false;

function readView() {
  const v = editorRun('view');
  if (!v) return null;
  const r = v.state.selection.main;
  return { doc: store.get().documents.activeId, anchor: r.anchor, head: r.head, src: v.scrollDOM.scrollTop, prev: ($('#prev') || {}).scrollTop || 0 };
}

function enter() {
  opener = document.activeElement;
  releaseAll();
  snap = capture(store.get(), readView());
}

function leave() {
  if (!snap) return;
  const p = plan(snap, store.get()), d = (a) => store.dispatch(a);
  snap = null;
  d(uiActions.layout(p.layout)); d(uiActions.mode(p.mode)); d(uiActions.splitRatio(p.splitRatio));
  if (p.groups) { d(groupActions.replace(p.groups)); d(documentActions.activate(p.active)); }
  requestAnimationFrame(() => {
    const v = editorRun('view'), back = opener;
    opener = null;
    const refocus = () => { if (back && back.isConnected && back.focus && back !== document.body && !back.closest('#backstage')) back.focus(); else if (v) v.focus(); };
    if (!v) return refocus();
    const w = p.view;
    if (w && w.doc === store.get().documents.activeId) {
      const n = v.state.doc.length;
      v.dispatch({ selection: { anchor: Math.min(w.anchor, n), head: Math.min(w.head, n) } });
      v.scrollDOM.scrollTop = w.src;
      const pv = $('#prev');
      if (pv) pv.scrollTop = w.prev;
    }
    refocus();
  });
}

export function bindRestore() {
  const close = () => store.dispatch(uiActions.backstage(false));
  whenRestored().then(() => { ready = true; });
  const offs = [
    store.subscribe((s) => s.ui.backstage.open, (o) => (o ? enter() : leave())),
    store.subscribe((s) => s.documents.activeId, (id) => { if (ready && snap && id !== snap.active) close(); }),
    store.subscribe((s) => s.workspace.root, () => { if (ready && snap) close(); }),
  ];
  return () => offs.forEach((f) => f());
}
