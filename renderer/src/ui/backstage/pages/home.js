import { registerAll } from '../../../commands/registry.js';
import { page, cta } from '../page-kit.js';
import { homeView } from './home-view.js';

let cur;

registerAll('File', [['file.new', 'New Document', 'file-plus-2'], ['file.new-choose', 'New Document…', 'file-plus-2'], ['file.open', 'Open Document', 'file-up'], ['file.open-folder', 'Open Folder', 'folder-open']]);

export default {
  id: 'home', title: 'Home', icon: 'house',
  render: () => {
    cur = homeView();
    return page(cur.title, 'Pick up where you left off.',
      cta(['file.new-choose', 'Create New', 'file-plus-2', 1], ['file.open', 'Open Document', 'file-up'], ['file.open-folder', 'Open Folder', 'folder-open']), cur.search, cur.lists);
  },
  after: () => cur.load(),
};
