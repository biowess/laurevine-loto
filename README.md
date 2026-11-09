<p align="center">
  <img src="assets/banner.png" alt="Laurevine Loto banner" width="80%" />
</p>

<h1 align="center">Laurevine Loto</h1>

<p align="center">
  <strong>A local-first Markdown editor with a ribbon interface, a live preview, and a paginated PDF Export Studio.</strong>
</p>

<p align="center">
  Laurevine Loto (Loto for short) is a desktop application for people who write in Markdown and need finished documents. Every document is an ordinary <code>.md</code> file in an ordinary folder, so nothing is hidden and nothing locks you in. Loto adds what a plain text editor lacks: a workspace with link checking, citations, local version history, accessibility checks, and publishing to PDF, HTML, DOCX and more. Everything runs on your machine, and the app sends no telemetry.
</p>




<p align="center">
  <img src="https://img.shields.io/badge/Electron-493A26?style=flat-square&logo=electron&logoColor=D0B98F" alt="Electron" />
  <img src="https://img.shields.io/badge/Node.js-493A26?style=flat-square&logo=nodedotjs&logoColor=D0B98F" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-493A26?style=flat-square&logo=javascript&logoColor=D0B98F" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-493A26?style=flat-square&logo=html5&logoColor=D0B98F" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-493A26?style=flat-square&logo=css3&logoColor=D0B98F" alt="CSS3" />
  <img src="https://img.shields.io/badge/CodeMirror_6-493A26?style=flat-square" alt="CodeMirror 6" />
  <img src="https://img.shields.io/badge/markdown--it-493A26?style=flat-square&logo=markdown&logoColor=D0B98F" alt="markdown-it" />
  <img src="https://img.shields.io/badge/KaTeX-493A26?style=flat-square&logo=katex&logoColor=D0B98F" alt="KaTeX" />
  <img src="https://img.shields.io/badge/Mermaid-493A26?style=flat-square&logo=mermaid&logoColor=D0B98F" alt="Mermaid" />
  <img src="https://img.shields.io/badge/Paged.js-493A26?style=flat-square" alt="Paged.js" />
  <img src="https://img.shields.io/badge/Pandoc_optional-493A26?style=flat-square" alt="Pandoc, optional" />
</p>



<p align="center">
  <img src="https://img.shields.io/badge/EXPORT-PDF%20%7C%20HTML%20%7C%20DOCX%20%7C%20RTF-665238?style=flat-square&labelColor=302719" alt="Export formats" />
  <img src="https://img.shields.io/badge/PLATFORMS-Windows%20%7C%20Linux-665238?style=flat-square&labelColor=302719" alt="Platforms" />
  <a href="LICENSE.txt">
    <img src="https://img.shields.io/badge/LICENSE-Apache%202.0-665238?style=flat-square&labelColor=302719" alt="Apache 2.0" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/biowess/laurevine-loto/releases/latest">
    <img src="https://img.shields.io/github/v/release/biowess/laurevine-loto?style=flat-square&label=RELEASE&labelColor=302719&color=806943" alt="Latest release" />
  </a>
  <a href="https://github.com/biowess/laurevine-loto/issues">
    <img src="https://img.shields.io/github/issues/biowess/laurevine-loto?style=flat-square&label=ISSUES&labelColor=302719&color=806943" alt="Open issues" />
  </a>
</p>




