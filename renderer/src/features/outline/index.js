import { createPanels } from './panel.js';
import { createOutline } from './view.js';

export function register(ctx) {
  const o = createOutline(ctx), key = (a) => (typeof a === 'string' ? a : undefined);
  const def = (id, title, icon, run) => ctx.commands.register({ id, title, icon, group: 'Outline', enabled: () => o.has(), reason: 'No headings in this document', run });
  def('outline.collapse-all', 'Collapse All', 'chevrons-down-up', () => o.setAll(true));
  def('outline.expand-all', 'Expand All', 'chevrons-up-down', () => o.setAll(false));
  def('outline.goto', 'Go to Heading', 'hash', (a) => o.goto(key(a)));
  def('outline.copy-link', 'Copy Heading Link', 'link', (a) => o.copyLink(key(a)));
  def('outline.collapse', 'Collapse or Expand Section', 'chevron-down', (a) => o.toggle(key(a)));
  setTimeout(o.wire, 0);
  ctx.settings.define('outline', { maxDepth: { type: 'number', default: 6, min: 1, max: 6 } });
  return createPanels(ctx, o).map((p) => ctx.panels.register(p));
}
