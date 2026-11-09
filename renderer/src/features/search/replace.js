import { h } from '../../ui/kit/dom.js';
import { clearToasts } from '../../ui/kit/toast.js';
import { replaceEdits } from '../../core/search/replace-plan.js';
import { absPath } from '../../core/search/results-model.js';
import { baseName } from '../../core/documents/paths.js';
import { readPath } from '../../services/doc-client.js';
import { recordOp, undoOp } from './ops.js';

const clip = (s) => (s.length > 30 ? s.slice(0, 30) + '…' : s);

// Replace field and Replace in File / Replace All buttons. groups(): result groups, cur(): selected group or hit.
export function createReplace(ctx, S, groups, cur) {
  const { store, services: { documents }, ui: { runCommand, toast } } = ctx;
  S.rp = '';
  const input = h('input', { type: 'text', class: 'sr__qi', 'aria-label': 'Replace with', placeholder: 'Replace with ($1 for groups)', spellcheck: 'false', oninput: (e) => { S.rp = e.target.value; } });
  const btn = (cmd, label, title) => h('button', { type: 'button', class: 'btn sr__rb', title, disabled: true, dataset: { cmd }, onclick: () => runCommand(cmd) }, label);
  const bs = [btn('search.replace-file', 'Replace in File', 'Replace in the selected result’s file'), btn('search.replace-all', 'Replace All', 'Replace in every file with results')];
  const el = h('div', { class: 'sr__rp' }, input, ...bs);

  async function plan(paths) {
    const root = store.get().workspace.root, files = [], failed = [];
    const opts = { query: S.q, caseSensitive: S.cs, wholeWord: S.ww, regex: S.rx };
    const sc = new Set(Object.keys(S.sc).filter((k) => S.sc[k] && k !== 'filenames'));
    documents.editorRun('flush');
    for (const p of paths) {
      const abs = S.mode === 'file' ? p : absPath(root, p), id = documents.findByPath(abs);
      let f;
      if (id) f = { path: abs, text: documents.getEntry(id).doc.text };
      else {
        const r = await readPath(abs).catch(() => null);
        if (!r || !r.ok) { failed.push(abs); continue; }
        f = { path: abs, text: r.doc.text, mtimeMs: r.doc.mtimeMs, size: r.doc.size };
      }
      const edits = replaceEdits(f.text, opts, sc, S.rp).edits;
      if (edits.length) files.push({ ...f, edits });
    }
    return { files, failed };
  }

  async function run(all) {
    const gs = groups().filter((g) => g.items.some((i) => i.scope !== 'filenames')), c = cur();
    const sel = all ? gs : [gs.find((g) => g === c || g.items.includes(c)) || gs[0]].filter(Boolean);
    if (!sel.length) return toast('Nothing to replace. Filename results cannot be replaced.');
    if (S.mode === 'file' && !sel[0].path) return toast('Save the document before replacing in it.');
    const { files, failed } = await plan(sel.map((g) => g.path));
    if (failed.length) toast(`${failed.length} file${failed.length === 1 ? '' : 's'} could not be read and ${failed.length === 1 ? 'was' : 'were'} left out: ${failed.slice(0, 3).map(baseName).join(', ')}.`, { timeout: 8000 });
    if (!files.length) return failed.length ? undefined : toast('No changes to make.');
    const before = new Map(files.map((f) => [f.path, f.text]));
    const label = `Replace “${clip(S.q)}” with “${clip(S.rp)}”`;
    const res = await ctx.services.review({ title: label, files });
    if (!res || !res.applied.length) return;
    documents.editorRun('flush');
    const tabs = res.applied.filter((a) => a.via === 'tab').map((a) => ({ path: a.path, before: before.get(a.path), after: documents.getEntry(documents.findByPath(a.path)).doc.text }));
    const op = recordOp({ label, txId: res.txId, tabs });
    const n = res.applied.length, sk = res.skipped;
    clearToasts();
    const t = toast(`Replaced in ${n} file${n === 1 ? '' : 's'}${sk.length ? `; ${sk.length} skipped, changed since the preview: ${sk.slice(0, 3).map((x) => baseName(x.path)).join(', ')}` : ''}.`, { timeout: 12000 });
    t.append(h('button', { type: 'button', class: 'lv-toast__btn', onclick: () => { t.remove(); undoOp(ctx, op); } }, 'Undo'));
  }

  return {
    el, run,
    sync: (on) => bs.forEach((b) => { b.disabled = !on; }),
    focus: () => { input.focus(); input.select(); },
  };
}
