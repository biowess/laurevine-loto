# Command Coverage

> Generated from `tools/coverage-data.mjs` against the live registry (blueprint sections 4–11, 14, 18).

| Command | Title | Ribbon | Palette | Shortcut | Module | Status |
|---------|-------|--------|---------|----------|--------|--------|
| `file.backstage` | File | — | yes | — | `commands/definitions/app` | ✅ |
| `file.new-choose` | New | — | yes | Ctrl+N | `features/files` | ⚠ feature-only |
| `file.open` | Open | — | yes | Ctrl+O | `features/files` | ⚠ feature-only |
| `file.save` | Save | — | yes | Ctrl+S | `features/files` | ⚠ feature-only |
| `file.save-as` | Save As | — | yes | Ctrl+Shift+S | `features/files` | ⚠ feature-only |
| `edit.cut` | Cut | Home > Clipboard | yes | Ctrl+X | `commands/definitions/document` | ⚠ feature-only |
| `edit.copy` | Copy | Home > Clipboard | yes | Ctrl+C | `commands/definitions/document` | ⚠ feature-only |
| `edit.paste` | Paste | Home > Clipboard | yes | Ctrl+V | `commands/definitions/document` | ⚠ feature-only |
| `edit.paste-plain` | Paste as Plain Text | Home > Clipboard | yes | Ctrl+Shift+V | `commands/definitions/document` | ⚠ feature-only |
| `edit.copy-md` | Copy as Markdown | Home > Clipboard | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `edit.copy-html` | Copy as HTML | Home > Clipboard | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.bold` | Bold | Home > Text | yes | Ctrl+B | `commands/definitions/document` | ⚠ feature-only |
| `fmt.italic` | Italic | Home > Text | yes | Ctrl+I | `commands/definitions/document` | ⚠ feature-only |
| `fmt.strike` | Strikethrough | Home > Text | yes | Ctrl+Shift+X | `commands/definitions/document` | ⚠ feature-only |
| `fmt.code` | Inline Code | Home > Text | yes | Ctrl+` | `commands/definitions/document` | ⚠ feature-only |
| `fmt.link` | Insert Link | Home > Text | yes | Ctrl+K | `commands/definitions/document` | ⚠ feature-only |
| `fmt.edit-link` | Edit Link | Home > Text | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.remove-link` | Remove Link | Home > Text | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.clear` | Clear Formatting | Home > Text | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.heading` | Heading | Home > Structure | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.paragraph` | Paragraph | Home > Structure | yes | Ctrl+0 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.h1` | Heading 1 | Home > Structure | yes | Ctrl+1 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.h2` | Heading 2 | Home > Structure | yes | Ctrl+2 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.h3` | Heading 3 | Home > Structure | yes | Ctrl+3 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.h4` | Heading 4 | Home > Structure | yes | Ctrl+4 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.h5` | Heading 5 | Home > Structure | yes | Ctrl+5 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.h6` | Heading 6 | Home > Structure | yes | Ctrl+6 | `commands/definitions/document` | ⚠ feature-only |
| `fmt.quote` | Blockquote | Home > Structure | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.bullets` | Bulleted List | Home > Structure | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.numbers` | Numbered List | Home > Structure | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.tasks` | Task List | Home > Structure | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `fmt.indent` | Indent | Home > Structure | yes | Tab | `commands/definitions/document` | ⚠ feature-only |
| `fmt.outdent` | Outdent | Home > Structure | yes | Shift+Tab | `commands/definitions/document` | ⚠ feature-only |
| `fmt.rule` | Horizontal Rule | Home > Structure | yes | — | `commands/definitions/document` | ⚠ feature-only |
| `edit.undo` | Undo | Home > Editing | yes | Ctrl+Z | `commands/definitions/editor` | ⚠ feature-only |
| `edit.redo` | Redo | Home > Editing | yes | Ctrl+Shift+Z | `commands/definitions/editor` | ⚠ feature-only |
| `edit.find` | Find | Home > Editing | yes | Ctrl+F | `commands/definitions/document` | ⚠ feature-only |
| `edit.replace` | Replace | Home > Editing | yes | Ctrl+H | `commands/definitions/document` | ⚠ feature-only |
| `edit.find-next` | Find Next | Home > Editing | yes | F3 | `commands/definitions/document` | ⚠ feature-only |
| `edit.find-prev` | Find Previous | Home > Editing | yes | Shift+F3 | `commands/definitions/document` | ⚠ feature-only |
| `edit.goto-line` | Go to Line | Home > Editing | yes | Ctrl+G | `commands/definitions/document` | ⚠ feature-only |
| `view.focus` | Focus Mode | Home > Focus | yes | — | `features/views` | ⚠ feature-only |
| `view.typewriter` | Typewriter Scrolling | Home > Focus | yes | — | `features/views` | ⚠ feature-only |
| `view.centered` | Centered Column | Home > Focus | yes | — | `features/writing` | ⚠ feature-only |
| `view.hide-sidebars` | Hide Sidebars | Home > Focus | yes | — | `commands/definitions/app` | ✅ |
| `doc.stats` | Word Count | Home > Statistics | yes | — | `features/statistics` | ⚠ feature-only |
| `ins.link` | Insert Hyperlink | Insert > Links | yes | — | `features/links` | ⚠ feature-only |
| `ins.file-link` | Link to File | Insert > Links | yes | — | `features/links` | ⚠ feature-only |
| `ins.heading-link` | Link to Heading | Insert > Links | yes | — | `features/links` | ⚠ feature-only |
| `ins.external-link` | External URL | Insert > Links | yes | — | `features/links` | ⚠ feature-only |
| `ins.email` | Email Link | Insert > Links | yes | — | `features/links` | ⚠ feature-only |
| `ins.image` | Insert Image | Insert > Images | yes | — | `features/image` | ⚠ feature-only |
| `ins.image-file` | From File | Insert > Images | yes | — | `features/image` | ⚠ feature-only |
| `ins.image-paste` | Paste Image | Insert > Images | yes | — | `features/image` | ⚠ feature-only |
| `ins.asset` | Local Asset | Insert > Images | yes | — | `features/image` | ⚠ feature-only |
| `ins.table` | Insert Table | Insert > Tables | yes | — | `features/table` | ⚠ feature-only |
| `ins.table-visual` | Table Editor | Insert > Tables | yes | — | `features/table` | ⚠ feature-only |
| `ins.table-from-text` | Text to Table | Insert > Tables | yes | — | `features/table` | ⚠ feature-only |
| `ins.code-block` | Fenced Code Block | Insert > Code | yes | — | `features/code-tools` | ⚠ feature-only |
| `ins.code-lang` | Select Language | Insert > Code | yes | — | `features/code-tools` | ⚠ feature-only |
| `ins.math-inline` | Inline Math | Insert > Code | yes | — | `features/code-tools` | ⚠ feature-only |
| `ins.math-block` | Display Math | Insert > Code | yes | — | `features/code-tools` | ⚠ feature-only |
| `ins.toc` | Table of Contents | Insert > Document Elements | yes | — | `features/toc` | ⚠ feature-only |
| `ins.footnote` | Footnote | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.citation` | Citation | Insert > Document Elements | yes | — | `features/citations` | ⚠ feature-only |
| `ins.mermaid` | Mermaid Diagram | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.callout` | Callout | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.deflist` | Definition List | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.abbr` | Abbreviation | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.special-char` | Special Character | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.datetime` | Date & Time | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.page-break` | Page Break | Insert > Document Elements | yes | — | `features/insert-md` | ⚠ feature-only |
| `ins.snippet` | Snippet | Insert > Document Elements | yes | — | `features/snippets` | ⚠ feature-only |
| `view.mode-split` | Split | Layout > Editing Mode | yes | — | `commands/definitions/app` | ✅ |
| `view.mode-source` | Source | Layout > Editing Mode | yes | — | `commands/definitions/app` | ✅ |
| `view.mode-preview` | Live Preview | Layout > Editing Mode | yes | — | `commands/definitions/app` | ✅ |
| `view.preview-left` | Preview Left | Layout > Editing Mode | yes | — | `commands/definitions/app` | ✅ |
| `view.preview-right` | Preview Right | Layout > Editing Mode | yes | — | `commands/definitions/app` | ✅ |
| `view.left-sidebar` | Left Sidebar | Layout > Workspace | yes | — | `commands/definitions/layout` | ⚠ feature-only |
| `view.right-sidebar` | Right Sidebar | Layout > Workspace | yes | — | `commands/definitions/app` | ✅ |
| `view.explorer` | Explorer | Layout > Workspace | yes | — | `commands/definitions/app` | ✅ |
| `view.search` | Search Panel | Layout > Workspace | yes | — | `features/search` | ⚠ feature-only |
| `view.outline` | Outline | Layout > Workspace | yes | — | `commands/definitions/app` | ✅ |
| `view.backlinks` | Backlinks | Layout > Workspace | yes | — | `features/backlinks` | ⚠ feature-only |
| `view.attachments` | Attachments | Layout > Workspace | yes | — | `features/attachments` | ⚠ feature-only |
| `view.properties` | Properties | Layout > Workspace | yes | — | `features/properties` | ⚠ feature-only |
| `view.full-width` | Full Width | Layout > Writing Layout | yes | — | `features/writing` | ⚠ feature-only |
| `view.reading-width` | Reading Width | Layout > Writing Layout | yes | — | `features/writing` | ⚠ feature-only |
| `view.word-wrap` | Word Wrap | Layout > Writing Layout | yes | — | `commands/definitions/editor` | ⚠ feature-only |
| `view.line-numbers` | Line Numbers | Layout > Writing Layout | yes | — | `commands/definitions/editor` | ⚠ feature-only |
| `view.whitespace` | Whitespace | Layout > Writing Layout | yes | — | `commands/definitions/editor` | ⚠ feature-only |
| `view.preview-theme` | Preview Theme | Layout > Presentation | yes | — | `features/presentation` | ⚠ feature-only |
| `view.typography` | Typography | Layout > Presentation | yes | — | `features/presentation` | ⚠ feature-only |
| `view.pv-width` | Content Width | Layout > Presentation | yes | — | `features/presentation` | ⚠ feature-only |
| `ref.internal-link` | Internal Link | References > Navigation | yes | — | `features/links` | ⚠ feature-only |
| `ref.find` | Find References | References > Navigation | yes | — | `features/links` | ⚠ feature-only |
| `ref.backlinks` | Backlinks | References > Navigation | yes | — | `features/backlinks` | ⚠ feature-only |
| `nav.back` | Go Back | References > Navigation | yes | Alt+Left | `features/navigate` | ⚠ feature-only |
| `nav.forward` | Go Forward | References > Navigation | yes | Alt+Right | `features/navigate` | ⚠ feature-only |
| `ref.broken` | Broken Links | References > Integrity | yes | — | `features/links` | ⚠ feature-only |
| `ref.missing-files` | Missing Files | References > Integrity | yes | — | `features/links` | ⚠ feature-only |
| `ref.unused-assets` | Unused Assets | References > Integrity | yes | — | `features/links` | ⚠ feature-only |
| `ref.update` | Update References | References > Integrity | yes | — | `features/links` | ⚠ feature-only |
| `rev.spellcheck` | Spellcheck | Review > Proofreading | yes | F7 | `features/spellcheck` | ⚠ feature-only |
| `rev.language` | Language | Review > Proofreading | yes | — | `features/spellcheck` | ⚠ feature-only |
| `rev.repeated` | Repeated Words | Review > Proofreading | yes | — | `features/proofread` | ⚠ feature-only |
| `rev.stats` | Writing Stats | Review > Proofreading | yes | — | `features/proofread` | ⚠ feature-only |
| `rev.grammar` | Grammar & Style | Review > Proofreading | yes | — | `features/grammar` | ⚠ feature-only |
| `val.syntax` | Check Markdown | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `val.headings` | Check Headings | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `val.links` | Check Links | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `val.images` | Check Images | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `val.frontmatter` | Check Frontmatter | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `val.tables` | Check Tables | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `val.compat` | Check Compatibility | Review > Validation | yes | — | `features/problems` | ⚠ feature-only |
| `a11y.headings` | Heading Hierarchy | Review > Accessibility | yes | — | `features/a11y` | ⚠ feature-only |
| `a11y.alt` | Alt Text | Review > Accessibility | yes | — | `features/a11y` | ⚠ feature-only |
| `a11y.links` | Link Labels | Review > Accessibility | yes | — | `features/a11y` | ⚠ feature-only |
| `a11y.tables` | Table Headers | Review > Accessibility | yes | — | `features/a11y` | ⚠ feature-only |
| `a11y.contrast` | Color Contrast | Review > Accessibility | yes | — | `features/a11y` | ⚠ feature-only |
| `a11y.report` | Accessibility Report | Review > Accessibility | yes | — | `features/a11y` | ⚠ feature-only |
| `hist.changes` | View Change History | Review > History | yes | — | `features/history` | ⚠ feature-only |
| `hist.compare` | Compare | Review > History | yes | — | `features/comparison` | ⚠ feature-only |
| `hist.restore` | Restore Previous | Review > History | yes | — | `features/history` | ⚠ feature-only |
| `view.status-bar` | Status Bar | View > Panels | yes | — | `commands/definitions/layout` | ⚠ feature-only |
| `view.toggle-ribbon` | Toggle Ribbon | View > Display | yes | Ctrl+F1 | `commands/definitions/layout` | ⚠ feature-only |
| `view.fullscreen` | Full Screen | View > Display | yes | F11 | `features/views` | ⚠ feature-only |
| `view.distraction-free` | Distraction-Free | View > Display | yes | — | `features/views` | ⚠ feature-only |
| `view.reset-workspace` | Reset Workspace | View > Display | yes | — | `commands/definitions/layout` | ⚠ feature-only |
| `view.theme-light` | Light Theme | View > Appearance | yes | — | `commands/definitions/app` | ✅ |
| `view.theme-dark` | Dark Theme | View > Appearance | yes | — | `commands/definitions/app` | ✅ |
| `view.editor-theme` | Editor Theme | View > Appearance | yes | — | `features/themes` | ⚠ feature-only |
| `tool.formatter` | Markdown Formatter | Tools > Document Utilities | yes | — | `features/doc-utilities` | ⚠ feature-only |
| `tool.line-endings` | Normalize Line Endings | Tools > Document Utilities | yes | — | `features/doc-utilities` | ⚠ feature-only |
| `tool.trailing-space` | Remove Trailing Space | Tools > Document Utilities | yes | — | `features/doc-utilities` | ⚠ feature-only |
| `tool.indentation` | Normalize Indentation | Tools > Document Utilities | yes | — | `features/doc-utilities` | ⚠ feature-only |
| `tool.empty-headings` | Clean Empty Headings | Tools > Document Utilities | yes | — | `features/doc-utilities` | ⚠ feature-only |
| `tool.dialect` | Inspect Dialect | Tools > Document Utilities | yes | — | `features/doc-utilities` | ⚠ feature-only |
| `tool.replace-files` | Find & Replace Files | Tools > Workspace | yes | — | `features/workspace-tools` | ⚠ feature-only |
| `tool.rename-files` | Rename Files | Tools > Workspace | yes | — | `features/workspace-tools` | ⚠ feature-only |
| `tool.update-links` | Update References | Tools > Workspace | yes | — | `features/workspace-tools` | ⚠ feature-only |
| `tool.orphaned-assets` | Orphaned Assets | Tools > Workspace | yes | — | `features/workspace-tools` | ⚠ feature-only |
| `tool.batch-export` | Batch Export | Tools > Workspace | yes | — | `features/batch` | ⚠ feature-only |
| `pub.pdf-studio` | PDF Export Studio | Tools > Export | yes | — | `commands/definitions/app` | ✅ |
| `pub.html` | HTML Publishing | Tools > Publishing | yes | — | `features/export` | ⚠ feature-only |
| `custom.ribbon` | Customize Ribbon | Tools > Customization | yes | — | `features/ribbon-custom` | ⚠ feature-only |
| `custom.shortcuts` | Keyboard Shortcuts | Tools > Customization | yes | — | `features/keymap` | ⚠ feature-only |
| `custom.templates` | Manage Templates | Tools > Customization | yes | — | `features/templates` | ⚠ feature-only |
| `custom.themes` | Manage Themes | Tools > Customization | yes | — | `features/themes` | ⚠ feature-only |
| `custom.snippets` | Manage Snippets | Tools > Customization | yes | — | `features/snippets` | ⚠ feature-only |
| `custom.presets` | Export Presets | Tools > Customization | yes | — | `features/studio` | ⚠ feature-only |
| `custom.integrations` | Integrations | Tools > Customization | yes | — | `features/preferences` | ⚠ feature-only |
| `nav.quick-open` | Quick Open | — | yes | Ctrl+E | `features/quickopen` | ⚠ feature-only |
| `tab.close` | Close Tab | — | yes | Ctrl+W | `commands/definitions/editor` | ⚠ feature-only |
| `tab.new` | New Tab | — | yes | — | `commands/definitions/editor` | ⚠ feature-only |
| `palette.open` | Command Palette | — |  | Ctrl+Shift+P | `features/palette` | ⚠ feature-only |

**Coverage:** 13/156 in registry, 143 feature-only (registered at runtime), 0 planned.
