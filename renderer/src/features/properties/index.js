import { createPanels } from './panel.js';
import { createProperties } from './view.js';
import { openEditProperties } from './edit-dialog.js';
import { setSetting } from '../../services/settings-client.js';
import * as clip from '../../services/clipboard-client.js';
import { registerInfoPage } from './info-page.js';

export function register(ctx) {
  const { commands, store, services: { documents }, ui } = ctx, p = createProperties(ctx);
  commands.register({ id: 'properties.edit', title: 'Edit Properties', icon: 'pencil', group: 'Properties', reason: 'Open a document first', enabled: () => !!documents.getEntry(store.get().documents.activeId), run: () => openEditProperties(ctx) });
  commands.register({ id: 'properties.copy', title: 'Copy Property Value', icon: 'copy', group: 'Properties', run: (t) => { if (typeof t === 'string') clip.writeText(t).then(() => ui.toast('Copied')).catch(() => ui.toast('Could not copy.')); } });
  commands.register({ id: 'properties.set-anchor', title: 'Set Heading Anchors', icon: 'hash', group: 'Properties', run: (v) => { if (typeof v === 'string') setSetting('markdown.anchorStrategy', v); } });
  setTimeout(p.wire, 0);
  registerInfoPage(ctx);
  ctx.settings.define('properties', { showStats: { type: 'boolean', default: true } });
  return createPanels(ctx, p).map((p) => ctx.panels.register(p));
}
