# Laurevine Loto — Workspace Configuration

Specification for workspace configuration, metadata files, and folder conventions in Laurevine Loto.

---

## 1. Overview

Laurevine Loto treats any folder on disk as a self-contained Markdown workspace. No proprietary databases or hidden vendor directories are injected into your project.

Optional workspace-level configuration files live in the root directory of the workspace.

---

## 2. Directory Structure

A recommended workspace directory structure:

```
my-workspace/
├── .loto/                 # Optional workspace settings and cache
│   ├── config.json        # Workspace-specific preference overrides
│   └── templates/         # Local workspace-specific publication templates
├── notes/                 # Markdown documents (.md, .markdown)
│   ├── index.md
│   └── project-plan.md
├── assets/                # Images, diagrams, and attachments
│   ├── diagram.png
│   └── figure-1.svg
└── bibliography.json      # Optional CSL-JSON bibliography file
```

---

## 3. Workspace Settings (`.loto/config.json`)

If present, `.loto/config.json` overrides application-level defaults for files opened within the workspace:

```json
{
  "version": 1,
  "markdown": {
    "defaultProfile": "extended",
    "anchorStrategy": "github",
    "lineBreak": "preserve"
  },
  "editor": {
    "tabSize": 2,
    "insertSpaces": true,
    "wordWrap": "on"
  },
  "export": {
    "defaultTemplate": "editorial",
    "defaultPalette": "antique-gold",
    "preflightStrictness": "warn"
  },
  "attachments": {
    "folder": "assets",
    "naming": "original"
  }
}
```

### Supported Settings Keys
- **`markdown.defaultProfile`**: `commonmark` | `gfm` | `extended`.
- **`markdown.anchorStrategy`**: `github` | `slugify` | `kebab`.
- **`editor.tabSize`**: Integer from 1 to 8 (default: 2).
- **`editor.wordWrap`**: `on` | `off` | `wordWrapColumn`.
- **`attachments.folder`**: Relative directory path for image attachments.
- **`bibliography.defaultPath`**: Relative path to a `.bib` or `.json` references database.

---

## 4. Document Frontmatter

Documents can declare YAML frontmatter at the top of the file to configure metadata and publishing targets:

```yaml
---
title: Research Project
author: Jane Doe
date: 2026-11-07
template: academic
palette: navy
columns: 2
tags: [research, report]
---
```

When opened in Export Studio or published, frontmatter values automatically populate the title page, running headers, and metadata tags of the generated output.
