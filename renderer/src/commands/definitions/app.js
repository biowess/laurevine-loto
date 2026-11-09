import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { register, registerAll as R } from '../registry.js';
import { openPanel } from '../../ui/shell/panels.js';
import { nextTheme } from '../../core/window-chrome.js';

const ui = () => store.get().ui;
const send = (a) => { store.dispatch(a); };
const mode = (id, title, icon, m) => register({ id, title, icon, group: 'Editing Mode', checked: () => ui().mode === m, run: () => send(uiActions.mode(m)) });
const panel = (id, title, icon, side, view) => register({
  id, title, icon, group: 'Panels', checked: () => { const p = ui().panels[side]; return p.open && p.view === view; },
  run: () => openPanel(side, view, true),
});
const theme = (id, title, icon, t) => register({ id, title, icon, group: 'Appearance', checked: () => ui().theme === t, run: () => send(uiActions.theme(t)) });

mode('view.mode-split', 'Split', 'columns-2', 'split');
mode('view.mode-source', 'Source', 'code-xml', 'source');
mode('view.mode-preview', 'Live Preview', 'eye', 'preview');
mode('view.preview-left', 'Preview Left', 'panel-left', 'previewLeft');
mode('view.preview-right', 'Preview Right', 'panel-right', 'previewRight');
register({ id: 'view.split-reset', title: 'Reset Split Ratio', icon: 'columns-2', group: 'Editing Mode', run: () => send(uiActions.splitRatio(0.5)) });
panel('view.explorer', 'Explorer', 'folder-tree', 'left', 'files');
panel('view.outline', 'Outline', 'list-tree', 'right', 'outline');
register({ id: 'view.right-sidebar', title: 'Right Sidebar', icon: 'panel-right', group: 'Panels', checked: () => ui().panels.right.open, run: () => send(uiActions.panel('right')) });
register({
  id: 'view.hide-sidebars', title: 'Hide Sidebars', icon: 'panel-left-close', group: 'Focus',
  run: () => store.batch(() => { send(uiActions.panel('left', { open: false })); send(uiActions.panel('right', { open: false })); }),
});
theme('view.theme-light', 'Light', 'sun', 'light');
theme('view.theme-dark', 'Dark', 'moon', 'dark');
theme('view.theme-system', 'System', 'monitor', 'system');
register({ id: 'view.theme-cycle', title: 'Cycle Theme', icon: 'sun-moon', group: 'Appearance', run: () => send(uiActions.theme(nextTheme(ui().theme))) });
register({ id: 'file.backstage', title: 'File', icon: 'file-text', group: 'File', run: () => send(uiActions.backstage(true, 'home')) });
register({ id: 'pub.pdf-studio', title: 'PDF Export Studio', icon: 'file-output', group: 'Publishing', run: () => { send(uiActions.studio(true)); } });

panel('view.search', 'Search', 'search', 'left', 'search');
panel('view.backlinks', 'Backlinks', 'link-2', 'left', 'backlinks');
panel('view.attachments', 'Attachments', 'paperclip', 'left', 'attachments');
panel('view.properties', 'Properties', 'info', 'right', 'properties');
R('Writing Layout', [
  ['view.centered', 'Centered Column', 'align-center'], ['view.full-width', 'Full Width', 'move-horizontal'], ['view.reading-width', 'Reading Width', 'book-open'],
  ['view.typewriter', 'Typewriter', 'keyboard'], ['view.word-wrap', 'Word Wrap', 'wrap-text'], ['view.line-numbers', 'Line Numbers', 'list-ordered'],
  ['view.whitespace', 'Whitespace', 'pilcrow'],
]);
R('Presentation', [
  ['view.preview-theme', 'Preview Theme', 'palette'], ['view.pv-editorial', 'Editorial', 'palette'], ['view.pv-academic', 'Academic', 'palette'], 
  ['view.pv-manuscript', 'Manuscript', 'palette'], ['view.pv-literary', 'Literary', 'palette'], ['view.pv-journal', 'Journal', 'palette'], ['view.pv-magazine', 'Magazine', 'palette'], 
  ['view.pv-plain', 'Plain', 'palette'], ['view.pv-modern', 'Modern', 'palette'], 
  ['view.pv-technical', 'Technical', 'palette'], ['view.pv-business', 'Business', 'palette'],
  ['view.typography', 'Typography', 'type'], ['view.pv-width', 'Content Width', 'ruler'],
  ['view.pv-images', 'Images', 'image'], ['view.pv-tables', 'Tables', 'table'], ['view.pv-code', 'Code', 'code'],
]);
R('Display', [
  ['view.fullscreen', 'Full Screen', 'maximize', 'F11'], ['view.reading-mode', 'Reading Mode', 'book-open'],
  ['view.distraction-free', 'Distraction-Free', 'eye-off'], ['view.reset-workspace', 'Reset Workspace', 'rotate-ccw'],
]);
R('Document Utilities', [
  ['tool.formatter', 'Format Markdown', 'wand-sparkles'], ['tool.line-endings', 'Line Endings', 'corner-down-left'], ['tool.trailing-space', 'Trailing Space', 'eraser'],
  ['tool.indentation', 'Indentation', 'indent'], ['tool.empty-headings', 'Empty Headings', 'heading'], ['tool.dialect', 'Inspect Dialect', 'scan-search'],
]);
R('Workspace Tools', [
  ['tool.replace-files', 'Find and Replace Across Files', 'files'], ['tool.rename-files', 'Rename Files', 'file-pen'], ['tool.update-links', 'Update Internal References', 'refresh-cw'],
  ['tool.orphaned-assets', 'Inspect Orphaned Assets', 'file-warning'], ['tool.format-workspace', 'Format Workspace Files', 'wand-sparkles'], ['tool.batch-export', 'Batch Export', 'package'],
]);
R('Publishing', [['pub.html', 'HTML Publishing', 'globe'], ['pub.export-multi', 'Export Multiple', 'files'], ['pub.collection', 'Collection', 'library']]);
R('Customization', [
  ['custom.ribbon', 'Ribbon', 'layout-panel-top'], ['custom.shortcuts', 'Shortcuts', 'keyboard'], ['custom.templates', 'Templates', 'layout-template'],
  ['custom.themes', 'Themes', 'palette'], ['custom.snippets', 'Snippets', 'scissors'], ['custom.presets', 'Presets', 'save'], ['custom.integrations', 'Integrations', 'plug'],
]);