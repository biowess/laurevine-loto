# Laurevine Loto — Manual QA Checklist

Manual verification checklist for release quality testing, derived from the functional specification, README, and architectural contracts.

Do not run automated suites for these items; perform manual end-to-end verification.

---

## 1. Foundation & Platform Integration

- [ ] **Launch & Window State**: Application opens centered at specified default dimensions (1360x860) with hidden native title bar.
- [ ] **Window State Persistence**: Resize and move window, close, relaunch. Position and size restore accurately across restarts.
- [ ] **Maximized Mode**: Maximizing, un-maximizing, and full screen (`F11`) toggle cleanly without visual glitching.
- [ ] **Themes**: Switching Light, Dark, and System themes in Settings changes background, borders, syntax colors, and native titlebar overlay buttons.
- [ ] **Single Instance Lock**: Launching a second instance focuses the existing window without opening duplicate instances.
- [ ] **CLI & File Associations**: Opening a `.md` file from terminal (`electron . file.md`) or OS file association opens the target file in a tab.

---

## 2. Document Editing

- [ ] **Syntax Highlighting**: CodeMirror 6 highlights Markdown headings, bold, italic, code spans, lists, quotes, and links.
- [ ] **Undo / Redo**: `Ctrl+Z` and `Ctrl+Shift+Z` correctly undo and redo character inputs, block operations, and format toggles.
- [ ] **Inline Formatting**: Selecting text and pressing `Ctrl+B`, `Ctrl+I`, or `Ctrl+\`` toggles syntax marks around the selection.
- [ ] **Paragraph & Heading Shortcuts**: `Ctrl+0` through `Ctrl+6` correctly transform current line between paragraph and H1–H6.
- [ ] **Mathematics (KaTeX)**: Inline `$x$` and display `$$...$$` render with KaTeX in the live preview.
- [ ] **Diagrams (Mermaid)**: Mermaid code blocks render interactive SVG diagrams; syntax errors show inline error banners.
- [ ] **Table Editor**: Inserting a table creates valid Markdown pipes and dashes; visual table editor edits cells smoothly.
- [ ] **Table of Contents**: Inserting `ins.toc` inserts managed comment markers; headings are listed and update dynamically.
- [ ] **Spellcheck**: Misspelled words display squiggly underlines; right-click menu offers language suggestions.

---

## 3. Workspace & Navigation

- [ ] **Open Folder**: Opening a folder populates the Explorer file tree with directory hierarchy and icons.
- [ ] **File Tree Operations**: New File, New Folder, Rename, Duplicate, and Move to Trash work via tree context menu.
- [ ] **Ignored Files**: Dotfiles and `.git`/`node_modules` are excluded from display unless toggled in settings.
- [ ] **Quick Open (`Ctrl+E`)**: Fuzzy searching by filename opens matching workspace files.
- [ ] **Workspace Search (`Ctrl+Shift+F`)**: Text search locates matches across files; case, word, and regex filters work; clicking a hit navigates to line.
- [ ] **Backlinks Panel**: Documents referencing the active file appear under Linked Mentions with preview snippets.
- [ ] **Outline Panel**: Document headings list in tree structure; clicking any heading scrolls editor and preview.
- [ ] **Problems Panel**: Syntax, broken link, alt text, and heading hierarchy issues appear with line numbers and jump-to-source.

---

## 4. Persistence & Recovery

- [ ] **Dirty Indicators**: Editing a document displays dirty dot in tab and titlebar; saving removes the dot.
- [ ] **Atomic Save**: Saving writes file without data loss; file modification time updates on disk.
- [ ] **External Change Detection**: Modifying a file in an external editor triggers reload prompt or conflict resolution.
- [ ] **Version History**: Each manual or autosave creates a snapshot in `Change History`; line diffs display accurately.
- [ ] **Version Restore**: Selecting an older version and clicking "Restore" replaces current document content.
- [ ] **Crash Recovery**: Terminating application process with unsaved changes prompts Recovery dialog on relaunch to restore text.

---

## 5. Export & Publishing

- [ ] **Export Studio Live Preview**: Launching Studio displays Paged.js paginated view with page numbers and margins.
- [ ] **Template Switching**: Switching between Editorial, Academic, Technical, and Minimalist templates re-renders layout.
- [ ] **Color Palettes**: Applying color palettes alters primary, heading, accent, and table styles; contrast warnings check WCAG rules.
- [ ] **Multi-Column Layout**: Two and three-column options render balanced text columns with column dividers.
- [ ] **Preflight Warnings**: Warnings identify overset content, orphan headings, missing fonts, or wide tables.
- [ ] **PDF Output**: Clicking "Export PDF" prompts native save dialog and outputs print-ready PDF file.
- [ ] **HTML & Plain Text Export**: Exporting standalone HTML produces self-contained file with embedded styles; plain text strips syntax.
- [ ] **DOCX Export**: DOCX export functions when Pandoc is configured in Preferences > Integrations.

---

## 6. Migration & Tools

- [ ] **Migration Scan**: Selecting an Obsidian vault or folder of notes analyzes links, frontmatter, and attachments non-destructively.
- [ ] **Report Inspection**: Scan report lists detected Wikilinks, Dataview blocks, callouts, and frontmatter tags.
- [ ] **Import Execution**: Executing import (In-Place or Copy) creates valid workspace structure and logs actions.
- [ ] **Transaction Rollback**: If enabled, migration actions can be reviewed and undone cleanly.

---

## 7. Release & Security Guardrails

- [ ] **Sandboxed Renderer**: DevTools console confirms `window.require`, `process`, and `Buffer` are undefined in renderer.
- [ ] **CSP Enforcement**: Injecting `<script>` or external resource URLs in Markdown preview is blocked by CSP.
- [ ] **Link Interception**: Clicking web hyperlinks (`https://...`) opens the URL in default external browser, not inside the app.
- [ ] **Offline Operation**: App functions fully with network disconnected.
- [ ] **About Dialog**: Displays Version 1.0.0, Electron, Chromium, and Node.js versions; links to Third-Party License Notices.
