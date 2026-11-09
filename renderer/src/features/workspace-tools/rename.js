import { h } from '../../ui/kit/dom.js';
import { clearToasts } from '../../ui/kit/toast.js';
import { baseName } from '../../core/documents/paths.js';
import * as W from '../../services/workspace-client.js';
import { txPreview, txApply } from '../../services/tx-client.js';
import { computeReferencePlan } from '../links/index.js';
import { recordOp, undoOp } from '../search/index.js';

const posix = (p) => p.replace(/\\/g, '/');
const dirOf = (p) => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); };
const BAD_NAME = /[<>:"/\\|?*]/;

export async function openBatchRename(ctx) {
  const { store, ui: { openDialog, toast }, services: { documents, bus } } = ctx;
  const root = store.get().workspace.root;
  if (!root) return toast('Open a workspace folder first.');

  const res = await W.listFiles({ showHidden: false }).catch(() => null);
  const files = (res && res.files ? res.files : []).map(posix);
  if (!files.length) return toast('No files in workspace.');

  const sep = root.includes('\\') ? '\\' : '/';
  const toAbs = (rel) => root.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep);
  const existingSet = new Set(files.map((f) => f.toLowerCase()));

  const findInput = h('input', { type: 'text', class: 'input', placeholder: 'Pattern to find in filename', spellcheck: 'false' });
  const repInput = h('input', { type: 'text', class: 'input', placeholder: 'Replace with ($1 for regex, {n} for counter)', spellcheck: 'false' });
  const csBox = h('input', { type: 'checkbox' });
  const rxBox = h('input', { type: 'checkbox' });
  const mdOnlyBox = h('input', { type: 'checkbox', checked: true });
  const list = h('div', { class: 'wt-list' });
  const countLabel = h('div', { class: 'wt-sub' }, 'Enter a pattern to find matching files.');

  let matches = [];
  const selected = new Set();

  function detect() {
    list.replaceChildren();
    selected.clear();
    const q = findInput.value, rep = repInput.value;
    if (!q) {
      countLabel.textContent = 'Enter a pattern to find matching files.';
      matches = [];
      return;
    }

    let re = null;
    if (rxBox.checked) {
      try { re = new RegExp(q, csBox.checked ? 'g' : 'gi'); } catch {
        countLabel.textContent = 'Invalid regular expression.';
        matches = [];
        return;
      }
    }

    const pool = mdOnlyBox.checked ? files.filter((f) => /\.(md|markdown|mdown)$/i.test(f)) : files;
    const destCounts = new Map();
    const rawMatches = [];
    let counter = 1;

    for (const f of pool) {
      const name = baseName(f);
      let matched = false, newName = name;
      if (re) {
        if (re.test(name)) {
          matched = true;
          re.lastIndex = 0;
          newName = name.replace(re, (...args) => rep.replace(/\{n\}/g, String(counter++)).replace(/\$(\d+)/g, (_, n) => args[Number(n)] || ''));
        }
      } else {
        const idx = csBox.checked ? name.indexOf(q) : name.toLowerCase().indexOf(q.toLowerCase());
        if (idx >= 0) {
          matched = true;
          const target = csBox.checked ? q : name.slice(idx, idx + q.length);
          newName = name.split(target).join(rep.replace(/\{n\}/g, String(counter++)));
        }
      }

      if (matched && newName !== name) {
        const dir = dirOf(f);
        const to = (dir ? dir + '/' : '') + newName;
        rawMatches.push({ from: f, to, newName, dir });
        const key = to.toLowerCase();
        destCounts.set(key, (destCounts.get(key) || 0) + 1);
      }
    }

    const fromSet = new Set(rawMatches.map((m) => m.from.toLowerCase()));
    matches = rawMatches.map((m) => {
      let err = '';
      if (!m.newName.trim()) err = 'Empty filename';
      else if (BAD_NAME.test(m.newName)) err = 'Invalid characters';
      else if ((destCounts.get(m.to.toLowerCase()) || 0) > 1) err = 'Duplicate target';
      else if (existingSet.has(m.to.toLowerCase()) && !fromSet.has(m.to.toLowerCase())) err = 'Destination exists';
      return { ...m, err };
    });

    const validCount = matches.filter((m) => !m.err).length;
    countLabel.textContent = `${matches.length} matching file${matches.length === 1 ? '' : 's'}${matches.length ? ` (${validCount} valid, ${matches.length - validCount} collision${matches.length - validCount === 1 ? '' : 's'})` : ''}`;

    matches.forEach((m, i) => {
      const cb = h('input', { type: 'checkbox', checked: !m.err, disabled: !!m.err });
      if (!m.err) selected.add(i);
      cb.addEventListener('change', () => { if (cb.checked) selected.add(i); else selected.delete(i); });
      const badge = h('span', { class: `wt-badge ${m.err ? 'wt-badge--err' : 'wt-badge--ok'}` }, m.err || 'Ready');
      const item = h('label', { class: 'wt-item' }, cb, h('div', { class: 'wt-item__content' },
        h('div', { class: 'wt-item__names' }, h('span', { class: 'wt-from' }, baseName(m.from)), ' → ', h('b', { class: 'wt-to' }, m.newName)),
        h('div', { class: 'wt-item__dir' }, m.dir || '(workspace root)')), badge);
      list.append(item);
    });
  }

  findInput.addEventListener('input', detect);
  repInput.addEventListener('input', detect);
  csBox.addEventListener('change', detect);
  rxBox.addEventListener('change', detect);
  mdOnlyBox.addEventListener('change', detect);

  let dlg;
  const onProceed = async () => {
    const picked = matches.filter((_, i) => selected.has(i));
    if (!picked.length) return toast('No valid files selected for rename.');
    dlg.close();

    const pairs = picked.map((m) => ({ from: toAbs(m.from), to: toAbs(m.to) }));
    const plan = await computeReferencePlan(ctx, pairs).catch(() => null);

    let refTx = null, recordedTabs = [];
    if (plan && plan.files && plan.files.length) {
      const res = await ctx.services.review({
        title: `Rename & Update References (${pairs.length} files)`,
        files: plan.files,
      });
      if (!res) return;
      refTx = res.txId;
      recordedTabs = res.applied.filter((x) => x.via === 'tab').map((x) => {
        const id = documents.findByPath(x.path);
        const cur = id && documents.getEntry(id);
        return { path: x.path, before: plan.beforeMap.get(x.path), after: cur ? cur.doc.text : '' };
      });
    }

    const ops = pairs.map((p) => ({ op: 'rename', path: p.from, newPath: p.to }));
    const p = await txPreview(ops, `Batch Rename (${pairs.length} files)`).catch((e) => ({ ok: false, error: e }));
    if (!p || !p.ok) return toast((p && p.error && p.error.message) || 'Rename preview failed.');

    const a = await txApply(p.id).catch((e) => ({ ok: false, error: e }));
    if (!a || !a.ok) return toast((a && a.error && a.error.message) || 'Rename operation failed.');

    const applied = a.results.filter((r) => r.status === 'applied');
    const failed = a.results.filter((r) => r.status !== 'applied');

    for (const pair of pairs) {
      const id = documents.findByPath(pair.from);
      if (id) documents.updateDoc(id, { path: pair.to, name: baseName(pair.to) });
    }

    const op = recordOp({
      label: `Batch Rename (${applied.length} files)`,
      txIds: [p.id, refTx].filter(Boolean),
      tabs: recordedTabs,
      moved: pairs,
    });

    if (bus) bus.emit('fs:changed');

    clearToasts();
    const t = toast(`Renamed ${applied.length} file${applied.length === 1 ? '' : 's'}${failed.length ? `; ${failed.length} failed` : ''}.`, { timeout: 12000 });
    t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));
  };

  dlg = openDialog({
    title: 'Rename Files',
    icon: 'file-pen',
    width: 620,
    body: h('div', { class: 'wt-dlg' },
      h('div', { class: 'wt-row' },
        h('div', { class: 'wt-field' }, h('label', {}, 'Find in filenames:'), findInput),
        h('div', { class: 'wt-field' }, h('label', {}, 'Replace with:'), repInput)),
      h('div', { class: 'wt-options' },
        h('label', { class: 'wt-opt' }, csBox, 'Match case'),
        h('label', { class: 'wt-opt' }, rxBox, 'Regular expression'),
        h('label', { class: 'wt-opt' }, mdOnlyBox, 'Markdown files only')),
      countLabel,
      list),
    buttons: [
      { label: 'Cancel' },
      { label: 'Rename & Update References', primary: true, onClick: () => { onProceed(); return false; } },
    ],
  });
  findInput.focus();
}

