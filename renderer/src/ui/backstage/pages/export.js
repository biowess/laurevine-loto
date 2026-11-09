import { registerAll } from '../../../commands/registry.js';
import { store } from '../../../state/store.js';
import { uiActions } from '../../../state/slices/ui.js';
import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { runCommand } from '../../shell/panels.js';
import { page, gallery } from '../page-kit.js';

const EXPORT_KINDS = [
  ['PDF Export Studio', 'Typeset PDFs with templates, palettes and columns.', 'file-output'],
  ['HTML Export', 'Standalone page or site folder.', 'globe'],
  ['DOCX Export', 'Word-compatible document.', 'file-type'],
  ['Markdown Package', 'Document with its assets, zipped.', 'package'],
  ['Plain Text', 'Strip all formatting.', 'file-text'],
];

registerAll('Publishing', [['pub.html-dialog', 'HTML Export', 'globe'], ['pub.docx', 'DOCX Export', 'file-type'], ['pub.md-package', 'Markdown Package', 'package'], ['pub.text', 'Plain Text', 'file-text']]);
const IDS = ['pub.pdf-studio', 'pub.html-dialog', 'pub.docx', 'pub.md-package', 'pub.text'];

export default {
  id: 'export', title: 'Export', icon: 'file-output',
  render: () => {
    const hasDoc = !!store.get().documents.activeId;
    if (!hasDoc) {
      return page('Export', 'Publish this document in another form.',
        h('div', { class: 'lv-panel-state' },
          icon('file-x'),
          h('b', {}, 'No document open to export'),
          h('p', {}, 'An active Markdown document is required to export to PDF, HTML, DOCX, or text packages.'),
          h('small', {}, 'What to do: Open or create a document first, then return to Export to choose an export format.')
        ));
    }
    return page('Export', 'Publish this document in another form.',
      gallery(EXPORT_KINDS.map(([n, d, ic], i) => h('button', {
        type: 'button', class: 'md-card', dataset: { cmd: IDS[i] },
        onclick: () => { if (i === 0) store.dispatch(uiActions.backstage(false)); runCommand(IDS[i]); },
      }, icon(ic), h('b', {}, n), h('span', {}, d))), { gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))' }));
  },
};

