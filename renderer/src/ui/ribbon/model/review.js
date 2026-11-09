export const REFERENCES = {
  id: 'references', label: 'References', groups: [
    ['Internal Navigation', 'link-2', 0, '*ref.internal-link', 'ins.heading-link', 'ins.file-link', 'link.open-new-tab', 'ref.find', 'ref.backlinks', 'nav.back', 'nav.forward'],
    ['Citations', 'quote', 0, '*ins.citation', 'ref.bib-search', 'ref.bibliography', 'ref.manager'],
    ['Cross-References', 'at-sign', 0, 'ref.figure', 'ref.table', 'ref.equation', 'ref.section'],
    ['Link Integrity', 'shield-check', 0, '*ref.broken', 'ref.missing-files', 'ref.unused-assets', 'ref.update'],
  ],
};

export const REVIEW = {
  id: 'review', label: 'Review', groups: [
    ['Proofreading', 'spell-check', 0, '*rev.spellcheck', 'rev.language', 'rev.dictionary', 'rev.repeated', 'rev.stats', 'rev.grammar', 'grammar.doc-opt-out'],
    ['Validation', 'badge-check', 0, 'val.syntax', 'val.headings', 'val.links', 'val.images', 'val.frontmatter', 'val.tables', 'val.compat', 'problems.fix-here'],
    ['Accessibility', 'accessibility', 0, 'a11y.headings', 'a11y.alt', 'a11y.links', 'a11y.tables', 'a11y.contrast', '*a11y.report'],
    ['History', 'history', 0, '*hist.changes', 'hist.compare', 'hist.restore', 'cmp.with-saved', 'cmp.with-file', 'cmp.with-tab', 'cmp.next', 'cmp.prev'],
  ],
};
