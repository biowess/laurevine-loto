import { txList, txUndo } from '../../services/tx-client.js';
import { baseName } from '../../core/documents/paths.js';

// Session journal of workspace operations: { label, at, txId, tabs: [{ path, before, after }], undone }. Disk files undo through tx:undo, open tabs by restoring the text.
const ops = [];
export function recordOp(o) { ops.unshift({ at: Date.now(), undone: false, tabs: [], ...o }); ops.length = Math.min(ops.length, 20); return ops[0]; }

function setText({ store, services: { documents } }, id, text) {
  documents.activate(id);
  const e = documents.getEntry(id), v = documents.editorRun('view'), changes = { from: 0, to: e.doc.text.length, insert: text };
  if (v && store.get().documents.activeId === id && v.state.doc.toString() === e.doc.text) { v.dispatch({ changes, userEvent: 'input.replace' }); return true; }
  if (e.state && e.state.doc.toString() === e.doc.text) { e.state = e.state.update({ changes, userEvent: 'input.replace' }).state; documents.syncText(id, e.state.doc.toString()); return true; }
  return false;
}

export async function undoOp(ctx, o) {
  const { ui: { toast }, services: { documents, bus } } = ctx;
  let done = 0;
  const skipped = [];
  for (const txId of o.txIds || (o.txId ? [o.txId] : [])) {
    const r = await txUndo(txId).catch((e) => ({ ok: false, error: e }));
    if (r.ok) for (const x of r.results) { if (x.status === 'restored') done++; else skipped.push(x.path); }
    else { toast((r.error && r.error.message) || 'The operation could not be undone.'); return; }
  }
  for (const { from, to } of o.moved || []) {
    const id = documents.findByPath(to);
    if (id) documents.updateDoc(id, { path: from, name: baseName(from) });
  }
  if (o.renames && o.renames.length) {
    const { rename: fsRename, move: fsMove } = await import('../../services/workspace-client.js');
    for (const { from, to } of [...o.renames].reverse()) {
      try {
        const id = documents.findByPath(to);
        const fromDir = from.slice(0, Math.max(from.lastIndexOf('/'), from.lastIndexOf('\\')));
        const toDir = to.slice(0, Math.max(to.lastIndexOf('/'), to.lastIndexOf('\\')));
        if (fromDir === toDir) await fsRename(to, baseName(from));
        else await fsMove([to], fromDir);
        if (id) documents.updateDoc(id, { path: from, name: baseName(from) });
        done++;
      } catch (err) {
        skipped.push(to);
      }
    }
    if (bus) bus.emit('fs:willRenameOrMove', o.renames.map(({ from, to }) => ({ from: to, to: from })));
  }
  documents.editorRun('flush');
  for (const t of o.tabs) {
    const id = documents.findByPath(t.path), e = id && documents.getEntry(id);
    if (e && e.doc.text === t.after && setText(ctx, id, t.before)) done++; else skipped.push(t.path);
  }
  o.undone = !skipped.length;
  toast(`Undid ${done} file${done === 1 ? '' : 's'}${skipped.length ? `; ${skipped.length} left as is (changed since): ${skipped.slice(0, 3).map(baseName).join(', ')}` : ''}.`, { timeout: skipped.length ? 8000 : 3000 });
}

async function all() {
  const r = await txList().catch(() => null), seen = new Set(ops.flatMap((o) => o.txIds || [o.txId]).filter(Boolean));
  const extra = r && r.ok ? r.items.filter((i) => i.status === 'applied' && !seen.has(i.id)).map((i) => ({ label: i.label, at: i.createdAt, txId: i.id, tabs: [], undone: false })) : [];
  return [...ops, ...extra];
}

export function registerOps(ctx) {
  const { commands, ui: { toast, openMenu } } = ctx;
  const def = (id, title, icon, run) => commands.register({ id, title, icon, group: 'Workspace Tools', run });
  def('tool.undo-last', 'Undo Last Workspace Operation', 'undo-2', async () => {
    const o = (await all()).find((x) => !x.undone);
    if (o) await undoOp(ctx, o); else toast('Nothing to undo.');
  });
  def('tool.recent-ops', 'Recent Operations', 'history', async () => {
    const list = (await all()).slice(0, 10), t = (n) => new Date(n).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const items = list.length ? list.map((o) => ({ label: `${o.undone ? 'Undone' : 'Undo'}: ${o.label || 'Workspace operation'}`, hint: t(o.at), disabled: o.undone, onSelect: () => undoOp(ctx, o) })) : [{ label: 'No recent operations', disabled: true }];
    openMenu(document.querySelector('[data-cmd="tool.recent-ops"]') || document.body, items);
  });
}
