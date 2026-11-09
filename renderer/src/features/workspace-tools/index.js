import { openBatchRename, openUpdateReferences } from './rename.js';
import { openOrphanedAssets } from './orphaned.js';
import { openFormatWorkspace } from './format.js';

export { openBatchRename, openUpdateReferences, openOrphanedAssets, openFormatWorkspace };

export function register(ctx) {
  const { commands } = ctx;
  const def = (id, title, icon, run, extra) => commands.register({ id, title, icon, group: 'Workspace Tools', run, ...extra });

  def('tool.rename-files', 'Rename Files', 'file-pen', () => openBatchRename(ctx), {
    aliases: ['batch rename', 'rename workspace files'],
  });

  def('tool.update-links', 'Update Internal References', 'refresh-cw', () => openUpdateReferences(ctx), {
    aliases: ['update references', 'fix internal links'],
  });

  def('tool.orphaned-assets', 'Inspect Orphaned Assets', 'file-warning', () => openOrphanedAssets(ctx), {
    aliases: ['clean unused assets', 'unused attachments', 'orphaned assets'],
  });

  def('tool.format-workspace', 'Format Workspace Files', 'wand-sparkles', () => openFormatWorkspace(ctx), {
    aliases: ['format files', 'format all markdown', 'batch format'],
  });

  def('tool.format-files', 'Format Workspace Files', 'wand-sparkles', () => openFormatWorkspace(ctx), {
    aliases: ['format workspace files'],
  });
}
