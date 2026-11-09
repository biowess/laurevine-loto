import { validatePath } from '../../core/documents/paths.js';

export function openPathDialog(ctx, onOpen) {
  const { h, openDialog } = ctx.ui;
  const input = h('input', { type: 'text', class: 'input', spellcheck: 'false', placeholder: '/home/me/notes.md', 'aria-label': 'File path' });
  const msg = h('div', { class: 'lv-files__err', role: 'alert' });
  let busy = false, api;
  const go = async () => {
    const bad = validatePath(input.value);
    msg.textContent = bad || '';
    if (bad || busy) return;
    busy = true;
    const err = await onOpen(input.value.trim());
    busy = false;
    if (err) msg.textContent = err; else api.close();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  api = openDialog({
    title: 'Open from Path', icon: 'file-up', width: 460, focus: 'input', body: h('div', { class: 'lv-files' }, input, msg),
    buttons: [{ label: 'Cancel' }, { label: 'Open', primary: true, onClick: () => { go(); return false; } }],
  });
}

export function confirmDialog(ctx, { title, text, label }) {
  return new Promise((resolve) => {
    let ok = false;
    ctx.ui.openDialog({
      title, icon: 'triangle-alert', width: 420, body: text,
      buttons: [{ label: 'Cancel' }, { label, primary: true, onClick: () => { ok = true; } }],
      onClose: () => resolve(ok),
    });
  });
}
