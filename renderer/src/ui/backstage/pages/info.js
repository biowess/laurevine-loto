import { page, rows } from '../page-kit.js';

const DEFAULT_INFO = [
  ['hard-drive', 'Location', 'Not saved yet'],
  ['calendar', 'Modified', '—'],
  ['text', 'Words', '0'],
  ['image', 'Assets', '0'],
  ['link', 'Links', '0'],
];

export default {
  id: 'info', title: 'Document Information', icon: 'info',
  render: () => page('Document Information', 'Active Document', rows(DEFAULT_INFO)),
};
