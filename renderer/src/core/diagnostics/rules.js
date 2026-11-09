// Pure validation rules for Markdown diagnostics.
import { resolveLink, parseWiki } from '../links/resolve.js';
import { detect, beyondProfile, CONSTRUCTS } from '../markdown/portability.js';
import { getProfile, DEFAULT_PROFILE } from '../markdown/profiles.js';
import { findRegions } from '../toc/region.js';
import { extractHeadings } from '../toc/headings.js';
import { findBibRegions } from '../bibliography/citations.js';
import { splitFrontmatter } from '../markdown/frontmatter.js';
import { isDelimiter, splitRow } from '../table/parse.js';

// Index lines and character offsets for fast range queries.
export function lineIndex(text) {
  const str = String(text ?? '');
  const lines = [];
  const starts = [];
  let pos = 0;
  for (const line of str.split('\n')) {
    const raw = line.endsWith('\r') ? line.slice(0, -1) : line;
    starts.push(pos);
    lines.push(raw);
    pos += line.length + 1;
  }
  const lineRange = (lineNum) => {
    const l = Math.max(0, Math.min(lineNum, lines.length - 1));
    const from = starts[l] ?? 0;
    const to = from + (lines[l]?.length ?? 0);
    return { from, to };
  };
  return { lines, starts, lineRange };
}

