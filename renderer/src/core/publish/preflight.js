// Export preflight: runs before export and live in Studio.
// Pure — takes already-built data, returns findings sorted by severity then path/line.
// findings: { severity: 'error'|'warning'|'info', kind, message, fix?, docId?, path?, line? }
// errors block export; warnings/info do not.

import { paletteContrast } from './palette-contrast.js';
import { detect, beyondProfile, CONSTRUCTS } from '../markdown/portability.js';
import { getProfile, DEFAULT_PROFILE } from '../markdown/profiles.js';
import { splitFrontmatter } from '../markdown/frontmatter.js';
import { paginationSummary } from './pagination-report.js';

// ── 1. Required assets readable ────────────────────────────────────────────
// Asset warnings already arrive as { kind:'asset'|'remote', message, line } in buildPublication warnings;
// we convert them here so callers that have only the warnings array can feed them directly.
function assetFindings(buildWarnings) {
  return buildWarnings
    .filter((w) => w.kind === 'asset' || w.kind === 'remote')
    .map((w) => ({
      severity: w.kind === 'asset' ? 'error' : 'warning',
      kind: 'asset',
      message: w.message,
      fix: w.kind === 'asset' ? 'Add the missing file or update the image path.' : 'Embed the image locally to avoid external requests.',
      docId: w.docId || '',
      path: w.path || '',
      line: w.line || 0,
    }));
}

// ── 2. Font availability & glyph coverage ──────────────────────────────────
// Font warnings come from fontWarnings() in studio/font-warning.js; convert strings to findings.
function fontFindings(fontWarningStrings) {
  return fontWarningStrings.map((msg) => ({
    severity: 'warning',
    kind: 'font',
    message: msg,
    fix: 'Add the missing characters or choose a font with broader coverage.',
  }));
}

// ── 3. Unsupported syntax for the target output ────────────────────────────
// App-specific constructs (wikilinks, embeds, pagebreak) are stripped or rendered oddly in other consumers.
// For export we warn on wikilinks/embeds that survived to HTML as literal text.
function syntaxFindings(docs, cfg) {
  const profile = typeof cfg?.markdown?.defaultProfile === 'string'
    ? getProfile(cfg.markdown.defaultProfile)
    : getProfile(DEFAULT_PROFILE);
  const out = [];
  for (const doc of (docs || [])) {
    const found = detect(doc.text || '');
    // Wiki embeds and wikilinks: they render as plain text in PDF if unresolved.
    for (const f of found) {
      const meta = CONSTRUCTS[f.id];
      if (!meta) continue;
      if (meta.level === 'app-specific' && (f.id === 'wikilink' || f.id === 'embed')) {
        out.push({
          severity: 'warning',
          kind: 'syntax',
          message: `${meta.label} at line ${f.line}: rendered as plain text in PDF. ${meta.note}`,
          fix: 'Convert to a standard Markdown link or image before exporting.',
          docId: doc.id || '',
          path: doc.path || '',
          line: f.line,
        });
      }
      // Raw HTML blocks that may be stripped by sanitisation.
      if (f.id === 'htmlblock') {
        out.push({
          severity: 'info',
          kind: 'syntax',
          message: `HTML block at line ${f.line}: raw HTML is sanitised and may be altered in PDF output.`,
          fix: 'Replace with Markdown equivalents where possible.',
          docId: doc.id || '',
          path: doc.path || '',
          line: f.line,
        });
      }
    }
  }
  return out;
}

// ── 4. Broken links & unresolved cross-references ─────────────────────────
// buildPublication already emits { kind:'section-rules', kind:'mermaid', … } warnings.
function linkFindings(buildWarnings, html) {
  const list = buildWarnings
    .filter((w) => w.kind === 'link' || w.kind === 'section-rules' || w.kind === 'citation')
    .map((w) => ({
      severity: 'warning',
      kind: w.kind,
      message: w.message,
      fix: 'Update or remove the broken reference.',
      docId: w.docId || '',
      path: w.path || '',
      line: w.line || 0,
    }));
  if (html && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const ids = new Set([...doc.querySelectorAll('[id]')].map((e) => e.id));
      for (const a of doc.querySelectorAll('a[href^="#"]')) {
        const target = a.getAttribute('href').slice(1);
        if (target && !ids.has(target) && !list.some((w) => w.message.includes(target))) {
          list.push({
            severity: 'warning',
            kind: 'link',
            message: `Broken link: anchor "#${target}" not found.`,
            fix: 'Update or remove the broken link.',
            docId: '',
            path: '',
            line: 0,
          });
        }
      }
    } catch { /* ignore */ }
  }
  return list;
}

// ── 5. Math & Mermaid failures ─────────────────────────────────────────────
function renderFindings(buildWarnings) {
  return buildWarnings
    .filter((w) => w.kind === 'mermaid' || w.kind === 'math')
    .map((w) => ({
      severity: 'error',
      kind: w.kind,
      message: w.message,
      fix: w.kind === 'mermaid' ? 'Fix the Mermaid diagram syntax.' : 'Check the LaTeX expression for errors.',
      docId: w.docId || '',
      path: w.path || '',
      line: w.line || 0,
    }));
}

