import * as api from '../../services/recovery-client.js';
import { icon } from '../../ui/kit/icons.js';
import { readPath } from '../../services/doc-client.js';
import { diffLines, hunks } from '../../core/diff/line-diff.js';

async function compare(i, note, det, h) {
  try {
    const [{ snapshot: s }, { doc }] = [await api.read(i.key), await readPath(i.path)];
    const rows = diffLines(doc.text, s.text), add = rows.filter((r) => r.t === 'add').length, del = rows.filter((r) => r.t === 'del').length;
    note.textContent = add || del ? `+${add} −${del} lines compared with the file on disk` : 'Identical to the file on disk';
    if (add || del) det.append(h('summary', {}, 'Show changes'), h('pre', {}, hunks(rows).slice(0, 5).map((g) => g.slice(0, 40).map((r) => `${r.t === 'add' ? '+' : r.t === 'del' ? '−' : ' '} ${r.text.slice(0, 200)}`).join('\n')).join('\n…\n')));
    else det.hidden = true;
  } catch (err) { note.textContent = `Could not compare with disk: ${err?.message || 'File no longer exists'}. Restore to recover this snapshot.`; det.hidden = true; }
}

const ago = (t) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

// Closing the dialog keeps the snapshots; they stay listed on Home. Each row's ✕ discards that document; the primary button restores whatever is left.
export function openRecoveryDialog(ctx, items = [], { restore, discard } = {}) {
  const { h, openDialog } = ctx.ui;
  if (!items.length) {
    return openDialog({
      title: 'Recover unsaved documents', icon: 'rotate-ccw', width: 480,
      body: h('div', { class: 'lv-rec' }, h('p', {}, 'No unsaved documents found to recover. All your work was saved safely.')),
      buttons: [{ label: 'Close' }],
    });
  }
  const left = new Map(items.map((i) => [i.key, i]));
  const lead = h('p', { class: 'lv-rec__lead' }), list = h('div', { class: 'lv-rec__list' });
  let dlg = null, go = null;
  const sync = () => {
    const n = left.size;
    lead.textContent = `Laurevine Loto did not close normally. ${n === 1 ? 'This document has' : `These ${n} documents have`} unsaved changes. Remove any you don't need with ✕, then restore the rest.`;
    if (go) { go.textContent = n === 1 ? 'Restore Document' : `Restore ${n} Documents`; go.disabled = !n; }
    if (!n && dlg) dlg.close();
  };
  for (const i of items) {
    const note = h('small', {}, i.path ? 'Comparing with the file on disk…' : 'Untitled document');
    const det = h('details', { class: 'lv-rec__changes' });
    if (i.path) compare(i, note, det, h);
    const cmpBtn = h('button', { type: 'button', class: 'btn', hidden: !i.path || !ctx.services.compareSides, onclick: async () => {
      try {
        const [{ snapshot: s }, { doc }] = [await api.read(i.key), await readPath(i.path)];
        ctx.services.compareSides(`Compare — ${i.name}`, { path: i.path, label: 'On disk', text: doc.text }, { label: 'Recovered', text: s.text });
      } catch { ctx.ui.toast('The file no longer exists on disk. You can still restore the snapshot.'); }
    } }, 'Compare');
    const row = h('div', { class: 'lv-rec__row' }, icon('file-text'),
      h('span', {}, h('b', {}, i.name), h('small', {}, i.path || 'Untitled'), h('small', {}, `Last saved ${ago(i.savedAt)} · ${api.describe(i).split(' · ')[1]}`), note, det, cmpBtn),
      h('button', { type: 'button', class: 'lv-rec__x', title: `Discard ${i.name}`, 'aria-label': `Discard ${i.name}`, onclick: async (e) => {
        e.currentTarget.disabled = true;
        await discard([i.key]);
        left.delete(i.key);
        row.remove();
        sync();
      } }, icon('x')));
    list.append(row);
  }
  dlg = openDialog({
    title: 'Recover unsaved documents', icon: 'rotate-ccw', width: 600,
    body: h('div', { class: 'lv-rec' }, lead, list),
    buttons: [
      { label: 'Decide Later' },
      { label: 'Discard All', onClick: () => discard([...left.keys()]) },
      { label: 'Restore', primary: true, onClick: () => restore([...left.keys()]) },
    ],
  });
  go = dlg.el.querySelector('.btn--primary');
  sync();
  return dlg;
}
