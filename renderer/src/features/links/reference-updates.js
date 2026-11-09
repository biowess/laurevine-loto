import { computeReferenceEdits, posix, dirOf } from '../../core/links/update.js';
import { applyEdits } from '../../core/diff/edits.js';
import { baseName } from '../../core/documents/paths.js';
import { readPath } from '../../services/doc-client.js';
import { txPreview, txApply } from '../../services/tx-client.js';
import * as W from '../../services/workspace-client.js';
import { recordOp, undoOp } from '../search/index.js';
import { clearToasts } from '../../ui/kit/toast.js';

// Computes workspace-wide reference update plan for file rename/move pairs.
// pairs: [{ from, to }] (absolute or workspace-relative).
export async function computeReferencePlan(ctx, pairs) {
  const { store, services: { documents } } = ctx;
  const root = store.get().workspace.root;
  if (!root || !pairs || !pairs.length) return null;

  const rootPosix = posix(root).replace(/\/+$/, '');
  const toRel = (p) => {
    const s = posix(p);
    return s.startsWith(rootPosix + '/') ? s.slice(rootPosix.length + 1) : s;
  };
  const toAbs = (rel) => {
    const r = root, sep = r.includes('\\') ? '\\' : '/';
    return r.replace(/[\\/]+$/, '') + sep + posix(rel).split('/').join(sep);
  };

  const relPairs = pairs.map((p) => ({
    from: toRel(p.from),
    to: toRel(p.to),
    fromAbs: p.from.includes('/') || p.from.includes('\\') ? p.from : toAbs(p.from),
    toAbs: p.to.includes('/') || p.to.includes('\\') ? p.to : toAbs(p.to),
  }));
  const renames = new Map(relPairs.map((p) => [p.from, p.to]));

  const res = await W.listFiles({ showHidden: false }).catch(() => null);
  const allFiles = res && res.files ? res.files.map(posix) : [];

  for (const p of relPairs) {
    if (/\.(md|markdown|mdown|txt)$/i.test(p.to) && !allFiles.includes(p.to)) {
      allFiles.push(p.to);
    }
  }

  const files = [];
  const openTabs = [];
  const beforeMap = new Map();
  documents.editorRun('flush');

  for (const rel of allFiles) {
    if (!/\.(md|markdown|mdown|txt)$/i.test(rel)) continue;
    const abs = toAbs(rel);
    const id = documents.findByPath(abs);
    let f;
    if (id) {
      const entry = documents.getEntry(id);
      f = { path: abs, text: entry.doc.text };
    } else {
      const r = await readPath(abs).catch(() => null);
      if (!r || !r.ok) continue;
      f = { path: abs, text: r.doc.text, mtimeMs: r.doc.mtimeMs, size: r.doc.size };
    }

    let originalRel = rel;
    for (const [from, to] of renames.entries()) {
      if (to === rel) {
        originalRel = from;
        break;
      }
    }

    const edits = computeReferenceEdits(f.text, originalRel, renames);
    if (edits.length) {
      files.push({ ...f, edits });
      beforeMap.set(abs, f.text);
      if (id) {
        openTabs.push({ path: abs, before: f.text });
      }
    }
  }

  return { files, openTabs, beforeMap, relPairs };
}