// ── 6. Oversized tables & figures ─────────────────────────────────────────
const TABLE_COL_LIMIT = 10, TABLE_ROW_LIMIT = 100;
function tableFindings(html) {
  if (!html) return [];
  const out = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const t of doc.querySelectorAll('table')) {
    const rows = t.querySelectorAll('tr');
    const cols = rows[0] ? rows[0].querySelectorAll('th,td').length : 0;
    if (cols > TABLE_COL_LIMIT) out.push({ severity: 'warning', kind: 'table', message: `Wide table (${cols} columns): may overflow the page margin.`, fix: 'Consider splitting the table or using landscape orientation.' });
    if (rows.length > TABLE_ROW_LIMIT) out.push({ severity: 'info', kind: 'table', message: `Long table (${rows.length} rows): may span many pages.`, fix: 'Consider breaking it into smaller sections.' });
  }
  return out;
}

// ── 7. Palette contrast ────────────────────────────────────────────────────
function contrastFindings(cfg) {
  if (!cfg?.palette) return [];
  return paletteContrast(cfg.palette)
    .filter((r) => r.pass === false)
    .map((r) => ({
      severity: 'warning',
      kind: 'contrast',
      message: `${r.name}: contrast ${r.ratio.toFixed(2)} below ${r.need} (WCAG ${r.large ? 'AA large' : 'AA'}).`,
      fix: 'Open the Palette panel and use "Auto-fix contrast" to adjust colours.',
    }));
}

// ── 8. Pagination report ───────────────────────────────────────────────────
function paginationFindings(issues) {
  if (!issues || !issues.length) return [];
  return issues.map((i) => ({
    severity: 'info',
    kind: 'pagination',
    message: `Page ${i.page}: ${({ heading: 'stranded heading', fragment: 'single-line fragment', empty: 'near-empty page' })[i.kind] || i.kind}.`,
    fix: 'Adjust page breaks or content around this page.',
  }));
}

// ── 9. Empty sections ──────────────────────────────────────────────────────
function emptySectionFindings(docs) {
  const out = [];
  for (const doc of (docs || [])) {
    const { body } = splitFrontmatter(doc.text || '');
    if (!body.trim()) out.push({ severity: 'warning', kind: 'empty', message: `Section "${doc.name || doc.id}" has no content.`, fix: 'Add content or exclude this section.', docId: doc.id || '', path: doc.path || '', line: 1 });
  }
  return out;
}

// ── 10. Missing metadata ───────────────────────────────────────────────────
function metadataFindings(cfg) {
  const m = cfg?.metadata;
  if (!m) return [];
  const out = [];
  if (!m.title) out.push({ severity: 'info', kind: 'metadata', message: 'No export title set; the first heading will be used.', fix: 'Set a title in the Structure panel → Metadata.' });
  if (!m.author) out.push({ severity: 'info', kind: 'metadata', message: 'No author set; PDF metadata will be empty.', fix: 'Set an author in the Structure panel → Metadata.' });
  return out;
}

// ── Main entry ─────────────────────────────────────────────────────────────
// opts: { docs, config, html, buildWarnings, paginationIssues, fontWarningStrings }
// Returns { findings, errors, warnings, blockingCount }
// findings are sorted: error > warning > info, then by path/line.
export function runPreflight({ docs = [], config = {}, html = '', buildWarnings = [], paginationIssues = [], fontWarningStrings = [] } = {}) {
  const all = [
    ...assetFindings(buildWarnings),
    ...fontFindings(fontWarningStrings),
    ...syntaxFindings(docs, config),
    ...linkFindings(buildWarnings, html),
    ...renderFindings(buildWarnings),
    ...tableFindings(html),
    ...contrastFindings(config),
    ...paginationFindings(paginationIssues),
    ...emptySectionFindings(docs),
    ...metadataFindings(config),
  ];
  const SEV = { error: 0, warning: 1, info: 2 };
  const findings = all.sort((a, b) => (SEV[a.severity] ?? 2) - (SEV[b.severity] ?? 2) || (a.path || '').localeCompare(b.path || '') || (a.line || 0) - (b.line || 0));
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity !== 'error');
  const strictness = config?.preflightStrictness || 'warn';
  const blockingCount = strictness === 'off' ? 0 : strictness === 'strict' ? findings.length : errors.length;
  return { findings, errors, warnings, blockingCount };
}

// Thin summary for the status bar / toast.
export function preflightSummary({ findings }) {
  const e = findings.filter((f) => f.severity === 'error').length;
  const w = findings.filter((f) => f.severity === 'warning').length;
  if (!e && !w) return '✓ Preflight passed';
  const parts = [];
  if (e) parts.push(`${e} error${e === 1 ? '' : 's'}`);
  if (w) parts.push(`${w} warning${w === 1 ? '' : 's'}`);
  return `Preflight: ${parts.join(', ')}`;
}