// Find ranges of fenced code blocks and inline code spans to exclude from inline scanning.
export function findCodeRanges(text) {
  const str = String(text ?? '');
  const ranges = [];
  // Fenced blocks
  const fenceRe = /^[ ]{0,3}(`{3,}|~{3,})(?:[^\r\n]*)/gm;
  let m;
  while ((m = fenceRe.exec(str)) !== null) {
    const marker = m[1][0], len = m[1].length, start = m.index;
    const endRe = new RegExp(`^[ ]{0,3}${marker}{${len},}[ \\t]*$`, 'gm');
    endRe.lastIndex = fenceRe.lastIndex;
    const endM = endRe.exec(str);
    if (endM) {
      ranges.push([start, endM.index + endM[0].length]);
      fenceRe.lastIndex = endM.index + endM[0].length;
    } else {
      ranges.push([start, str.length]);
      break;
    }
  }
  // Inline code spans (skip if inside a fenced block)
  const inFenced = (pos) => ranges.some(([s, e]) => pos >= s && pos < e);
  const codeSpanRe = /(`+)([^`\n]|[\s\S]*?[^`])\1(?!`)/g;
  while ((m = codeSpanRe.exec(str)) !== null) {
    if (!inFenced(m.index)) ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

// --- Rule 1: Markdown syntax ---
export const markdownSyntaxRule = {
  id: 'markdown-syntax',
  title: 'Markdown Syntax',
  description: 'Unclosed code fences, emphasis, links, and malformed tables',
  run(text) {
    const str = String(text ?? '');
    const { lines, starts, lineRange } = lineIndex(str);
    const diagnostics = [];

    // 1. Unclosed code fences
    let openFence = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = /^[ ]{0,3}(`{3,}|~{3,})/.exec(line);
      if (openFence) {
        if (m && m[1][0] === openFence.char && m[1].length >= openFence.len && !line.slice(m[0].length).trim()) {
          openFence = null;
        }
      } else if (m) {
        openFence = { char: m[1][0], len: m[1].length, line: i, from: starts[i], to: starts[i] + line.length };
      }
    }
    if (openFence) {
      const eol = str.includes('\r\n') ? '\r\n' : '\n';
      const insert = (str.endsWith('\n') ? '' : eol) + openFence.char.repeat(openFence.len) + eol;
      diagnostics.push({
        id: 'syntax.unclosed-fence',
        severity: 'error',
        message: 'Unclosed code fence',
        range: { from: openFence.from, to: openFence.to },
        fix: { label: 'Close code fence', from: str.length, to: str.length, insert },
      });
    }

    // 2. Unclosed emphasis and links (outside code spans and fenced blocks)
    const codeRanges = findCodeRanges(str);
    const inCode = (pos) => codeRanges.some(([s, e]) => pos >= s && pos < e);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = starts[i];
      if (inCode(lineStart)) continue;

      // Check unclosed links: [text](url without closing paren or [text without closing bracket
      // Ignore reference link definitions: ^[ref]: url
      if (!/^[ ]{0,3}\[[^\]]+\]:[ \t]/.test(line)) {
        for (let j = 0; j < line.length; j++) {
          if (line[j] === '\\') { j++; continue; }
          const pos = lineStart + j;
          if (inCode(pos)) continue;

          // Check for link opener `[` (not preceded by `!`)
          if (line[j] === '[' && (j === 0 || line[j - 1] !== '!')) {
            // Task list check `- [ ]` or `- [x]`
            if (/^\[[ xX]\](?:\s|$)/.test(line.slice(j))) continue;
            // Scan for closing bracket `]`
            let closed = false, bracketEnd = -1;
            for (let k = j + 1; k < line.length; k++) {
              if (line[k] === '\\') { k++; continue; }
              if (line[k] === ']' && !inCode(lineStart + k)) {
                closed = true;
                bracketEnd = k;
                break;
              }
            }
            if (!closed) {
              diagnostics.push({
                id: 'syntax.unclosed-link',
                severity: 'error',
                message: 'Unclosed link label (missing closing "]")',
                range: { from: lineStart + j, to: lineStart + line.length },
              });
              break;
            } else if (line[bracketEnd + 1] === '(') {
              // Check matching `)`
              let parenClosed = false;
              for (let k = bracketEnd + 2; k < line.length; k++) {
                if (line[k] === '\\') { k++; continue; }
                if (line[k] === ')' && !inCode(lineStart + k)) {
                  parenClosed = true;
                  break;
                }
              }
              if (!parenClosed) {
                diagnostics.push({
                  id: 'syntax.unclosed-link',
                  severity: 'error',
                  message: 'Unclosed link target (missing closing ")")',
                  range: { from: lineStart + j, to: lineStart + line.length },
                });
                break;
              }
            }
          }
        }
      }

      // Check unclosed emphasis delimiters: **, *, __, _, ~~
      const cleanLine = line.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
      const emPatterns = [
        { marker: '**', re: /\*\*(?!\s)(.+?)\*\*/g, unclosed: /\*\*(?!\s)/ },
        { marker: '~~', re: /~~(?!\s)(.+?)~~/g, unclosed: /~~(?!\s)/ },
        { marker: '__', re: /__(?!\s)(.+?)__/g, unclosed: /(?:^|[^\w])__(?!\s)/ },
        { marker: '*', re: /(?:^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, unclosed: /(?:^|[^* \t])\*(?![*\s])/ },
        { marker: '_', re: /(?:^|[^\w])_(?!\s)([^_]+?)_(?!\w)/g, unclosed: /(?:^|[^\w])_(?![\s_])/ },
      ];

      // Strip valid matched pairs from a work copy
      let work = cleanLine;
      for (const { re } of emPatterns) {
        work = work.replace(re, (m) => ' '.repeat(m.length));
      }
      // Check if any unmatched opener remains
      for (const { marker, unclosed } of emPatterns) {
        const u = unclosed.exec(work);
        if (u) {
          // Verify it's not a bullet point list like `* item`
          if (marker === '*' && /^[ ]{0,3}\*[ \t]/.test(line)) continue;
          const idx = u.index + (u[0].length - marker.length);
          diagnostics.push({
            id: 'syntax.unclosed-emphasis',
            severity: 'warning',
            message: `Unclosed emphasis "${marker}"`,
            range: { from: lineStart + idx, to: lineStart + idx + marker.length },
          });
          break;
        }
      }

      // 3. Malformed table delimiter attempt
      if (line.includes('|') && /-/.test(line) && !isDelimiter(line) && i > 0 && lines[i - 1].includes('|')) {
        const prevCells = splitRow(lines[i - 1]);
        const curCells = splitRow(line);
        if (prevCells.length > 1 && curCells.length > 1 && curCells.some((c) => /-/.test(c))) {
          diagnostics.push({
            id: 'syntax.malformed-table',
            severity: 'error',
            message: 'Malformed table delimiter row',
            range: lineRange(i),
          });
        }
      }
    }

    return diagnostics;
  },
};

