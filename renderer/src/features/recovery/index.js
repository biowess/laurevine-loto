import { MODES } from '../../state/slices/ui.js';
import * as api from '../../services/recovery-client.js';
import { readPath } from '../../services/doc-client.js';
import { hashText } from '../../core/documents/document.js';
import { openRecoveryDialog } from './dialog.js';
import { getSetting } from '../../services/settings-client.js';
import { whenRestored } from '../../services/session-client.js';

const TAG = Date.now().toString(36);
const changed = () => document.dispatchEvent(new Event('lv-recovery'));

export function register(ctx) {
  const { commands, store, ui } = ctx, D = ctx.services.documents, timers = new Map(), live = new Set();
  const key = (id) => `${TAG}-${id}`;
  const caret = (id) => { const e = D.getEntry(id), v = store.get().documents.activeId === id ? D.editorRun('view') : null; return v ? v.state.selection.main.head : e && e.state ? e.state.selection.main.head : (e && e.caret) || 0; };
  const put = async (id) => {
    timers.delete(id);
    D.editorRun('flush');
    const e = D.getEntry(id);
    if (!e || !e.doc.dirty) return;
    live.add(id);
    await api.put({ key: key(id), name: e.doc.name, path: e.doc.path, text: e.doc.text, caret: caret(id), mode: e.mode || store.get().ui.mode }).catch(() => {});
  };
  const forget = (id) => { clearTimeout(timers.get(id)); timers.delete(id); if (live.delete(id)) api.drop([key(id)]).catch(() => {}); };

  D.onDocChange((id) => {
    const e = D.getEntry(id);
    if (!e) return;
    if (!e.doc.dirty) forget(id);
    else if (!timers.has(id)) timers.set(id, setTimeout(() => put(id), getSetting('recovery.interval') * 1000));
  });
  store.subscribe((s) => s.documents.tabs, () => {
    const ids = new Set(store.get().documents.tabs.map((t) => t.id));
    for (const id of [...live, ...timers.keys()]) if (!ids.has(id)) forget(id);
  });

  async function restore(keys) {
    const opened = [];
    for (const k of keys) {
      try {
        const { snapshot: s } = await api.read(k);
        if (!s) continue;
        const openId = s.path ? D.findByPath(s.path) : null;
        if (openId) {
          D.syncText(openId, s.text);
          D.editorRun('reload', openId);
          opened.push(openId);
          await put(openId);
          continue;
        }
        const names = store.get().documents.tabs.map((t) => t.title);
        const disk = s.path && !D.findByPath(s.path) ? await readPath(s.path).then((r) => r.doc, () => null) : null;
        const asFile = !!s.path && !D.findByPath(s.path);
        const doc = D.openDocument({ name: asFile || !names.includes(s.name) ? s.name : undefined, path: asFile ? s.path : null, text: s.text, caret: Math.min(s.caret, s.text.length), ...(disk ? { encoding: disk.encoding, bom: disk.bom, eol: disk.eol, dominantEol: disk.dominantEol, diskHash: disk.hash } : {}) });
        D.updateDoc(doc.id, { dirty: true, savedHash: hashText(disk ? disk.text : ''), deleted: asFile && !disk });
        const e = D.getEntry(doc.id);
        if (MODES.includes(s.mode)) e.mode = s.mode;
        opened.push(doc.id);
        await put(doc.id);
      } catch (err) { ui.toast(`Could not restore a document: ${err.message}`, { timeout: 5000 }); }
    }
    await api.drop(keys).catch(() => {});
    if (opened.length) D.activate(opened[opened.length - 1]);
    changed();
    return { ok: true };
  }
  const discard = async (keys) => { await api.drop(keys).catch(() => {}); changed(); return { ok: true }; };
  const show = async () => {
    const { items: all } = await api.list().catch(() => ({ items: [] })), cut = Date.now() - getSetting('recovery.keepDays') * 864e5, stale = all.filter((i) => i.savedAt < cut);
    if (stale.length) await api.drop(stale.map((i) => i.key)).catch(() => {});
    const items = all.filter((i) => i.savedAt >= cut);
    if (items.length) openRecoveryDialog(ctx, items, { restore, discard });
    return items.length;
  };

  const def = (id, title, run) => commands.register({ id, title, icon: 'rotate-ccw', group: 'File', run });
  def('recovery.show', 'Recover Unsaved Documents…', async () => { if (!await show()) ui.toast('No unsaved documents to recover.'); });
  def('recovery.restore', 'Restore Document', (k) => (typeof k === 'string' ? restore([k]) : undefined));
  def('recovery.discard', 'Discard Recovered Document', (k) => (typeof k === 'string' ? discard([k]) : undefined));
  setTimeout(() => whenRestored().then(show), 400);
}