---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Workspace and Source Editing](#workspace-and-source-editing)
  - [The Ribbon](#the-ribbon)
  - [Markdown Authoring](#markdown-authoring)
  - [Projects, Files and Workspaces](#projects-files-and-workspaces)
  - [Search and Workspace Tools](#search-and-workspace-tools)
  - [Links and Link Integrity](#links-and-link-integrity)
  - [Citations, Bibliography and Cross-References](#citations-bibliography-and-cross-references)
  - [Review, Validation and Accessibility](#review-validation-and-accessibility)
  - [History, Comparison and Recovery](#history-comparison-and-recovery)
  - [Migration Center](#migration-center)
  - [Publishing and Export](#publishing-and-export)
  - [Page Layout and Typography](#page-layout-and-typography)
  - [Preferences and Customization](#preferences-and-customization)
  - [Privacy and Security](#privacy-and-security)
- [Theme Showcase](#theme-showcase)
- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [First Launch](#first-launch)
  - [Your First Document](#your-first-document)
- [Usage Guides](#usage-guides)
  - [Publishing a PDF with the Export Studio](#publishing-a-pdf-with-the-export-studio)
  - [Citing Sources](#citing-sources)
  - [Restoring an Earlier Version](#restoring-an-earlier-version)
  - [Moving Notes into Loto](#moving-notes-into-loto)
  - [Renaming and Reorganizing Files](#renaming-and-reorganizing-files)
- [Templates and Document Creation](#templates-and-document-creation)
- [Architecture and Technology Stack](#architecture-and-technology-stack)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [License and Acknowledgements](#license-and-acknowledgements)
- [Contributing and Support](#contributing-and-support)
- [Closing Note](#closing-note)

---

## Overview

Loto is a single-window desktop application built on Electron. The window has a title bar, a ribbon across the top, a left sidebar (Explorer, Search, Attachments), a tabbed work area that holds the Markdown **source** beside a **live preview**, an optional right sidebar (Outline, Properties, Problems) and a status bar. A **File** tab opens a full-window Backstage view for creating, opening, saving, exporting, printing and configuring. The ribbon has seven tabs: Home, Insert, Layout, References, Review, View and Tools.

The central idea is that the application works on your files, not on a database of its own. Documents are plain Markdown. Ribbon buttons write Markdown into the source. Version history, search indexes and settings live in your user profile, and exports are built from the same source you edit. You can leave at any time and keep everything.

**Who it is for.** Writers and students who want a focused editor with structure tools. Researchers who cite sources. Engineers and technical writers who maintain READMEs, changelogs and documentation. Anyone with a folder of notes who needs to check links, tidy structure and publish a clean PDF or web page.

**What it handles.**

- Single documents and whole folders opened as workspaces, with recent workspaces and session restore.
- Four Markdown profiles: CommonMark, GitHub Flavored, Extended and Knowledge.
- Math with KaTeX, diagrams with Mermaid, callouts, footnotes, definition lists, task lists and Pandoc-style citations.
- Export to PDF, HTML, DOCX, RTF, plain text and a Markdown package, plus multi-document collections.
- Left-to-right and right-to-left documents, with an Arabic-oriented PDF template and a text direction setting.

**Distinctive characteristics.**

- A **PDF Export Studio** with 19 templates, 13 settings pages, a live paginated preview and preflight warnings.
- **Workspace-wide operations** such as find and replace across files, batch rename and reference updates, each reversible with a single undo.
- **Link Integrity** tools for broken links, missing files and unused assets, and a Backlinks panel.
- **Local version history** with compare, pin and restore, plus **crash recovery** for unsaved work.
- A **Migration Center** that reports what will change before anything is imported.
- **32 interface themes**, a customizable ribbon and remappable shortcuts.
- **Local by design.** The only features that can use the network are opt-in (see [Privacy and Security](#privacy-and-security)).

<p align="center">
  <img src="assets/screenshots/01.png" alt="Screenshot 01" />
</p>

---

## Features

### Workspace and Source Editing

The source pane is a CodeMirror 6 editor with Markdown syntax highlighting. It offers optional line numbers, word wrap and visible whitespace, bracket matching, active line highlighting, automatic pairing of brackets and quotes, configurable tab width and indent unit, and `Ctrl+D` to select the next occurrence of the current selection. Paste behaviour is configurable, including pasting a URL over selected text as a link. Synchronized scrolling between source and preview is available as an opt-in setting.

<p align="center">
  <img src="assets/screenshots/02.png" alt="Screenshot 02" />
</p>

**Editing modes.** Choose Split, Source or Live Preview from **Layout → Editing Mode**, and dock the preview to the left or right of the source.

**Command Palette.** `Ctrl+Shift+P` searches every command, remembers the ones you used recently, and shows each command's shortcut. **Go to Heading** jumps within the current document, and **Quick Open** (`Ctrl+E`) finds files in the workspace.

<p align="center">
  <img src="assets/screenshots/06.png" alt="Screenshot 06" />
</p>

**Focus and writing layout.** Focus Mode dims everything except the active paragraph or line (set by Focus Scope), Typewriter keeps the caret at a fixed position on screen, and Centered Column, Reading Width and Full Width control the text measure. Hide Sidebars and Distraction-Free remove the surrounding chrome.

<p align="center">
  <img src="assets/screenshots/04.png" alt="Screenshot 04" />
</p>

**Tabs and editor groups.** Open any number of documents in tabs and split the editor to the right or down to work on two documents side by side. `Ctrl+Alt+Right` moves focus to the other group.

<p align="center">
  <img src="assets/screenshots/05.png" alt="Screenshot 05" />
</p>

**Outline and statistics.** The Outline panel lists headings and follows the document. The Statistics command and the Writing Statistics tool report word counts and estimated reading time, with options to exclude front matter and code.

### The Ribbon

The ribbon is organised into tabs and groups, and the controls act on the selection or at the caret. The **File** tab opens the Backstage view (see [Projects, Files and Workspaces](#projects-files-and-workspaces)).

| Tab | Groups | Representative actions |
| --- | --- | --- |
| **Home** | Clipboard, Text, Structure, Editing, Focus, Statistics | Paste and copy variants, bold, italic, strikethrough, inline code, links, headings 1 to 6, quotes, bullet, numbered and task lists, rules, indent, undo, redo, find, replace, go to line, Focus Mode, Typewriter, Centered Column |
| **Insert** | Links, Images & Media, Tables, Code & Mathematics, Document Elements | Heading, file, external and e-mail links, images, audio and video, Table Editor, fenced code, inline and display math, Equation Editor, contents, snippets, footnotes, citations, Mermaid, callouts, definition lists, abbreviations, page breaks |
| **Layout** | Editing Mode, Workspace, Writing Layout, Presentation | Split, Source and Live Preview, sidebar panels, word wrap, line numbers, whitespace, reading width, preview theme and typography |
| **References** | Internal Navigation, Citations, Cross-References, Link Integrity | Internal links, Find References, backlinks, Citation, Bibliography, Citation Manager, figure, table, equation and section references, Broken Links, Missing Files, Unused Assets |
| **Review** | Proofreading, Validation, Accessibility, History | Spellcheck, language, custom dictionary, repeated words, Grammar & Style, Markdown Syntax, Heading Hierarchy, Links, Images, Table Structure, Compatibility, Alt Text, Contrast, Accessibility Report, change history, compare |
| **View** | Panels, Display, Navigate, Appearance | Panel toggles, full screen, reading mode, Distraction-Free, Toggle Ribbon, Quick Open, Command Palette, Light and Dark appearance |
| **Tools** | Document Utilities, Workspace, Export Current Document, Publishing, Customization | Formatter, line endings, trailing space, indentation, workspace find and replace, batch rename, Export Studio, HTML publishing, collections, Manage Themes, Shortcuts, Templates, Snippets, Presets |

<p align="center">
  <img src="assets/screenshots/03.png" alt="Screenshot 03" />
</p>

### Markdown Authoring

**Markdown profiles.** A profile decides which syntax the editor and preview understand. GitHub Flavored is the default, and you can change it under **File → Preferences → Markdown**.

| Profile | Syntax |
| --- | --- |
| **CommonMark** | The CommonMark specification, with no extensions |
| **GitHub Flavored** | Tables, strikethrough, task lists, autolinks, callouts and footnotes |
| **Extended** | GitHub Flavored plus front matter, heading IDs, definition lists, abbreviations, page breaks, Pandoc-style citations and typographic replacements |
| **Knowledge** | Extended plus `[[wiki-links]]` and soft line breaks rendered as line breaks |

**Rich blocks.** Callouts use the `> [!NOTE]` syntax and come in twelve types: note, tip, important, warning, caution, info, success, question, danger, bug, example and quote. They can be made foldable with `+` or `-`. Footnotes, definition lists, abbreviations, task lists, page breaks, table of contents markers and syntax-highlighted code blocks are supported as well, and **Insert Code from File** pulls a source file into a fenced block.

<p align="center">
  <img src="assets/screenshots/10.png" alt="Screenshot 10" />
</p>

**Mathematics.** Write inline `$...$` and display `$$...$$` math rendered with KaTeX. The **Equation Editor** shows the rendered result while you compose.

<p align="center">
  <img src="assets/screenshots/08.png" alt="Screenshot 08" />
</p>

**Diagrams.** Fenced `mermaid` blocks render in the preview, and rendered diagrams can be exported as SVG or PNG.

<p align="center">
  <img src="assets/screenshots/09.png" alt="Screenshot 09" />
</p>

**Tables.** The **Table Editor** edits Markdown tables in a grid. You can also insert a table of a chosen size, convert selected text to a table, paste spreadsheet-style data as a table, or start from a table template.

<p align="center">
  <img src="assets/screenshots/07.png" alt="Screenshot 07" />
</p>

**Snippets and special characters.** Insert reusable snippets, manage your own, and insert symbols and the current date and time.

**Images and media.** Insert images from a file or the clipboard, link local assets, and embed audio and video. Image storage is configurable: keep images where they are (**Original Assets**), copy them to a folder beside the document (**Document Assets**, the default, using `assets`), or use a **Custom Folder**.

**Preview.** Ten preview styles are available from **Layout → Presentation**: Editorial, Academic, Manuscript, Literary, Journal, Magazine, Plain, Modern, Technical and Business. Preview width, images, tables and code can be tuned separately.

### Projects, Files and Workspaces

The **Backstage** view, opened from the File tab, contains these pages: Home, New, Open, Open Workspace, Save, Save As, Export, Print, HTML Export, DOCX Export, Document Information, Preferences, About and Migration Center.

- **Home.** Offers Create New, Open Document and Open Folder, plus recent documents with search. Pinned items are kept when you clear recents.
- **New.** A template gallery with categories and search (see [Templates and Document Creation](#templates-and-document-creation)).
- **Open Workspace.** Lists folders you have opened before. The last workspace and the documents of the last session reopen at launch, or you can choose to start empty.
- **Explorer.** A tree of the workspace with create, rename (`F2`), duplicate, delete, cut, copy, paste, **Move to…** and drag and drop. You can sort the tree, show hidden files and choose whether deletion asks for confirmation.
- **Safe saving.** Files are written to a temporary file in the same folder and renamed into place, guarded by a hash of what was read, so a save never overwrites changes made on disk behind your back.
- **External changes.** When a file changes on disk, Loto shows a banner (the default), or reloads unmodified documents automatically after taking a history snapshot.
- **Autosave.** Off by default. You can autosave after a pause in typing or when the window loses focus. Only files that already exist on disk are autosaved.
- **Opening files.** Loto allows one running instance. Opening a Markdown file from your system or the command line sends it to the running window, and the package registers `.md` and `.markdown` file associations.
- **Properties.** The Properties panel and the Document Information page show and edit front matter.

### Search and Workspace Tools

**Workspace search.** The Search panel queries an index of the workspace, so it stays fast on large folders. It supports case-sensitive, whole-word and regular-expression modes and include and exclude patterns, and groups results by file.

<p align="center">
  <img src="assets/screenshots/12.png" alt="Screenshot 12" />
</p>

**Workspace tools.** The **Tools → Workspace** group works across many files at once:

- **Find and Replace Across Files.**
- **Rename Files** and **Update Internal References.**
- **Inspect Orphaned Assets.**
- **Format Workspace Files.**
- **Batch Export.**
- **Undo Last Workspace Operation** and **Recent Operations**, which let you review and reverse multi-file changes.

**Document utilities.** **Tools → Document Utilities** offers a formatter, line ending and trailing space cleanup, indentation tools, an empty heading check and **Inspect Dialect**.

### Links and Link Integrity

Insert links to headings, files, external addresses and e-mail from the Insert tab, or use **References → Internal Navigation → Internal Link**. **Find References** and the **Backlinks** panel show where a document is used.

The **Link Integrity** group reports **Broken Links**, **Missing Files** and **Unused Assets** for the workspace, and **Update References** repairs links after files move. Checking external addresses is manual: pressing Check in the Links panel requests each listed address, and no document text is sent.

<p align="center">
  <img src="assets/screenshots/13-1.png" alt="Screenshot 13-1" />
  <img src="assets/screenshots/13-2.png" alt="Screenshot 13-2" />
</p>

### Citations, Bibliography and Cross-References

Citations use Pandoc syntax such as `[@key]`. Name a bibliography file in the front matter with `bibliography:`, or set a default path and style under **File → Preferences → Integrations**. BibTeX and CSL JSON sources are supported.

- **Insert Citation.** A searchable picker lists the entries of the active bibliography.
- **Citation Manager.** Browse and filter entries by key, title, author and year.
- **Bibliography.** Insert a managed bibliography block, and render citations as author-year or numbered.
- **Cross-References.** Reference figures, tables, equations and sections by label.

Citations need the **Extended** or **Knowledge** profile.

<p align="center">
  <img src="assets/screenshots/11.png" alt="Screenshot 11" />
</p>

### Review, Validation and Accessibility

**Proofreading.** Spellcheck uses the system spellchecker with a language selector and a custom dictionary, and `F7` runs it. The Review tab also finds repeated words and shows writing statistics. **Grammar & Style** is optional and off by default: when you turn it on, the checked paragraph is sent to an endpoint that you configure (see [Privacy and Security](#privacy-and-security)). A document can opt out.

**Validation.** The **Validation** group checks Markdown syntax, heading hierarchy, links, images, front matter, table structure and compatibility, and lists findings in the **Problems** panel with underlines in the editor. **Quick Fix at Cursor** applies a suggested fix where one exists.

<p align="center">
  <img src="assets/screenshots/14.png" alt="Screenshot 14" />
</p>

**Accessibility.** The **Accessibility** group checks headings, alt text, link labels, table headers and colour contrast, and **Accessibility Report** writes the findings to a document.

### History, Comparison and Recovery

**Change history.** Loto keeps local snapshots of each document. **Review → History → View Change History** lists them with a preview, and you can pin a version, delete one, compare two, or restore. Defaults keep up to 50 versions per file for 90 days within 200 MB, never prune the five newest, and snapshot autosaves every five minutes or after a 200-byte change. All of these are settings. **Recover Deleted File** brings back a file that history still knows about.

<p align="center">
  <img src="assets/screenshots/15.png" alt="Screenshot 15" />
</p>

**Comparison.** Compare the open document with its saved version, another file, or another open tab in a side-by-side diff.

**Crash recovery.** A recovery copy of an unsaved document is written two seconds after you stop changing it. After an unexpected exit, the **Recover unsaved documents** dialog offers to restore them, and copies older than 14 days are discarded. The window warns before you close unsaved work.

<p align="center">
  <img src="assets/screenshots/16.png" alt="Screenshot 16" />
</p>

### Migration Center

The **Migration Center** (**File → Migration Center**) scans an existing folder before importing it. It accepts Obsidian vaults, plain Markdown folders, documentation repositories and ZIP archives, and shows a compatibility report of what will convert cleanly and what needs attention.

<p align="center">
  <img src="assets/screenshots/17.png" alt="Screenshot 17" />
</p>

### Publishing and Export

All publishing starts from the same Markdown source. **File → Export** lists every route, and the Tools tab has direct commands for each.

| Format | How | Notes |
| --- | --- | --- |
| **PDF** | Export Studio or **Export as PDF** | Paginated with Paged.js, 19 templates, live preview, preflight |
| **HTML** | HTML Export Studio, **Build HTML Publication** | Standalone page or a publication site, with desktop, tablet and mobile preview widths |
| **DOCX** | DOCX Export | Converted by an installed [Pandoc](https://pandoc.org) |
| **RTF** | RTF Export | Converted by an installed Pandoc |
| **Plain text** | Plain Text | |
| **Markdown package** | Markdown Package | The document with its assets bundled |
| **Collections** | Collection Builder, **Export Multiple Documents** | Combine several documents into one publication or export them in one run |
| **Print** | **File → Print…** (`Ctrl+P`) | |

<p align="center">
  <img src="assets/screenshots/18.png" alt="Screenshot 18" />
</p>

**HTML.** Pages can be standalone, with a sidebar, inline or no table of contents, heading anchors in the style of GitHub, GitLab, Pandoc or simple slugs, a light or dark colour scheme that follows the reader's system, and your own CSS.

<p align="center">
  <img src="assets/screenshots/22.png" alt="Screenshot 22" />
</p>

**Collections.** The Collection Builder combines several workspace documents into one publication, with per-section options such as inclusion, title and page breaks.

<p align="center">
  <img src="assets/screenshots/23.png" alt="Screenshot 23" />
</p>

**Presets and defaults.** Save export settings as presets, and set a default preset, destination folder, file name pattern, preflight strictness and font embedding under **File → Preferences → Export**.

### Page Layout and Typography

The PDF **Export Studio** (**Tools → Export Current Document → Open Export Studio**) renders a live, paginated preview beside 13 settings pages: Template, Typography, Palette, Columns, Page, Header & Footer, Page Numbers, Cover Page, Watermark & Decor, Structure, Sections, Warnings and Presets.

<p align="center">
  <img src="assets/screenshots/19.png" alt="Screenshot 19" />
</p>

**Templates.** Nineteen PDF templates ship with the application:

| Template | Character |
| --- | --- |
| **Editorial** | Book-like serif layout in EB Garamond with small-caps headings and generous margins |
| **Academic** | Journal-style serif article with indented paragraphs and ruled tables |
| **Scientific** | Research paper with serif body, sans headings and compact figures |
| **Minimal** | Quiet sans-serif page with light weights and wide whitespace |
| **Modern Report** | Business report in Spline Sans with accent bars, shaded callouts and banded tables |
| **Magazine** | Two-column feature layout with drop caps and pull-quotes |
| **Technical** | Documentation style with prominent code blocks and grid tables |
| **Classic** | Traditional book page with centred headings and ornamental dividers |
| **Thesis** | Dissertation layout with generous spacing and chapter openings on new pages |
| **Executive Brief** | Playfair Display headlines, Source Sans text and a single gold rule |
| **Whitepaper** | Merriweather text, Montserrat section heads and framed call-outs |
| **Proposal** | Poppins headings, Open Sans text and rounded call-outs |
| **Datasheet** | Dense specification sheet with Fira Sans, Fira Code and compact zebra tables |
| **Clinical Notes** | Study and clinical notes with concept tables and key-point call-outs |
| **Naskh** | Arabic and bilingual pages that mirror in right-to-left documents |
| **Legal** | Contract layout with justified clauses and automatic 1 / 1.1 / (a) numbering |
| **Novel** | Fiction book interior with drop caps and facing A5 pages |
| **Swiss** | International style with a wide left margin and ragged-right setting |
| **Accessible** | Reading-friendly layout with OpenDyslexic, high contrast and no italics or justification |

**Layout controls.**

- **Page.** A4, A5, B5, Letter, Legal or a custom size in millimetres or inches, portrait or landscape, linked or independent margins, facing pages and text direction.
- **Columns.** One to three columns with gap, rules, balancing, heading span, and rules for how images, tables, code and callouts behave across columns.
- **Headers, footers and page numbers.** Separate zones, odd and even pages, a different first page, arabic, roman or alphabetic numbering, and a starting number.
- **Cover page.** Auto, centred, left, band or framed layouts with title, subtitle, author, date, organisation and a logo.
- **Watermark and decoration.** Text or image watermarks with angle and opacity, page borders, dividers, corner marks and accent bars.
- **Structure.** A table of contents with depth and leaders, heading numbering, figure and table captions with lists, notes placement, bibliography style and PDF bookmarks.
- **Palette.** Thirteen palettes (Paper, Sepia, Ink, Contrast, Midnight, Oxford, Burgundy, Forest, Olive, Slate, Terracotta, Monochrome and Neutral), plus custom colours.

<p align="center">
  <img src="assets/screenshots/20.png" alt="Screenshot 20" />
</p>

**Preflight.** The Warnings page checks the document before export and reports issues such as tables too wide for the page, very long tables, broken anchors, low contrast, stranded headings, empty sections and missing title or author.

<p align="center">
  <img src="assets/screenshots/21.png" alt="Screenshot 21" />
</p>

**Fonts.** Loto bundles 40 font families, so output does not depend on what is installed on your computer. They include EB Garamond, Cormorant Garamond, Playfair Display, Merriweather, Spline Sans, Inter, Source Sans 3, Fira Sans, JetBrains Mono, Fira Code, the TeX Gyre families, OpenDyslexic, and Arabic faces such as Amiri, Cairo, Tajawal and Scheherazade New.

### Preferences and Customization

**File → Preferences** applies changes immediately.

| Page | Contents |
| --- | --- |
| **Appearance** | Interface theme picker, appearance mode, density and zoom |
| **Editor** | Font, caret, tab and indent, word wrap, line numbers, whitespace, spellcheck, auto-pairing, paste behaviour, synchronized scrolling, focus and typewriter options, content width |
| **Markdown** | Default profile, table of contents maintenance, image storage, statistics |
| **Typography** | Preview typography |
| **File Management** | New file defaults, Explorer options, template behaviour, external change handling |
| **Accessibility** | Reduced motion, focus ring and zoom |
| **Privacy** | Network feature controls and local data clearing |
| **Search** | Workspace search settings |
| **Autosave and Recovery** | Autosave, recovery copies and session restore |
| **Export** | PDF and HTML defaults |
| **Integrations** | Pandoc path and timeout, external link checks, default bibliography and style |

**Customization.** The **Tools → Customization** group opens managers for the ribbon, shortcuts, templates, snippets, export presets, themes and integrations. The ribbon can be rearranged and a Quick Access Toolbar configured, and ribbon layouts can be exported and imported.

<p align="center">
  <img src="assets/screenshots/25.png" alt="Screenshot 25" />
</p>

**Keyboard shortcuts.** Every command can be rebound. Common defaults:

| Action | Shortcut |
| --- | --- |
| New, open, save | `Ctrl+N`, `Ctrl+O`, `Ctrl+S` |
| Save As | `Ctrl+Shift+S` |
| Print | `Ctrl+P` |
| Command Palette | `Ctrl+Shift+P` |
| Quick Open | `Ctrl+E` |
| Find, Replace | `Ctrl+F`, `Ctrl+H` |
| Go to Line | `Ctrl+G` |
| Bold, Italic, Link | `Ctrl+B`, `Ctrl+I`, `Ctrl+K` |
| Select next occurrence | `Ctrl+D` |
| Spellcheck | `F7` |
| Next or previous tab | `Ctrl+Tab`, `Ctrl+Shift+Tab` |
| Focus other editor group | `Ctrl+Alt+Right` |
| Full screen | `F11` |
| Toggle ribbon | `Ctrl+F1` |

**Accessibility of the interface.** The interface supports reduced motion, an enhanced focus ring, interface zoom and forced-colors mode, and ships high contrast light and dark themes.

### Privacy and Security

Loto sends no telemetry, analytics or crash reports. Two features can use the network, and both are under your control:

- **Online grammar check.** Off by default. When on, the paragraph being checked is sent to the endpoint you set. Local checks send nothing.
- **External link check.** Manual only. Pressing Check in the Links panel requests each listed address. No document text is sent.

The application does not check for updates. Install new releases from the project's release page.

Under the hood, the renderer runs sandboxed with context isolation on and Node.js integration off. The preload script exposes a small set of IPC channels and nothing else, permission requests are denied by default, navigation and new windows are restricted, and the preview sanitises HTML with DOMPurify. Pandoc runs without a shell or filters. The **Privacy** page in Preferences can clear recent documents, history and recovery data.

---

## Theme Showcase

Loto ships with **32 interface themes**: 21 light and 11 dark. Choose one in **File → Preferences → Appearance** (Interface theme) or in **Tools → Customization → Manage Themes…**. Each theme has a light or dark base, and you can set one theme for each. Applying a theme also switches the appearance to that base. Themes recolour the whole interface, including the ribbon, sidebars, editor and preview. You can also duplicate a theme to make your own, and import and export themes as JSON. Every screenshot below shows the same window and the same document.

<p align="center">
  <img src="assets/screenshots/24.png" alt="Screenshot 24" />
</p>

---

## Theme Showcase

Plum ships a library of **30 interface themes**, 20 light and 10 dark. Open **File, Preferences** and use the Interface Theme picker. The Light, Dark and System buttons choose the base mode and return to the default palette. Themes recolour the whole interface, including the ribbon, panes, dialogs and the syntax colours of the source editor. Each screenshot below shows the same window and the same document.


### Light themes

| Theme | Character | Preview |
| --- | --- | --- |
| Light | Default light theme | ![Light theme](assets/screenshots/themes/t01.png) |
| Plum Classic Light | Light grey-white surfaces with a deep indigo accent | ![Plum Classic Light theme](assets/screenshots/themes/t02.png) |
| Paper | Warm off-white with an olive-grey accent | ![Paper theme](assets/screenshots/themes/t03.png) |
| Porcelain | Cool blue-grey whites with a steel-blue accent | ![Porcelain theme](assets/screenshots/themes/t04.png) |
| Rosewater | Pale rose-tinted white with a dusty mauve accent | ![Rosewater theme](assets/screenshots/themes/t05.png) |
| Sage | Pale green-grey with a muted green accent | ![Sage theme](assets/screenshots/themes/t06.png) |
| Lavender Mist | Pale violet-tinted white with a violet accent | ![Lavender Mist theme](assets/screenshots/themes/t07.png) |
| Arctic | Pale blue-grey with a teal-blue accent | ![Arctic theme](assets/screenshots/themes/t08.png) |
| Mint | Pale mint white with a green-teal accent | ![Mint theme](assets/screenshots/themes/t09.png) |
| Terracotta | Warm cream with a clay-orange accent | ![Terracotta theme](assets/screenshots/themes/t10.png) |
| Olive Grove | Soft yellow-green cream with an olive accent | ![Olive Grove theme](assets/screenshots/themes/t11.png) |
| Ocean | Pale aqua white with a cyan-blue accent | ![Ocean theme](assets/screenshots/themes/t12.png) |
| Amber | Warm cream with an amber-brown accent | ![Amber theme](assets/screenshots/themes/t13.png) |
| Blush | Pale pink white with a raspberry accent | ![Blush theme](assets/screenshots/themes/t14.png) |
| Eucalyptus | Pale green-grey with a grey-green accent | ![Eucalyptus theme](assets/screenshots/themes/t15.png) |
| Cobalt | Pale blue-white with a saturated cobalt accent | ![Cobalt theme](assets/screenshots/themes/t16.png) |
| Lilac | Pale lilac white with a purple accent | ![Lilac theme](assets/screenshots/themes/t17.png) |
| Coffee | Warm light beige with a brown accent | ![Coffee theme](assets/screenshots/themes/t18.png) |
| Glacier | Pale icy blue with a blue-teal accent | ![Glacier theme](assets/screenshots/themes/t19.png) |
| High Contrast Light | White surfaces with a strong blue accent | ![High Contrast Light theme](assets/screenshots/themes/t20.png) |
| Monochrome | Neutral greys with a dark grey accent | ![Monochrome theme](assets/screenshots/themes/t21.png) |

### Dark themes

| Theme | Character | Preview |
| --- | --- | --- |
| Dark | Default dark theme | ![Dark theme](assets/screenshots/themes/t22.png) |
| Plum Midnight | Dark blue-grey surfaces with a periwinkle accent | ![Plum Midnight theme](assets/screenshots/themes/t23.png) |
| Nightshade | Charcoal-purple surfaces with a purple accent | ![Nightshade theme](assets/screenshots/themes/t24.png) |
| Northwind | Slate blue-grey surfaces with an ice-blue accent | ![Northwind theme](assets/screenshots/themes/t25.png) |
| Mocha | Dark brown surfaces with a caramel accent | ![Mocha theme](assets/screenshots/themes/t26.png) |
| Forest | Deep green-black surfaces with a soft green accent | ![Forest theme](assets/screenshots/themes/t27.png) |
| Ocean Deep | Dark navy-teal surfaces with a cyan accent | ![Ocean Deep theme](assets/screenshots/themes/t28.png) |
| Burgundy | Dark aubergine surfaces with a rose-pink accent | ![Burgundy theme](assets/screenshots/themes/t29.png) |
| Amber Terminal | Dark olive-brown surfaces with a gold accent | ![Amber Terminal theme](assets/screenshots/themes/t30.png) |
| Carbon | Neutral dark greys with a light grey accent | ![Carbon theme](assets/screenshots/themes/t31.png) |
| High Contrast Dark | Near-black surfaces with a light blue accent | ![High Contrast Dark theme](assets/screenshots/themes/t32.png) |

---

## Getting Started

### Requirements

| Requirement | Needed for | Bundled? |
| --- | --- | --- |
| Windows or Linux | Running the application | Prebuilt packages are published for both |
| Electron and Chromium runtime | Running the application | **Yes.** Packaged builds include them |
| Fonts, templates, KaTeX, Mermaid, Paged.js, CodeMirror | Editing, preview and PDF output | **Yes** |
| [Pandoc](https://pandoc.org) 2.11 or newer | DOCX and RTF export only | **No.** Optional |
| Internet access | Only the optional grammar check and manual external link check | Optional |

**Supported platforms.** The packaging configuration produces **Windows** (NSIS installer and Portable) and **Linux** (AppImage and Debian package) builds. macOS is not a supported platform at this time.

### Installation

Download the latest build for your platform from the [Releases page](https://github.com/laurevine-loto/releases/latest). File names follow electron-builder defaults and include the version number.

**Windows**

Run the installer. It is not a one-click installer, and you can choose the installation directory.

If Windows SmartScreen warns about an unrecognised publisher, choose **More info**, then **Run anyway**, only when the file came from the official release page.

**Linux**

- **AppImage.** Make it executable and run it:

  ```bash
  chmod +x "Laurevine Loto-"*.AppImage
  ./"Laurevine Loto-"*.AppImage
  ```

**From source**

```bash
git clone https://github.com/laurevine-loto.git
cd laurevine-loto
npm install
npm start
```

This runs `electron .` and needs Node.js and npm. See [Contributing and Support](#contributing-and-support) for build and test scripts.

### First Launch

On first launch, the **Home** page of the Backstage offers **Create New**, **Open Document** and **Open Folder**. Open a folder to browse its Markdown files in the Explorer, or create a document from a template. Settings, history, search indexes and recovery data are stored in your user profile, never inside your documents folder. On later launches Loto reopens the documents of your last session unless you choose to start empty.

To use DOCX or RTF export, install Pandoc. The **DOCX Export** page tells you whether Pandoc was found, and you can set its location under **File → Preferences → Integrations**.

### Your First Document

1. Choose **Create New**, pick a template such as **General Article**, or choose **Open Folder** to work on existing notes.
2. Write in the source pane. Select a phrase and press **Bold** on the Home tab, or open **Insert → Tables → Table Editor**.
3. Press `Ctrl+S` to save. History snapshots begin from your first save.
4. Open **File → Export** and pick a format. For PDF, the Export Studio lets you choose a template and tune the layout first.

A short document that shows several features:

````markdown
---
title: "Field Notes"
author: "Ada Marsh"
bibliography: references.bib
---

# Field Notes

Tidal mills store water at high tide [@hale1994].

> [!NOTE] Method
> Heads were measured at spring tide.

$$
P = \frac{E}{T}
$$

```mermaid
flowchart LR
  Sea --> Gate --> Pond --> Wheel
```
````

---

## Usage Guides

### Publishing a PDF with the Export Studio

1. Open the document and select **Tools → Export Current Document → Open Export Studio**.
2. On **Template**, pick a design. The preview repaginates immediately.
3. Adjust **Typography**, **Palette**, **Columns** and **Page** as needed.
4. Add structure on **Header & Footer**, **Page Numbers**, **Cover Page** and **Structure**: a table of contents, numbered headings, captions and bookmarks.
5. Open **Warnings** and resolve what preflight reports, such as a wide table or a missing author.
6. Save the settings as a preset on **Presets** if you will reuse them, then export.

### Citing Sources

1. Put a `bibliography:` line in the document's front matter that points to a BibTeX or CSL JSON file.
2. Set **File → Preferences → Markdown** to **Extended** or **Knowledge**.
3. Place the caret where the citation belongs and select **References → Citations → Citation**. Pick one or more entries.
4. Select **References → Citations → Bibliography** to insert the managed bibliography block.
5. Use **Citation Manager** to review all entries. Choose author-year or numbered output for PDF on the **Structure** page of the Export Studio.

### Restoring an Earlier Version

1. Open the document and select **Review → History → View Change History**.
2. Select a version to preview it. Use the source toggle to see its Markdown.
3. Select **Compare** to diff it against the current text, **Pin** to protect it from pruning, or **Restore** to bring it back. A restore is itself recorded in history.

### Moving Notes into Loto

1. Select **File → Migration Center** and choose the source folder or ZIP archive.
2. Read the compatibility report before changing anything.
3. Open the resulting folder as a workspace, then run **References → Link Integrity → Broken Links** and **Review → Validation** to catch leftovers.
4. If your notes use `[[wiki-links]]`, switch the profile to **Knowledge**.

### Renaming and Reorganizing Files

Use **Tools → Workspace → Rename Files** to rename several files in one operation. Run **Update Internal References** if links need repair, and review the result with **Recent Operations**. If a batch was a mistake, **Undo Last Workspace Operation** reverses it.

---

## Templates and Document Creation

Start a document from **File → New**, from the Home page, or from the Command Palette. The gallery filters by category and search. Twelve templates ship with the application, and the first of them is a blank page.

| Template | Category | Description |
| --- | --- | --- |
| **Blank Document** | General | An empty page with just a title |
| **General Article** | Writing | Title, lede and clean prose |
| **Blog Article** | Writing | A post with intro, sections and a closing |
| **Daily Journal** | Personal | Date-stamped entry for the day |
| **Meeting Notes** | Work | Attendees, agenda, decisions and actions |
| **Project Plan** | Work | Goals, milestones, risks and owners |
| **Structured Report** | Work | Summary, findings and recommendations |
| **Academic Report** | Academic | Abstract, method, results and references |
| **Research Notes** | Academic | Questions, sources and observations |
| **README** | Technical | Project overview, install and usage |
| **Technical Documentation** | Technical | Concepts, reference and examples |
| **Changelog** | Technical | Versioned list of notable changes |

Templates can use the placeholders `{{title}}`, `{{author}}`, `{{date}}` and `{{time}}`. Use **Save as Template…** to turn the current document into your own template, and **Manage Templates** to edit or delete yours. Templates larger than 200 KB are skipped.

---

## Architecture and Technology Stack

Loto is an Electron shell around a renderer written as plain ES modules, with no UI framework. A command registry drives the ribbon, menus, Command Palette and shortcuts.

```mermaid
flowchart LR
    R["Renderer: ribbon, editor, preview, studios (renderer/src)"] -->|"window.loto: invoke, on"| P["Preload bridge (main/preload.cjs)"]
    P --> M["Main process (main/main.js): windows, security, IPC registry"]
    M --> S["Services: fs, settings, history, indexer, search, publish, migration"]
    S -->|"files"| D["Your documents and workspace folders"]
    S -->|"user data directory"| U["Settings, history, indexes, recovery"]
    S -->|"optional, no shell"| X["Pandoc (installed by you)"]
    S -->|"opt-in"| G["Grammar endpoint you configure"]
```

- **Main process (`main/main.js`).** Enforces a single instance, handles files passed on the command line or by the operating system, creates the window and registers IPC handlers. Settings, history, search indexing, publishing, migration and other services run here. A custom application protocol serves the renderer and local assets under a Content Security Policy.
- **Preload (`main/preload.cjs`).** Exposes one small bridge, `window.loto`, with `invoke`, `on` and a file path helper. `contextIsolation` is on, `nodeIntegration` is off and the renderer is sandboxed.
- **Renderer (`renderer/src`).** `core/` holds pure logic (Markdown profiles, publishing, citations, themes), `features/` holds one module per capability, `ui/` holds the shell, ribbon, Backstage and editor host, and `commands/` holds the registry and keymap.
- **Publishing pipeline.** The Markdown source is parsed with markdown-it, sanitised, styled by a template, paginated in a sandboxed frame by Paged.js and written to PDF by Electron, with outlines and metadata added by pdf-lib. DOCX and RTF are produced by an installed Pandoc.
- **Local storage.** Documents are plain files. Settings, history snapshots, search indexes, recents, workspaces and operation logs live in the Electron user data directory.

**Technology and dependency overview**

| Component | Version | Role |
| --- | --- | --- |
| Electron | `^45.2.2` | Desktop shell and Chromium renderer |
| electron-builder | `^24.13.3` | Packaging: NSIS, Portable, AppImage, deb |
| CodeMirror | 6 | Markdown source editor |
| markdown-it | `^14.1.0` | Markdown parsing and rendering |
| DOMPurify | `^3.2.0` | HTML sanitisation |
| KaTeX | `^0.16.0` | Math typesetting |
| Mermaid | `^11.4.0` | Diagram rendering |
| highlight.js | `^11.11.0` | Code highlighting |
| Paged.js | `^0.4.3` | Pagination for PDF |
| pdf-lib | `^1.17.1` | PDF outline and metadata |
| Turndown | `^7.2.0` | HTML to Markdown conversion |
| Lucide | bundled | Interface icons |
| esbuild | `^0.25.0` | Bundles renderer libraries into `renderer/vendor` |
| Pandoc | 2.11 or newer | Optional DOCX and RTF conversion |

The repository declares no runtime npm dependencies. Third-party libraries are bundled into `renderer/vendor` and `main/vendor` and shipped with the app.

---

## Project Structure

```text
.
├── main/                    Electron main process
│   ├── main.js              Entry point: single instance, window, IPC
│   ├── preload.cjs          Context bridge (window.loto)
│   ├── app/                 Window management, security, protocols, menu, splash
│   ├── ipc/                 IPC registry, validation and handlers
│   ├── services/            fs, settings, history, indexer, search, publish, pandoc, migration, grammar, recovery
│   ├── core/                Pandoc integration, ZIP, DOCX reference, history core
│   ├── resources/           Built-in document templates and splash artwork
│   └── vendor/              pdf-lib
├── renderer/                Application UI
│   ├── index.html           Application shell
│   ├── src/                 core, features, ui, commands, services, state
│   ├── styles/              Tokens, layout, components, themes, preview themes
│   ├── fonts/               40 bundled font families with their licences
│   ├── vendor/              Bundled third-party libraries
│   ├── assets/              Interface assets
│   └── legal/               Third-party notices shown in the app
├── shared/                  Settings schema, export config, channels, constants
├── tests/                   Test suite (node --test)
├── tools/                   check, vendor, fonts, perf and fixture scripts
├── assets/                  Application icons and README images
├── docs/                    Architecture, user guide and screenshot guide
├── LICENSE.txt, NOTICE      Apache License 2.0 and product notice
├── THIRD_PARTY_NOTICES.md   Third-party licences
├── TRADEMARK.md             Name and brand assets policy
└── package.json             Metadata, scripts and electron-builder configuration
```

---

## Troubleshooting

| Problem | Likely cause | What to do |
| --- | --- | --- |
| The DOCX Export page says DOCX export is disabled | Pandoc was not found | Install Pandoc 2.11 or newer, or set its path under **File → Preferences → Integrations**, then reopen the page |
| Citations appear as raw `[@key]` text | The profile does not include citations | Set **File → Preferences → Markdown** to **Extended** or **Knowledge** |
| The citation picker is empty | No bibliography was found | Add `bibliography:` to the front matter with a valid BibTeX or CSL JSON path, or set a default path under **Integrations** |
| `[[wiki-links]]` are not recognised | Only the Knowledge profile supports them | Switch the profile to **Knowledge** |
| Grammar & Style does nothing | The online check is off by default | Configure the endpoint and language under **Preferences → Privacy** and turn it on. Document text is sent to that endpoint while it is on |
| A banner says a file changed on disk | Another program edited the file | Choose to reload or keep your version. Under **File Management** you can set files to reload automatically when unmodified |
| Unsaved work after a crash | The application closed unexpectedly | Choose **Recover unsaved documents** at the next launch. Copies are kept for 14 days |
| Autosave does not save a new document | Only files that already exist on disk are autosaved | Save the document once, then autosave applies |
| Export Studio warns about a wide table or missing author | Preflight found a layout or metadata issue | Open **Warnings**, adjust the table or columns, and set the author in front matter |

When reporting a problem, include the version shown on the **About** page of the File tab, your operating system, and a minimal document that reproduces the issue.

---

## Known Limitations

- DOCX and RTF are approximations of the preview and the PDF. Page layout, columns, page decorations, diagrams and some extensions do not carry over exactly, and Pandoc must be installed.
- Citations, definition lists, abbreviations and page breaks need the Extended or Knowledge profile. Wiki-links need Knowledge.
- Online grammar checking sends text to an endpoint you configure. It is off by default.
- External link checking is manual.
- Loto does not check for updates, so new releases must be downloaded manually.
- Official builds target Windows and Linux only.

---

## License and Acknowledgements

**Laurevine Loto** is released under the **Apache License 2.0**. See [`LICENSE.txt`](LICENSE.txt) and [`NOTICE`](NOTICE). Copyright belongs to Biowess.

**Trademarks and brand assets.** The Apache License covers the source code only. The [Trademark and Brand Assets Policy](TRADEMARK.md) reserves the following for Biowess:

- the Laurevine Loto name and wordmark;
- the logo and application icon;
- the installer and splash screen artwork;
- the distinctive interface visual design, including the ribbon and Backstage layout, themes and colour palettes;
- original brand illustrations and promotional artwork, including the banner and screenshots in this repository.

You may fork the code, refer to the application by name in a factual way (for example "based on Laurevine Loto") and build your own visual identity. A fork must be renamed and must not reuse the reserved assets or imply endorsement by Biowess. See the policy for details and for how to request permission.

**Third-party components keep their own licences.** The Apache License for Loto does not replace them. Full notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

| Component | Licence |
| --- | --- |
| Electron | MIT |
| CodeMirror 6 | MIT |
| markdown-it | MIT |
| DOMPurify | Apache-2.0 OR MPL-2.0 |
| highlight.js | BSD-3-Clause |
| KaTeX | MIT |
| Mermaid | MIT |
| Turndown | MIT |
| Paged.js | MIT |
| pdf-lib | MIT |
| Lucide icons | ISC, with portions MIT |
| Bundled fonts (40 families) | Each family ships with its own licence file in `renderer/fonts/` |
| Pandoc | Installed separately by the user and called as an external program. Its own licence applies |

Thanks to the maintainers of the open-source projects above, and to the type designers whose open fonts ship with Loto.

---

## Contributing and Support

Repository: `github.com/laurevine-loto`

**Bug reports.** Open an issue at `github.com/laurevine-loto/issues`. Include the Loto version (File tab, About), your operating system, steps to reproduce, and a minimal document that shows the problem.

**Feature requests.** Open an issue and describe the workflow you want to support rather than only the control you would like.

**Working on the code.**

```bash
npm install        # install dependencies
npm start          # run the application (add -- --dev for developer tools)
npm test           # run the test suite (node --test)
npm run check      # repository checks
npm run pack       # unpacked build in dist/
npm run dist       # installers and packages for your platform
npm run vendor     # regenerate bundled renderer libraries (only when updating a dependency)
```

Build each platform's packages on that platform. Before opening a pull request, run `npm test` and `npm run check`. The `docs/` folder describes the architecture, and `docs/SCREENSHOT_GUIDE.md` explains how the README images are produced.

**Trademark and permission requests.** Write to [biowess@proton.me](mailto:biowess@proton.me).

---

## Closing Note

Loto exists to make Markdown a complete medium without making it opaque. The ribbon, dialogs and studios are conveniences that always resolve to plain files you can read, edit and take elsewhere, and the whole application runs on your own machine. If it gets you to a finished document sooner, it has done its job.