// --- Rule 2: Heading structure ---
export const headingStructureRule = {
  id: 'heading-structure',
  title: 'Heading Structure',
  description: 'Skipped heading levels, duplicate top-level (h1) headings, and empty headings',
  run(text) {
    const str = String(text ?? '');
    const { lineRange } = lineIndex(str);
    const headings = extractHeadings(str);
    const diagnostics = [];

    let prevLevel = 0;
    let h1Count = 0;

    for (const h of headings) {
      const range = lineRange(h.line);

      // Empty headings
      if (!h.text || !h.text.trim()) {
        diagnostics.push({
          id: 'headings.empty',
          severity: 'warning',
          message: 'Empty heading',
          range,
        });
      }

      // Duplicate top-level (h1)
      if (h.level === 1) {
        h1Count++;
        if (h1Count > 1) {
          diagnostics.push({
            id: 'headings.duplicate-top-level',
            severity: 'warning',
            message: `Duplicate top-level heading: "${h.text}"`,
            range,
          });
        }
      }

      // Skipped levels (e.g. h1 to h3, or starting at h3)
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        diagnostics.push({
          id: 'headings.skipped-level',
          severity: 'warning',
          message: `Heading level skipped: jumped from h${prevLevel} to h${h.level}`,
          range,
        });
      } else if (prevLevel === 0 && h.level > 2) {
        diagnostics.push({
          id: 'headings.skipped-level',
          severity: 'warning',
          message: `Initial heading level skipped: started at h${h.level}`,
          range,
        });
      }

      prevLevel = h.level;
    }

    return diagnostics;
  },
};

// --- Rule 3: Links ---
export const linksRule = {
  id: 'links',
  title: 'Link Integrity',
  description: 'Validates target files, anchors, and wiki-link ambiguity via core/links/resolve.js',
  run(text, { from = '', index = null, anchors = null, strategy = 'github' } = {}) {
    const str = String(text ?? '');
    const { lines, starts } = lineIndex(str);
    const codeRanges = findCodeRanges(str);
    const inCode = (pos) => codeRanges.some(([s, e]) => pos >= s && pos < e);
    const diagnostics = [];

    const INLINE_LINK = /(?<!!)(?:\[((?:[^\]\\]|\\.)*)\]\(\s*(?:<([^>]*)>|([^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\))/g;
    const WIKI_LINK = /(?<!!)\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i], lineStart = starts[i];
      if (inCode(lineStart)) continue;

      // Inline markdown links
      let m;
      INLINE_LINK.lastIndex = 0;
      while ((m = INLINE_LINK.exec(line)) !== null) {
        const offset = lineStart + m.index;
        if (inCode(offset)) continue;
        const target = m[2] ?? m[3] ?? '';
        if (!target) continue;

        const res = resolveLink(target, { from, index, anchors, strategy });
        if (res.status === 'missing-file') {
          diagnostics.push({
            id: 'links.missing-file',
            severity: 'error',
            message: `Broken link: target "${target}" does not exist`,
            range: { from: offset, to: offset + m[0].length },
          });
        } else if (res.status === 'missing-anchor') {
          diagnostics.push({
            id: 'links.missing-anchor',
            severity: 'warning',
            message: `Broken anchor: "#${res.anchor}" not found in "${res.path || target}"`,
            range: { from: offset, to: offset + m[0].length },
          });
        }
      }

      // Wiki-links
      WIKI_LINK.lastIndex = 0;
      while ((m = WIKI_LINK.exec(line)) !== null) {
        const offset = lineStart + m.index;
        if (inCode(offset)) continue;
        const fullWiki = m[0];

        const res = resolveLink(fullWiki, { from, index, anchors, strategy });
        if (res.status === 'missing-file') {
          diagnostics.push({
            id: 'links.missing-file',
            severity: 'error',
            message: `Broken wiki-link: "${m[1]}" does not exist`,
            range: { from: offset, to: offset + fullWiki.length },
          });
        } else if (res.status === 'missing-anchor') {
          diagnostics.push({
            id: 'links.missing-anchor',
            severity: 'warning',
            message: `Broken anchor: "#${res.anchor}" not found in "${res.path || m[1]}"`,
            range: { from: offset, to: offset + fullWiki.length },
          });
        } else if (res.status === 'ambiguous') {
          diagnostics.push({
            id: 'links.ambiguous',
            severity: 'warning',
            message: `Ambiguous wiki-link: "${m[1]}" matches multiple files`,
            range: { from: offset, to: offset + fullWiki.length },
          });
        }
      }
    }

    return diagnostics;
  },
};

