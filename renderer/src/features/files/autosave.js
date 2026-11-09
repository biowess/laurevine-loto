import { autosaveReady } from '../../core/documents/save-state.js';
import { getSetting } from '../../services/settings-client.js';

// Writes the real file through the normal save path (expectedHash conflict check). Untitled, failed, conflicted and deleted documents are skipped, so autosave pauses until the user resolves them.
export function mountAutosave(ctx, write) {
  const { store } = ctx, D = ctx.services.documents, timers = new Map();
  const ready = (id) => { const e = D.getEntry(id); return e && autosaveReady(store.get().documents.tabs.find((t) => t.id === id)) ? { id, e } : null; };
  const run = (id, mode) => { timers.delete(id); const a = getSetting('files.autosave') === mode && ready(id); if (a) write('save', a, false, true); };
  D.onDocChange((id) => {
    clearTimeout(timers.get(id)); timers.delete(id);
    if (getSetting('files.autosave') === 'delay' && ready(id)) timers.set(id, setTimeout(() => run(id, 'delay'), getSetting('files.autosaveDelay') * 1000));
  });
  const blur = () => {
    if (getSetting('files.autosave') !== 'blur') return;
    D.editorRun('flush');
    store.get().documents.tabs.forEach((t) => run(t.id, 'blur'));
  };
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', () => { if (document.hidden) blur(); });
}
