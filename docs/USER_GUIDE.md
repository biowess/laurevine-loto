# Laurevine Loto — User Guide

Concise guide covering everyday editing, workspace organization, and publishing workflows in Laurevine Loto.

---

## 1. Workspaces & File Management

### Opening a Workspace
- Select **File > Open Folder** (`Ctrl+O`) or choose **Open Workspace** from Backstage.
- The **Explorer** panel displays your folder tree, honoring `.gitignore` and hiding system metadata.
- Right-click anywhere in the Explorer tree to create files, create folders, rename, duplicate, or delete items to the OS Trash.

### Multi-Tab Editing
- Click any file to open it in a tab. Double-click pins temporary tabs.
- Switch between adjacent tabs with `Ctrl+PageDown` / `Ctrl+PageUp` or `Alt+1` through `Alt+9`.
- Unsaved modifications are marked with a dirty indicator (`•`). Close guards prevent accidental closing when unsaved changes exist.

---

## 2. Document Editing

### Markdown Profiles
- Laurevine Loto supports CommonMark, GitHub Flavored Markdown (GFM), and Laurevine Extended profiles.
- Switch the active profile via the Mode bar at the top right of the editor.

### Typography & Structure
- Format text with standard shortcuts: `Ctrl+B` (Bold), `Ctrl+I` (Italic), `Ctrl+\`` (Code), and `Ctrl+0` through `Ctrl+6` for headings.
- Create blockquotes with `> `, unordered lists with `- ` or `* `, and ordered lists with `1. `.
- Create interactive task lists with `- [ ] ` and `- [x] `.

### Mathematical Notation & Diagrams
- **Inline math**: Surround formulas with single dollar signs: `$E = mc^2$`.
- **Display math**: Surround multi-line equations with double dollar signs:
  ```latex
  $$
  \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
  $$
  ```
- **Mermaid diagrams**: Use ```` ```mermaid ```` code blocks for flowcharts, sequence diagrams, and class models.

---

## 3. Tables

### Creating and Editing Tables
- Insert a table via ribbon **Insert > Table** or shortcut `ins.table`.
- Open the visual **Table Editor** (`ins.table-visual`) to edit rows and columns in an interactive spreadsheet grid.
- Format Markdown tables directly:
  ```markdown
  | Item | Quantity | Price |
  | :--- | :------: | ----: |
  | Notebook | 2 | $12.00 |
  | Pen | 5 | $4.50 |
  ```
- Align columns using colons in the separator row (`:---` left, `:---:` center, `---:` right).

---

## 4. Table of Contents (TOC)

### Generating a Dynamic TOC
- Insert an automatic Table of Contents via **Insert > Contents** (`ins.toc`).
- A managed block is placed into your document:
  ```markdown
  <!-- laurevine:toc:start -->
  - [Section 1](#section-1)
    - [Subsection 1.1](#subsection-11)
  <!-- laurevine:toc:end -->
  ```
- The TOC automatically stays synchronized as you add, rename, or reorder headings in the document.

---

## 5. PDF Export Studio

### Launching the Studio
- Select **File > Export > PDF Export Studio** (`pub.open-studio`).
- The studio provides a live, paginated preview of your document typeset with Paged.js.

### Studio Customization
- **Templates**: Choose among crafted layouts (Editorial, Academic, Technical, Minimalist).
- **Typography**: Set body and heading typefaces, font size, line height, and paragraph spacing.
- **Palettes**: Select curated color schemes with automatic WCAG contrast validation.
- **Columns**: Select one, two, or three-column layouts with column separators and balanced heights.
- **Running Headers & Footers**: Configure page numbering schemes, document title headers, and chapter marks.
- **Cover Pages**: Add full-bleed or framed title pages with metadata.
- **Preflight Inspection**: Run automatic checks for overset text, orphans, missing fonts, and heading hierarchy before printing.

---

## 6. History & Crash Recovery

### Version History
- Every manual save and autosave creates a content-addressed snapshot in your local user data directory.
- Open **File > Change History** to browse versions, view line diffs, toggle rendered preview, and restore past versions.
- Important milestones can be pinned to prevent automatic retention pruning.

### Crash Recovery
- If the application closes unexpectedly, dirty documents are preserved in the recovery store.
- Upon relaunch, the **Recover Unsaved Documents** dialog prompts you to compare recovered text with the on-disk file and restore your work.

---

## 7. Migration Center

### Importing Notes
- Navigate to **Backstage > Migration Center**.
- Choose a source folder or ZIP archive containing notes from Obsidian, Notion, or plain Markdown.
- Laurevine Loto runs a non-destructive dry scan, analyzing:
  - Wikilinks and standard Markdown links
  - Frontmatter metadata schemas
  - Callout syntax and media embeds
  - Unsupported plugin tags
- Choose an import strategy: **In-Place**, **Copy to Directory**, or **Create New Workspace**.
- Review the compatibility report and apply transformations with full rollback support.
