import { CH } from '../../../../shared/channels.js';
import { on } from '../../services/ipc.js';
import { armCloseGuard, closeWindow } from '../../services/window-client.js';

export function mountCloseGuard(ctx, saveById) {
  const D = ctx.services.documents;
  let busy = false;
  const dirty = () => ctx.store.get().documents.tabs.filter((t) => t.dirty);
  const ask = (n) => new Promise((resolve) => {
    let r = 'cancel';
    ctx.ui.openDialog({
      title: 'Unsaved changes', icon: 'triangle-alert', width: 440,
      body: `${n} document${n > 1 ? 's have' : ' has'} unsaved changes. Save before closing?`,
      buttons: [{ label: 'Cancel' }, { label: 'Discard', onClick: () => { r = 'discard'; } }, { label: 'Save All', primary: true, onClick: () => { r = 'save'; } }],
      onClose: () => resolve(r),
    });
  });
  const handle = async () => {
    if (busy) return;
    busy = true;
    try {
      D.editorRun('flush');
      const n = dirty().length;
      let r = n ? await ask(n) : 'discard';
      if (r === 'save') for (const t of dirty()) { D.activate(t.id); if (!await saveById(t.id)) { r = 'cancel'; break; } }
      if (r !== 'cancel') await closeWindow();
    } finally { busy = false; }
  };
  try { on(CH.WINDOW_CLOSE_REQUESTED, handle); armCloseGuard().catch(() => {}); } catch (err) { console.warn('[files] close guard unavailable:', err.message); }
}
