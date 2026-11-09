import { createPanels } from './panel.js';
import { references } from './view.js';
import { relPath } from '../../core/search/results-model.js';
import { titleOf } from '../../core/links/backlinks.js';
import { extractHeadings } from '../../core/toc/headings.js';
import { withIds } from '../../core/toc/generate.js';

async function find(ctx) {
  const { store, settings, commands, ui, services: { documents: D } } = ctx;
  D.editorRun('flush');
  const s = store.get(), t = s.documents.tabs.find((x) => x.id === s.documents.activeId), path = t && t.path && s.workspace.root && relPath(s.workspace.root, t.path);
  if (!path) return ui.toast('Save the document inside the workspace to find its references.');
  const v = D.editorRun('view'), e = D.getEntry(t.id);
  const hd = v && e && withIds(extractHeadings(e.doc.text), settings.get('markdown.anchorStrategy')).find((x) => x.line === v.state.doc.lineAt(v.state.selection.main.head).number - 1);
  const label = `References to ${titleOf(path)}${hd ? ` › ${hd.text}` : ''}`;
  try { await commands.execute('search.show-refs', { label, items: await references(ctx, path, hd && hd.id) }); } catch (err) { ui.toast((err && err.message) || 'References could not be loaded.'); }
}

export function register(ctx) {
  const cmd = (id, title, icon, run) => ctx.commands.register({ id, title, icon, group: 'References', run });
  cmd('ref.find', 'Find References', 'text-search', () => find(ctx));
  cmd('ref.backlinks', 'Backlinks', 'corner-up-left', () => ctx.ui.openPanel('left', 'backlinks'));
  cmd('ref.internal-link', 'Internal Link', 'link-2', () => ctx.ui.runCommand('ins.file-link'));
  ctx.settings.define('backlinks', { showUnlinked: { type: 'boolean', default: false } });
  return createPanels(ctx).map((p) => ctx.panels.register(p));
}