export async function openUpdateReferences(ctx) {
  const { store, ui: { openDialog, toast } } = ctx;
  const root = store.get().workspace.root;
  if (!root) return toast('Open a workspace folder first.');

  const sep = root.includes('\\') ? '\\' : '/';
  const toAbs = (p) => (p.includes(':') || p.startsWith('/') || p.startsWith('\\') ? p : root.replace(/[\\/]+$/, '') + sep + p.split('/').join(sep));

  const fromInput = h('input', { type: 'text', class: 'input', placeholder: 'Old path (e.g. notes/old-name.md)', spellcheck: 'false' });
  const toInput = h('input', { type: 'text', class: 'input', placeholder: 'New path (e.g. archive/new-name.md)', spellcheck: 'false' });

  let dlg;
  const onGo = async () => {
    const fromVal = fromInput.value.trim();
    const toVal = toInput.value.trim();
    if (!fromVal || !toVal || fromVal === toVal) return toast('Enter both old and new paths.');
    dlg.close();

    const pairs = [{ from: toAbs(fromVal), to: toAbs(toVal) }];
    const plan = await computeReferencePlan(ctx, pairs);
    if (!plan || !plan.files.length) return toast(`No references found pointing to ${fromVal}.`);

    const label = `Update References: ${baseName(fromVal)} → ${baseName(toVal)}`;
    const res = await ctx.services.review({ title: label, files: plan.files });
    if (res && res.applied && res.applied.length) {
      const recordedTabs = res.applied.filter((a) => a.via === 'tab').map((a) => {
        const id = ctx.services.documents.findByPath(a.path);
        const cur = id && ctx.services.documents.getEntry(id);
        return { path: a.path, before: plan.beforeMap.get(a.path), after: cur ? cur.doc.text : '' };
      });
      const op = recordOp({ label, txId: res.txId, tabs: recordedTabs });
      clearToasts();
      const t = toast(`Updated references in ${res.applied.length} file${res.applied.length === 1 ? '' : 's'}${res.skipped.length ? `; ${res.skipped.length} skipped` : ''}.`, { timeout: 12000 });
      t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));
    }
  };

  dlg = openDialog({
    title: 'Update Internal References',
    icon: 'refresh-cw',
    width: 500,
    body: h('div', { class: 'wt-dlg' },
      h('div', { class: 'wt-field' }, h('label', {}, 'Old path or reference:'), fromInput),
      h('div', { class: 'wt-field', style: { marginTop: '8px' } }, h('label', {}, 'New path or reference:'), toInput)),
    buttons: [
      { label: 'Cancel' },
      { label: 'Review Changes', primary: true, onClick: () => { onGo(); return false; } },
    ],
  });
  fromInput.focus();
}
