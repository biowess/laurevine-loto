import { h } from '../../ui/kit/dom.js';
import { clearToasts } from '../../ui/kit/toast.js';
import { baseName } from '../../core/documents/paths.js';
import { formatMarkdown } from '../../core/format/index.js';
import { readPath } from '../../services/doc-client.js';
import * as W from '../../services/workspace-client.js';
import { recordOp, undoOp } from '../search/index.js';

const posix = (p) => p.replace(/\\/g, '/');

const delta = (a, b) => {
  let p = 0, s = 0;
  while (p < a.length && a[p] === b[p]) p++;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return { from: p, to: a.length - s, insert: b.slice(p, b.length - s) };
};

export async function openFormatWorkspace(ctx) {
  const { store, ui: { openDialog, toast }, services: { documents } } = ctx;
  const root = store.get().workspace.root;
  if (!root) return toast('Open a workspace folder first.');

  const res = await W.listFiles({ showHidden: false }).catch(() => null);
  const files = (res && res.files ? res.files : []).map(posix).filter((f) => /\.(md|markdown|mdown)$/i.test(f));
  if (!files.length) return toast('No Markdown files found in workspace.');

  const sep = root.includes('\\') ? '\\' : '/';
  const toAbs = (rel) => root.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep);

  const filterInput = h('input', { type: 'text', class: 'input', placeholder: 'Filter files to format', spellcheck: 'false' });
  const list = h('div', { class: 'wt-list' });
  const countLabel = h('div', { class: 'wt-sub' });
  const selected = new Set(files);

  function renderList() {
    list.replaceChildren();
    const q = filterInput.value.trim().toLowerCase();
    const visible = q ? files.filter((f) => f.toLowerCase().includes(q)) : files;
    countLabel.textContent = `${selected.size} of ${files.length} Markdown files selected for formatting.`;

    if (!visible.length) {
      list.append(h('div', { class: 'wt-empty' }, 'No files match the filter.'));
      return;
    }

    visible.forEach((f) => {
      const cb = h('input', { type: 'checkbox', checked: selected.has(f) });
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(f); else selected.delete(f);
        countLabel.textContent = `${selected.size} of ${files.length} Markdown files selected for formatting.`;
      });
      const row = h('label', { class: 'wt-item' },
        cb,
        h('div', { class: 'wt-item__content' },
          h('b', { class: 'wt-item__name' }, baseName(f)),
          h('div', { class: 'wt-item__path' }, f)));
      list.append(row);
    });
  }

  filterInput.addEventListener('input', renderList);
  renderList();

  let dlg;
  const onReview = async () => {
    const picked = [...selected];
    if (!picked.length) return toast('No files selected.');
    dlg.close();

    toast('Formatting selected files…', { timeout: 2000 });
    documents.editorRun('flush');

    const toReview = [];
    const beforeMap = new Map();

    for (const rel of picked) {
      const abs = toAbs(rel);
      const id = documents.findByPath(abs);
      let text, mtimeMs, size;

      if (id) {
        text = documents.getEntry(id).doc.text;
      } else {
        const r = await readPath(abs).catch(() => null);
        if (!r || !r.ok) continue;
        text = r.doc.text;
        mtimeMs = r.doc.mtimeMs;
        size = r.doc.size;
      }

      const formatted = formatMarkdown(text).text;
      if (formatted !== text) {
        const edits = [delta(text, formatted)];
        toReview.push({ path: abs, text, edits, mtimeMs, size });
        beforeMap.set(abs, text);
      }
    }

    if (!toReview.length) {
      return toast('All selected files are already formatted.');
    }

    const res = await ctx.services.review({
      title: `Format Workspace Files (${toReview.length} files)`,
      files: toReview,
    });

    if (res && res.applied && res.applied.length) {
      const recordedTabs = res.applied.filter((a) => a.via === 'tab').map((a) => {
        const id = documents.findByPath(a.path);
        const cur = id && documents.getEntry(id);
        return { path: a.path, before: beforeMap.get(a.path), after: cur ? cur.doc.text : '' };
      });
      const op = recordOp({
        label: `Format Workspace Files (${res.applied.length} files)`,
        txId: res.txId,
        tabs: recordedTabs,
      });

      clearToasts();
      const n = res.applied.length;
      const t = toast(`Formatted ${n} file${n === 1 ? '' : 's'}${res.skipped.length ? `; ${res.skipped.length} skipped` : ''}.`, { timeout: 12000 });
      t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));
    }
  };

  dlg = openDialog({
    title: 'Format Workspace Files',
    icon: 'wand-sparkles',
    width: 600,
    body: h('div', { class: 'wt-dlg' },
      filterInput,
      countLabel,
      list),
    buttons: [
      { label: 'Cancel' },
      { label: 'Select All', onClick: () => { files.forEach((f) => selected.add(f)); renderList(); return false; } },
      { label: 'Deselect All', onClick: () => { selected.clear(); renderList(); return false; } },
      { label: 'Review Changes', primary: true, onClick: () => { onReview(); return false; } },
    ],
  });
}
