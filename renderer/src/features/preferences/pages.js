import { preferencePages as P } from './registry.js';

import { privacyPage } from './privacy.js';
import { searchPage } from './search.js';
import { recoveryPage } from './recovery.js';
import { integrationSections, integrationsPage } from './integrations.js';
import { pandocSection } from './pandoc-section.js';
import { themePickerSection } from './theme-picker.js';

const S = (title, category) => ({ title, category });
const K = (title, ...keys) => ({ title, keys });

export function registerDefaultPages() {
  P.register({ id: 'appearance', title: 'Appearance', icon: 'palette', sections: [themePickerSection, K('Theme and scale', 'appearance.theme', 'appearance.density', 'appearance.zoom'), S('Profile', 'Profile')] });
  P.register({ id: 'editor', title: 'Editor', icon: 'pen-line', sections: [
    K('Font', 'editor.fontFamily', 'editor.fontSize', 'editor.lineHeight', 'editor.caretStyle'),
    K('Editing', 'editor.tabSize', 'editor.indentUnit', 'editor.wordWrap', 'editor.lineNumbers', 'editor.showWhitespace', 'editor.spellcheck', 'editor.autoPair', 'editor.pasteMode', 'editor.pasteUrlAsLink', 'editor.syncScroll', 'editor.caretMarker'),
    K('Writing', 'editor.layoutWidth', 'editor.contentWidth', 'editor.contentWidthUnit', 'editor.focusMode', 'editor.focusScope', 'editor.typewriter', 'editor.typewriterPosition')] });
  P.register({ id: 'markdown', title: 'Markdown', icon: 'file-text', sections: [S('Markdown', 'Markdown'), K('Statistics', 'stats.readingWpm', 'stats.excludeFrontmatter', 'stats.excludeCode')] });
  P.register({ id: 'typography', title: 'Typography', icon: 'type', sections: [S('Preview', 'Preview')] });
  P.register({ id: 'files', title: 'File Management', icon: 'folder-open', sections: [S('New files', 'Files'), K('Explorer', 'explorer.sortBy', 'explorer.showHidden', 'explorer.confirmDelete'), K('Templates', 'templates.newAction'), K('External changes', 'files.onExternalChange')] });
  P.register({ id: 'accessibility', title: 'Accessibility', icon: 'accessibility', sections: [K('Motion, focus and zoom', 'accessibility.reducedMotion', 'accessibility.focusRing', 'appearance.zoom')] });
  P.register({ id: 'privacy', title: 'Privacy', icon: 'shield-check', render: privacyPage });
  P.register({ id: 'search', title: 'Search', icon: 'search', render: searchPage });
  P.register({ id: 'recovery', title: 'Autosave and Recovery', icon: 'rotate-ccw', render: recoveryPage });
  P.register({ id: 'export', title: 'Export', icon: 'file-output', sections: [
    K('General & PDF', 'export.defaultPreset', 'export.destination', 'export.filenamePattern', 'export.openAfterExport', 'export.preflightStrictness', 'export.embedFonts'),
    K('HTML defaults', 'export.htmlPalette', 'export.htmlHeadingFont', 'export.htmlBodyFont', 'export.htmlToc', 'export.htmlWatermark'),
  ] });
  integrationSections.register(pandocSection);
  P.register({ id: 'integrations', title: 'Integrations', icon: 'plug', sections: [
    K('Pandoc', 'integrations.pandocPath', 'integrations.pandocTimeout'),
    K('External links', 'integrations.externalLinkCheck', 'integrations.externalLinkTimeout'),
    K('Bibliography', 'bibliography.defaultPath', 'bibliography.style'),
  ], render: integrationsPage });
}

