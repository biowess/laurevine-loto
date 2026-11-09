import * as TC from '../../services/templates-client.js';
import { categories } from '../../core/templates/gallery-model.js';
import { detailsDialog } from './details-dialog.js';
import { mountManager } from './manager.js';

export function register(ctx) {
  const { commands, store, ui } = ctx, D = ctx.services.documents;
  commands.register({ id: 'file.save-as-template', title: 'Save as Template…', icon: 'layout-template', group: 'File', enabled: () => !!store.get().documents.activeId,
    run: async () => {
      const id = store.get().documents.activeId;
      if (!id || !D.getEntry(id)) return;
      D.editorRun('flush');
      const { doc } = D.getEntry(id);
      let cats = [];
      try { cats = categories((await TC.list()).items).slice(1); } catch { /* no suggestions */ }
      detailsDialog(ctx, { title: 'Save as Template', label: 'Save', name: doc.name.replace(/\.[^.]*$/, ''), categories: cats,
        onSubmit: async (v) => { await TC.save({ ...v, text: D.getEntry(id).doc.text }); ui.toast(`Saved template “${v.name}”`); } });
    } });
  mountManager(ctx);
}
