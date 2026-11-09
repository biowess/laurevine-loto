import { registerAll } from '../../../commands/registry.js';
import { newView } from './new-view.js';

registerAll('File', [['file.new-from-template', 'New from Template', 'file-plus-2']]);

let cur;

export default {
  id: 'new', title: 'New', icon: 'file-plus-2',
  render: () => { cur = newView(); return cur.nodes; },
  after: () => cur.load(),
};
