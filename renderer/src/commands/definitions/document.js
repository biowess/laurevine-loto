import { registerAll as R } from '../registry.js';

const H = [1, 2, 3, 4, 5, 6].map((n) => [`fmt.h${n}`, `Heading ${n}`, `heading-${n}`, `Ctrl+${n}`]);

R('Clipboard', [
  ['edit.paste', 'Paste', 'clipboard-paste', 'Ctrl+V'], ['edit.paste-plain', 'Paste as Plain Text', 'clipboard-type', 'Ctrl+Shift+V'],
  ['edit.paste-md', 'Paste as Markdown', 'clipboard-paste'], ['edit.cut', 'Cut', 'scissors', 'Ctrl+X'], ['edit.copy', 'Copy', 'copy', 'Ctrl+C'],
  ['edit.copy-md', 'Copy as Markdown', 'copy'], ['edit.copy-html', 'Copy as HTML', 'code'], ['edit.copy-rich', 'Copy as Rich Text', 'type'],
  ['edit.plain-text', 'Plain Text', 'clipboard-type'],
]);
R('Text', [
  ['fmt.bold', 'Bold', 'bold', 'Ctrl+B'], ['fmt.italic', 'Italic', 'italic', 'Ctrl+I'], ['fmt.strike', 'Strikethrough', 'strikethrough', 'Ctrl+Shift+X'],
  ['fmt.code', 'Inline Code', 'code', 'Ctrl+`'], ['fmt.link', 'Link', 'link', 'Ctrl+K'], ['fmt.edit-link', 'Edit Link', 'link-2'], ['fmt.remove-link', 'Remove Link', 'unlink'], ['fmt.clear', 'Clear Formatting', 'remove-formatting'],
]);
R('Structure', [
  ['fmt.heading', 'Heading', 'heading'], ['fmt.paragraph', 'Paragraph', 'pilcrow', 'Ctrl+0'], ...H,
  ['fmt.quote', 'Quote', 'quote'], ['fmt.bullets', 'Bulleted List', 'list'], ['fmt.numbers', 'Numbered List', 'list-ordered'],
  ['fmt.tasks', 'Task List', 'list-checks'], ['fmt.rule', 'Horizontal Rule', 'minus'], ['fmt.indent', 'Indent', 'indent', 'Tab'], ['fmt.outdent', 'Outdent', 'outdent', 'Shift+Tab'],
]);
R('Editing', [
  ['edit.undo', 'Undo', 'undo-2', 'Ctrl+Z'], ['edit.redo', 'Redo', 'redo-2', 'Ctrl+Shift+Z'], ['edit.find', 'Find', 'search', 'Ctrl+F'],
  ['edit.replace', 'Replace', 'replace', 'Ctrl+H'], ['edit.find-next', 'Find Next', 'chevron-down', 'F3'],
  ['edit.find-prev', 'Find Previous', 'chevron-up', 'Shift+F3'], ['edit.goto-line', 'Go to Line', 'corner-down-right', 'Ctrl+G'],
]);
R('Statistics', [['doc.stats', 'Word Count', 'text']]);

R('Links', [
  ['ins.link', 'Link', 'link'], ['ins.file-link', 'File Link', 'file-symlink'], ['ins.heading-link', 'Heading Link', 'hash'],
  ['ins.external-link', 'External', 'external-link'], ['ins.email', 'Email', 'mail'],
]);
R('Images & Media', [
  ['ins.image', 'Image', 'image'], ['ins.image-file', 'From File', 'file-image'], ['ins.image-paste', 'Paste Image', 'clipboard-paste'],
  ['ins.asset', 'Local Asset', 'folder-input'], ['ins.audio', 'Audio', 'music'], ['ins.video', 'Video', 'video'], ['ins.attach', 'Attachments', 'paperclip'],
]);
R('Tables', [
  ['ins.table', 'Table', 'table'], ['ins.table-3x4', 'Insert 3 × 4', 'table'], ['ins.table-visual', 'Table Editor', 'table-properties'],
  ['ins.table-from-text', 'Text to Table', 'text-select'], ['ins.table-templates', 'Table Templates', 'layout-template'],
]);
R('Document Elements', [
  ['ins.toc', 'Contents', 'list-tree'], ['ins.footnote', 'Footnote', 'superscript'], ['ins.citation', 'Citation', 'quote'],
  ['ins.mermaid', 'Mermaid', 'workflow'], ['ins.callout', 'Callout', 'message-square-warning'], ['ins.deflist', 'Definition List', 'book-a'],
  ['ins.abbr', 'Abbreviation', 'case-sensitive'], ['ins.special-char', 'Symbols', 'omega'], ['ins.datetime', 'Date & Time', 'calendar-clock'],
  ['ins.page-break', 'Page Break', 'file-minus'],
]);

R('Internal Navigation', [
  ['ref.internal-link', 'Internal Link', 'link-2'], ['ref.find', 'Find References', 'text-search'], ['ref.backlinks', 'Backlinks', 'corner-up-left'],
  ['nav.back', 'Back', 'arrow-left', 'Alt+Left'], ['nav.forward', 'Forward', 'arrow-right', 'Alt+Right'],
]);
R('Citations', [['ref.bib-search', 'Search Bibliography', 'library'], ['ref.bibliography', 'Bibliography', 'book-marked'], ['ref.manager', 'Citation Manager', 'library-big']]);
R('Cross-References', [['ref.figure', 'Figure', 'image'], ['ref.table', 'Table', 'table'], ['ref.equation', 'Equation', 'sigma'], ['ref.section', 'Section', 'hash']]);
R('Link Integrity', [
  ['ref.broken', 'Broken Links', 'unlink'], ['ref.missing-files', 'Missing Files', 'file-x'], ['ref.unused-assets', 'Unused Assets', 'file-warning'],
  ['ref.update', 'Update References', 'refresh-cw'],
]);

R('Proofreading', [
  ['rev.spellcheck', 'Spellcheck', 'spell-check', 'F7'], ['rev.language', 'Language', 'languages'], ['rev.lang-en-gb', 'English (UK)', 'languages'],
  ['rev.lang-en-us', 'English (US)', 'languages'], ['rev.lang-fr', 'Français', 'languages'], ['rev.lang-de', 'Deutsch', 'languages'],
  ['rev.repeated', 'Repeated Words', 'repeat'], ['rev.stats', 'Writing Stats', 'bar-chart-3'], ['rev.grammar', 'Grammar & Style', 'pen-line'],
]);
R('Validation', [
  ['val.syntax', 'Markdown Syntax', 'badge-check'], ['val.headings', 'Heading Hierarchy', 'list-tree'], ['val.links', 'Links', 'link'],
  ['val.images', 'Images', 'image'], ['val.frontmatter', 'Frontmatter', 'braces'], ['val.tables', 'Table Structure', 'table'], ['val.compat', 'Compatibility', 'puzzle'],
]);
R('Accessibility', [
  ['a11y.headings', 'Headings', 'heading'], ['a11y.alt', 'Alt Text', 'image'], ['a11y.links', 'Link Labels', 'link'],
  ['a11y.tables', 'Table Headers', 'table'], ['a11y.contrast', 'Contrast', 'contrast'], ['a11y.report', 'Accessibility Report', 'clipboard-check'],
]);
R('History', [['hist.changes', 'Change History', 'history'], ['hist.compare', 'Compare', 'git-compare'], ['hist.restore', 'Restore', 'undo-2']]);
