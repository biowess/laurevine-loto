// Group: [name, icon, iconsPerRow (0 = small stacks of 3), ...items]. Item: "[*]command.id[|menu.id/-/menu.id]" (* = large button).
export const HOME = {
  id: 'home', label: 'Home', groups: [
    ['Clipboard', 'clipboard', 0, '*edit.paste|edit.paste/edit.paste-plain/edit.paste-md', 'edit.cut', 'edit.copy|edit.copy/edit.copy-md/edit.copy-html/edit.copy-rich', 'edit.plain-text'],
    ['Text', 'type', 3, 'fmt.bold', 'fmt.italic', 'fmt.strike', 'fmt.code', 'fmt.link', 'fmt.clear'],
    ['Structure', 'heading', 4, '*fmt.heading|fmt.paragraph/-/fmt.h1/fmt.h2/fmt.h3/fmt.h4/fmt.h5/fmt.h6', 'fmt.quote', 'fmt.bullets', 'fmt.numbers', 'fmt.tasks', 'fmt.rule', 'fmt.indent', 'fmt.outdent'],
    ['Editing', 'search', 4, 'edit.undo', 'edit.redo', 'edit.find', 'edit.replace', 'edit.find-next', 'edit.find-prev', 'edit.goto-line', 'edit.select-all'],
    ['Focus', 'focus', 0, '*view.focus', 'view.typewriter', 'view.centered', 'view.hide-sidebars'],
    ['Statistics', 'bar-chart-3', 0, '*doc.stats'],
  ],
};

export const INSERT = {
  id: 'insert', label: 'Insert', groups: [
    ['Links', 'link', 0, '*ins.link', 'fmt.edit-link', 'fmt.remove-link', 'ins.file-link', 'ins.heading-link', 'ins.external-link', 'ins.email'],
    ['Images & Media', 'image', 0, '*ins.image', 'ins.image-file', 'ins.image-paste', 'ins.asset', 'ins.audio', 'ins.video', 'ins.attach'],
    ['Tables', 'table', 0, '*ins.table|ins.table-3x4/ins.table-custom/-/ins.table-visual/ins.table-from-text/ins.table-templates', 'ins.table-visual', 'ins.table-from-text', 'ins.table-templates'],
    ['Code & Mathematics', 'code', 0, '*ins.code-block', 'fmt.code', 'ins.code-lang', 'ins.code-file', 'ins.code-copy', 'ins.math-inline', 'ins.math-block', 'ins.equation-editor'],
    ['Document Elements', 'puzzle', 0, '*ins.toc', 'ins.snippet', 'ins.footnote', 'ins.citation', 'ins.mermaid', 'ins.callout', 'ins.deflist', 'ins.abbr', 'ins.html-block', 'ins.special-char', 'ins.datetime', 'fmt.rule', 'ins.page-break'],
  ],
};