// --- Rule 4: Images ---
export const imagesRule = {
  id: 'images',
  title: 'Image Validation',
  description: 'Detects missing image files and missing/empty image alt text',
  run(text, { from = '', index = null, strategy = 'github' } = {}) {
    const str = String(text ?? '');
    const { lines, starts } = lineIndex(str);
    const codeRanges = findCodeRanges(str);
    const inCode = (pos) => codeRanges.some(([s, e]) => pos >= s && pos < e);
    const diagnostics = [];

    const MD_IMAGE = /!\[((?:[^\]\\]|\\.)*)\]\(\s*(?:<([^>]*)>|([^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
    const WIKI_EMBED = /!\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g;
    const HTML_IMG = /<img\b(?=[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^>\s]+)))[^>]*>/gi;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i], lineStart = starts[i];
      if (inCode(lineStart)) continue;

      // Markdown image: ![alt](src)
      let m;
      MD_IMAGE.lastIndex = 0;
      while ((m = MD_IMAGE.exec(line)) !== null) {
        const offset = lineStart + m.index;
        if (inCode(offset)) continue;
        const alt = m[1] || '';
        const src = m[2] ?? m[3] ?? '';

        if (!alt.trim()) {
          diagnostics.push({
            id: 'images.empty-alt',
            severity: 'warning',
            message: 'Image is missing alt text',
            range: { from: offset, to: offset + m[0].length },
            fix: {
              label: 'Add alt text placeholder',
              from: offset + 2,
              to: offset + 2 + alt.length,
              insert: 'image description',
            },
          });
        }

        if (src && index) {
          const res = resolveLink(src, { from, index, strategy });
          if (res.status === 'missing-file') {
            diagnostics.push({
              id: 'images.missing-file',
              severity: 'error',
              message: `Missing image file: "${src}"`,
              range: { from: offset, to: offset + m[0].length },
            });
          }
        }
      }

      // Wiki embeds: ![[file|alt]]
      WIKI_EMBED.lastIndex = 0;
      while ((m = WIKI_EMBED.exec(line)) !== null) {
        const offset = lineStart + m.index;
        if (inCode(offset)) continue;
        const target = m[1]?.trim() || '';
        if (target && index) {
          const res = resolveLink(target, { from, index, strategy });
          if (res.status === 'missing-file') {
            diagnostics.push({
              id: 'images.missing-file',
              severity: 'error',
              message: `Missing image file: "${target}"`,
              range: { from: offset, to: offset + m[0].length },
            });
          }
        }
      }

      // HTML <img>
      HTML_IMG.lastIndex = 0;
      while ((m = HTML_IMG.exec(line)) !== null) {
        const offset = lineStart + m.index;
        if (inCode(offset)) continue;
        const tag = m[0];
        const src = m[1] ?? m[2] ?? m[3] ?? '';
        const hasAlt = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^>\s]+))/i.exec(tag);
        const altVal = hasAlt ? (hasAlt[1] ?? hasAlt[2] ?? hasAlt[3] ?? '') : '';

        if (!hasAlt || !altVal.trim()) {
          diagnostics.push({
            id: 'images.empty-alt',
            severity: 'warning',
            message: 'Image is missing alt text',
            range: { from: offset, to: offset + tag.length },
          });
        }

        if (src && index && !/^([a-z][a-z0-9+.-]+:|\/\/|data:)/i.test(src)) {
          const res = resolveLink(src, { from, index, strategy });
          if (res.status === 'missing-file') {
            diagnostics.push({
              id: 'images.missing-file',
              severity: 'error',
              message: `Missing image file: "${src}"`,
              range: { from: offset, to: offset + tag.length },
            });
          }
        }
      }
    }

    return diagnostics;
  },
};

