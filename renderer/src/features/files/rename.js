import { baseName } from '../../core/documents/paths.js';
import * as api from '../../services/doc-client.js';

// Title-bar rename: untitled documents go to Save As, saved ones are renamed on disk in their own folder.
export function mountRename(ctx, { active, write }) {
  const { h, openDialog } = ctx.ui, D = ctx.services.documents;

  function ask(a) {
    const d = a.e.doc, input = h('input', { type: 'text', class: 'input', spellcheck: 'false', 'aria-label': 'File name' });
    const msg = h('div', { class: 'lv-files__err', role: 'alert' });
    let busy = false, dlg;
    input.value = d.name;
    const go = async () => {
      const name = input.value.trim();
      if (!name || name === d.name) return dlg.close();
      if (busy) return;
      busy = true;
      try {
        const r = await api.rename(d.path, name);
        D.updateDoc(a.id, { path: r.path, name: baseName(r.path) });
        ctx.services.bus?.emit('fs:willRenameOrMove', [{ from: d.path, to: r.path }]);
        dlg.close();
      } catch (err) { msg.textContent = err.message || 'The file could not be renamed.'; busy = false; }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    dlg = openDialog({
      title: 'Rename Document', icon: 'pencil', width: 460, focus: 'input', body: h('div', { class: 'lv-files' }, input, msg),
      buttons: [{ label: 'Cancel' }, { label: 'Rename', primary: true, onClick: () => { go(); return false; } }],
    });
    input.setSelectionRange(0, d.name.lastIndexOf('.') > 0 ? d.name.lastIndexOf('.') : d.name.length);
  }

  ctx.commands.register({
    id: 'file.rename-document', title: 'Rename Document', icon: 'pencil', group: 'File',
    run: () => { const a = active(); if (a) return a.e.doc.path ? ask(a) : write('as', a); },
    enabled: () => !!active(), reason: 'No document open',
  });
  ctx.store.subscribe((s) => s.documents.activeId, () => ctx.commands.invalidate('file.rename-document'));
}
