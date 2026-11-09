import { uiActions } from '../../state/slices/ui.js';
import { list } from '../../services/templates-client.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { vars, fill, caretFor, pushRecent } from '../../core/templates/gallery-model.js';

export function mountNewDocument(ctx) {
  const { commands, store, ui } = ctx, D = ctx.services.documents;
  commands.register({ id: 'file.new-choose', title: 'New Document…', icon: 'file-plus-2', group: 'File',
    run: () => (getSetting('templates.newAction') === 'blank' ? commands.execute('file.new') : store.dispatch(uiActions.backstage(true, 'new'))) });
  commands.register({ id: 'file.new-from-template', title: 'New from Template', icon: 'layout-template', group: 'File',
    run: async (id) => {
      let t;
      try { t = (await list()).items.find((x) => x.id === id); } catch { /* reported below */ }
      if (!t) return ui.toast('That template is not available.');
      const text = fill(t.text, vars(getSetting('user.name')));
      D.openDocument({ text, caret: caretFor(text) });
      store.dispatch(uiActions.backstage(false));
      if (id !== 'blank') setSetting('templates.recent', pushRecent(getSetting('templates.recent'), id)).catch(() => {});
    } });
}