// Applies reference updates atomically through the transaction engine.
export async function applyReferencePlan(ctx, plan, label = 'Update Internal References', renames = []) {
  const { ui: { toast, h }, services: { documents } } = ctx;
  const { files, beforeMap } = plan;
  if (!files || !files.length) return null;

  documents.editorRun('flush');
  const tabs = files.filter((f) => documents.findByPath(f.path));
  const disk = files.filter((f) => !documents.findByPath(f.path));
  const applied = [];
  const skipped = [];
  let txId = null;

  if (disk.length) {
    const ops = disk.map((s) => ({
      op: 'write',
      path: s.path,
      text: applyEdits(s.text, s.edits),
    }));
    const p = await txPreview(ops, label);
    if (!p || !p.ok) {
      toast((p && p.error && p.error.message) || 'The changes could not be previewed.');
      return null;
    }
    const a = await txApply(p.id);
    if (!a || !a.ok) {
      toast((a && a.error && a.error.message) || 'The changes could not be applied.');
      return null;
    }
    txId = p.id;
    for (const r of a.results) {
      if (r.status === 'applied') applied.push({ path: r.path, via: 'disk' });
      else skipped.push({ path: r.path, reason: r.reason || r.error });
    }
  }

  for (const s of tabs) {
    const id = documents.findByPath(s.path);
    const entry = id && documents.getEntry(id);
    if (entry && entry.doc.text === s.text) {
      const newText = applyEdits(s.text, s.edits);
      documents.activate(id);
      const v = documents.editorRun('view');
      const changes = { from: 0, to: s.text.length, insert: newText };
      if (v && ctx.store.get().documents.activeId === id && v.state.doc.toString() === s.text) {
        v.dispatch({ changes, userEvent: 'input.replace' });
        applied.push({ path: s.path, via: 'tab' });
      } else if (entry.state) {
        entry.state = entry.state.update({ changes, userEvent: 'input.replace' }).state;
        documents.syncText(id, entry.state.doc.toString());
        applied.push({ path: s.path, via: 'tab' });
      } else {
        skipped.push({ path: s.path, reason: 'changed' });
      }
    } else {
      skipped.push({ path: s.path, reason: 'changed' });
    }
  }

  const recordedTabs = applied.filter((a) => a.via === 'tab').map((a) => {
    const id = documents.findByPath(a.path);
    const cur = id && documents.getEntry(id);
    return { path: a.path, before: beforeMap.get(a.path), after: cur ? cur.doc.text : '' };
  });

  const allRenames = renames.length
    ? renames
    : plan.relPairs ? plan.relPairs.map((p) => ({ from: p.fromAbs, to: p.toAbs })) : [];

  const op = recordOp({
    label,
    txId,
    tabs: recordedTabs,
    renames: allRenames,
  });

  clearToasts();
  const n = applied.length;
  const t = toast(`Updated references in ${n} file${n === 1 ? '' : 's'}${skipped.length ? `; ${skipped.length} skipped` : ''}.`, { timeout: 12000 });
  t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));

  return { applied, skipped, txId };
}

// Mounts fs:willRenameOrMove listener and workspace rename/reference commands.
export function mountReferenceUpdates(ctx) {
  const { commands, store, ui, services: { bus } } = ctx;
  const { h, openDialog, toast } = ui;

  let busy = false;
  bus.on('fs:willRenameOrMove', async (pairs) => {
    if (busy || !pairs || !pairs.length) return;
    busy = true;
    try {
      const rawSetting = ctx.settings.get('links.updateReferences') || ctx.settings.get('markdown.updateReferences') || 'always ask';
      const setting = String(rawSetting).toLowerCase();
      if (setting === 'never') return;

      const plan = await computeReferencePlan(ctx, pairs);
      if (!plan || !plan.files.length) {
        recordOp({
          label: pairs.length === 1 ? `Rename ${baseName(pairs[0].from)}` : `Move ${pairs.length} files`,
          renames: pairs,
          tabs: [],
        });
        return;
      }

      const label = pairs.length === 1
        ? `Update references to ${baseName(pairs[0].to)}`
        : `Update references for ${pairs.length} files`;

      if (setting.includes('apply') || setting === 'always') {
        await applyReferencePlan(ctx, plan, label, pairs);
      } else {
        const res = await ctx.services.review({
          title: label,
          files: plan.files,
        });
        if (res && res.applied && res.applied.length) {
          const recordedTabs = res.applied.filter((a) => a.via === 'tab').map((a) => {
            const id = ctx.services.documents.findByPath(a.path);
            const cur = id && ctx.services.documents.getEntry(id);
            return { path: a.path, before: plan.beforeMap.get(a.path), after: cur ? cur.doc.text : '' };
          });
          const op = recordOp({
            label,
            txId: res.txId,
            tabs: recordedTabs,
            renames: pairs,
          });
          clearToasts();
          const t = toast(`Updated references in ${res.applied.length} file${res.applied.length === 1 ? '' : 's'}.`, { timeout: 12000 });
          t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));
        } else {
          recordOp({
            label: pairs.length === 1 ? `Rename ${baseName(pairs[0].from)}` : `Move ${pairs.length} files`,
            renames: pairs,
            tabs: [],
          });
        }
      }
    } catch (err) {
      console.error('Reference update failed:', err);
    } finally {
      busy = false;
    }
  });
}
