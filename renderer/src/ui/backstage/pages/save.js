import { page } from '../page-kit.js';
import { saveView } from './save-view.js';

export default { id: 'save', title: 'Save', icon: 'save', render: () => page('Save', 'Write the current document to disk.', saveView('file.save')) };
