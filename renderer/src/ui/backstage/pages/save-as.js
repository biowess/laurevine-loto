import { page } from '../page-kit.js';
import { saveView } from './save-view.js';

export default { id: 'save-as', title: 'Save As', icon: 'save-all', render: () => page('Save As', 'Save under a new name or location, or keep a copy.', saveView('file.save-as')) };