// --- Rule 5: Frontmatter ---
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DATE_KEYS = new Set(['date', 'created', 'updated', 'modified', 'publish_date', 'published', 'lastmod']);

export const frontmatterRule = {
  id: 'frontmatter',
  title: 'Frontmatter Integrity',
  description: 'YAML syntax errors, duplicate top-level keys, and invalid date formats',
  run(text) {
    const str = String(text ?? '');
    const { starts, lineRange } = lineIndex(str);
    const diagnostics = [];

    // Check if document begins with frontmatter opener
    if (!/^\uFEFF?---[ \t]*(\r?\n|$)/.test(str)) return diagnostics;

    const { present, raw, inner } = splitFrontmatter(str);
    if (!present) {
      diagnostics.push({
        id: 'frontmatter.unclosed',
        severity: 'error',
        message: 'Unclosed YAML frontmatter: missing closing "---"',
        range: { from: 0, to: 3 },
      });
      return diagnostics;
    }

    const lines = inner.split(/\r?\n/);
    const seenKeys = new Map();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNo = i + 1; // 1-based line index in document (starts after opening ---)
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check key: value syntax or list item
      const keyMatch = /^([^\s#:'"][^:]*?|"[^"]+"|'[^']+')\s*:(?:\s+(.*)|\s*)$/.exec(line);
      const isListItem = /^[ \t]*-\s*/.test(line);

      if (!keyMatch && !isListItem) {
        diagnostics.push({
          id: 'frontmatter.yaml-error',
          severity: 'error',
          message: `Invalid YAML syntax in frontmatter: "${trimmed}"`,
          range: lineRange(lineNo),
        });
        continue;
      }

      if (keyMatch) {
        const rawKey = keyMatch[1];
        const key = rawKey.replace(/^["']|["']$/g, '');
        const val = (keyMatch[2] || '').trim();

        // Duplicate key check
        if (seenKeys.has(key)) {
          diagnostics.push({
            id: 'frontmatter.duplicate-key',
            severity: 'warning',
            message: `Duplicate frontmatter key "${key}"`,
            range: lineRange(lineNo),
          });
        } else {
          seenKeys.set(key, lineNo);
        }

        // Unterminated quotes
        if ((val.startsWith('"') && (!val.endsWith('"') || val.length < 2)) ||
            (val.startsWith("'") && (!val.endsWith("'") || val.length < 2))) {
          diagnostics.push({
            id: 'frontmatter.yaml-error',
            severity: 'error',
            message: `Unterminated quote in frontmatter value for "${key}"`,
            range: lineRange(lineNo),
          });
        }

        // Date format check
        const cleanVal = val.replace(/^["']|["']$/g, '').trim();
        if ((DATE_KEYS.has(key.toLowerCase()) || key.toLowerCase().endsWith('_date')) && cleanVal) {
          if (!DATE_FORMAT.test(cleanVal) || Number.isNaN(Date.parse(cleanVal))) {
            diagnostics.push({
              id: 'frontmatter.unknown-date-format',
              severity: 'warning',
              message: `Unknown date format in frontmatter for "${key}": "${cleanVal}"`,
              range: lineRange(lineNo),
            });
          }
        }
      }
    }

    return diagnostics;
  },
};

// --- Rule 6: Table structure ---
export const tableStructureRule = {
  id: 'table-structure',
  title: 'Table Structure',
  description: 'Missing table delimiters and ragged rows with unequal column counts',
  run(text) {
    const str = String(text ?? '');
    const { lines, lineRange } = lineIndex(str);
    const codeRanges = findCodeRanges(str);
    const inCode = (pos) => codeRanges.some(([s, e]) => pos >= s && pos < e);
    const diagnostics = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const range = lineRange(i);
      if (inCode(range.from) || !line.includes('|')) {
        i++;
        continue;
      }

      // Potential table header row
      const headerCells = splitRow(line);
      if (headerCells.length > 1 && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (isDelimiter(nextLine)) {
          // Valid table header + delimiter found. Check body rows.
          const delimCells = splitRow(nextLine);
          const expectedCols = headerCells.length;
          let rowIdx = i + 2;
          while (rowIdx < lines.length) {
            const rowLine = lines[rowIdx];
            if (!rowLine.trim() || !rowLine.includes('|') || inCode(lineRange(rowIdx).from)) break;
            const cells = splitRow(rowLine);
            if (cells.length !== expectedCols) {
              diagnostics.push({
                id: 'tables.ragged-row',
                severity: 'warning',
                message: `Ragged table row: expected ${expectedCols} columns, found ${cells.length}`,
                range: lineRange(rowIdx),
              });
            }
            rowIdx++;
          }
          i = rowIdx;
          continue;
        } else if (nextLine.includes('|') && !/^[ \t]*[-*+0-9]/.test(nextLine)) {
          // Row with multiple pipes followed immediately by another row with pipes without delimiter
          const nextCells = splitRow(nextLine);
          if (nextCells.length > 1) {
            const eol = str.includes('\r\n') ? '\r\n' : '\n';
            const delimInsert = `${eol}| ${Array(headerCells.length).fill('---').join(' | ')} |`;
            diagnostics.push({
              id: 'tables.missing-delimiter',
              severity: 'error',
              message: 'Table is missing delimiter row',
              range: lineRange(i),
              fix: {
                label: 'Insert delimiter row',
                from: range.to,
                to: range.to,
                insert: delimInsert,
              },
            });
            i += 2;
            continue;
          }
        }
      }
      i++;
    }

    return diagnostics;
  },
};

// --- Rule 7: Extension compatibility ---
export const extensionCompatibilityRule = {
  id: 'extension-compatibility',
  title: 'Extension Compatibility',
  description: 'Constructs beyond the selected Markdown profile from the portability registry',
  run(text, { profile = DEFAULT_PROFILE, wiki = false, html = false } = {}) {
    const str = String(text ?? '');
    const { lineRange } = lineIndex(str);
    const prof = typeof profile === 'string' ? getProfile(profile) : (profile || getProfile(DEFAULT_PROFILE));
    const found = detect(str);
    const beyond = beyondProfile(found, prof, { wiki, html });
    const diagnostics = [];

    for (const item of beyond) {
      const meta = CONSTRUCTS[item.id];
      const range = lineRange(item.line - 1); // detect() line is 1-based
      diagnostics.push({
        id: 'compatibility.unsupported-construct',
        severity: 'info',
        message: `Construct "${meta?.label || item.id}" is beyond the ${prof.label || prof.id} profile`,
        range,
      });
    }

    return diagnostics;
  },
};

// --- Rule 8: TOC/bibliography marker integrity ---
export const markerIntegrityRule = {
  id: 'marker-integrity',
  title: 'Marker Integrity',
  description: 'Integrity of TOC and bibliography managed region HTML comment markers',
  run(text) {
    const str = String(text ?? '');
    const { lineRange } = lineIndex(str);
    const diagnostics = [];

    // 1. TOC regions
    const toc = findRegions(str);
    for (const prob of toc.problems) {
      diagnostics.push({
        id: `markers.toc.${prob.kind}`,
        severity: 'error',
        message: prob.message,
        range: lineRange(prob.line),
      });
    }

    // 2. Bibliography regions
    const bib = findBibRegions(str);
    for (const prob of bib.problems) {
      diagnostics.push({
        id: `markers.bib.${prob.kind}`,
        severity: 'error',
        message: prob.message,
        range: lineRange(prob.line),
      });
    }

    return diagnostics;
  },
};

export const BUILTIN_RULES = [
  markdownSyntaxRule,
  headingStructureRule,
  linksRule,
  imagesRule,
  frontmatterRule,
  tableStructureRule,
  extensionCompatibilityRule,
  markerIntegrityRule,
];
