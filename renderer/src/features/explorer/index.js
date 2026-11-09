import { createPanels } from './panel.js';
import { createExplorer } from './view.js';
import { mountCommands } from './commands.js';

export function register(ctx) {
  const { commands, panels } = ctx;
  commands.registerAll('Explorer', [
    ['explorer.new-file', 'New File', 'file-plus-2'], ['explorer.new-folder', 'New Folder', 'folder-plus'], ['explorer.sort', 'Sort', 'arrow-down-a-z'],
    ['explorer.open', 'Open', 'file-text'], ['explorer.open-side', 'Open to the Side', 'columns-2'], ['explorer.rename', 'Rename', 'pencil'],
    ['explorer.duplicate', 'Duplicate', 'copy'], ['explorer.reveal', 'Show in Folder', 'folder-search'], ['explorer.delete', 'Delete', 'trash-2'],
  ]);
  const ex = createExplorer(ctx);
  mountCommands(ctx, ex);
  ex.restore();
  return createPanels(ctx, ex).map((p) => panels.register(p));
}
