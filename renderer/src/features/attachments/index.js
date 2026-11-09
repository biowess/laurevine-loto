import { createPanels } from './panel.js';
import { createAttachments } from './view.js';

export function register(ctx) {
  ctx.settings.define('attachments', { folder: { type: 'string', default: 'assets' } });
  return createPanels(ctx, createAttachments(ctx)).map((p) => ctx.panels.register(p));
}
