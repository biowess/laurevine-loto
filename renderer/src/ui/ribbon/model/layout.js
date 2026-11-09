export const LAYOUT = {
  id: 'layout', label: 'Layout', groups: [
    ['Editing Mode', 'columns-2', 0, '*view.mode-split', 'view.mode-source', 'view.mode-preview', 'view.preview-left', 'view.preview-right'],
    ['Workspace', 'layout-dashboard', 0, 'view.left-sidebar', 'view.right-sidebar', 'view.explorer', 'view.search', 'view.outline', 'view.backlinks', 'view.attachments', 'view.properties', 'group.focus-next'],
    ['Writing Layout', 'align-center', 0, 'view.centered', 'view.full-width', 'view.reading-width', 'view.focus', 'view.focus-scope', 'view.typewriter', 'view.typewriter-position', 'view.content-width', 'view.word-wrap', 'view.line-numbers', 'view.whitespace'],
    ['Presentation', 'palette', 0, '*view.preview-theme|view.pv-editorial/view.pv-academic/view.pv-manuscript/view.pv-literary/view.pv-journal/view.pv-magazine/view.pv-plain/view.pv-modern/view.pv-technical/view.pv-business', 'view.typography', 'view.pv-width', 'view.pv-images', 'view.pv-tables', 'view.pv-code'],
  ],
};

export const VIEW = {
  id: 'view', label: 'View', groups: [
    ['Panels', 'panel-left', 0, 'view.left-sidebar', 'view.explorer', 'view.search', 'view.outline', 'view.backlinks', 'view.attachments', 'view.right-sidebar', 'view.status-bar'],
    ['Display', 'maximize', 0, '*view.fullscreen', 'view.reading-mode', 'view.focus', 'view.distraction-free', 'view.toggle-ribbon', 'view.reset-workspace'],
    ['Navigate', 'compass', 0, '*nav.quick-open', 'palette.open', 'palette.headings', 'search.focus', 'search.next', 'tab.next', 'tab.previous', 'nav.ribbon-access', 'nav.next-region', 'nav.focus-editor', 'nav.focus-outline'],
    ['Appearance', 'sun-moon', 0, '*view.theme-light', '*view.theme-dark', 'view.preview-theme'],
  ],
};

export const TOOLS = {
  id: 'tools', label: 'Tools', groups: [
    ['Document Utilities', 'wand-sparkles', 0, '*tool.formatter', 'tool.line-endings', 'tool.trailing-space', 'tool.indentation', 'tool.empty-headings', 'tool.dialect'],
    ['Workspace', 'folder-cog', 0, '*tool.replace-files', 'tool.rename-files', 'tool.update-links', 'tool.orphaned-assets', 'tool.format-workspace', 'tool.batch-export', 'tool.undo-last', 'tool.recent-ops'],
    ['Export Current Document', 'file-output', 0, '*pub.export-pdf', '*pub.open-studio'],
    ['Publishing', 'book-open-check', 0, '*pub.open-studio', '*pub.export-page', 'pub.text', 'pub.md-package', 'pub.rtf', 'pub.html', 'pub.build-site', 'pub.export-multi', 'pub.collection'],
    ['Customization', 'sliders-horizontal', 0, 'custom.ribbon', 'custom.shortcuts', 'custom.templates', 'custom.themes', 'custom.snippets', 'custom.presets', 'custom.integrations'],
  ],
};
