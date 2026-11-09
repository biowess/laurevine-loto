// Pure cross-reference detection, numbering, and validation for figures, tables, equations, and sections.
import { createSlugger } from '../markdown/slug.js';

const ANCHOR_TAG_RE = /<a\s+[^>]*?(?:id|name)=["']([^"']+)["'][^>]*>(?:\s*<\/a>)?/gi;
const PANDOC_ID_RE = /\{#([a-zA-Z0-9_:.#$%&*+?<>~/^-]+)\}\s*$/;
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const REF_LINK_RE = /\[([^\]\n]+)\]\(#([a-zA-Z0-9_:.#$%&*+?<>~/^-]+)\)/g;

function classifyKind(id, followingLines = []) {
  const lower = id.toLowerCase();
  if (/^(?:fig[-_:]|figure[-_:])/i.test(lower)) return 'figure';
  if (/^(?:tbl[-_:]|tab[-_:]|table[-_:])/i.test(lower)) return 'table';
  if (/^(?:eq[-_:]|eqn[-_:]|equation[-_:])/i.test(lower)) return 'equation';
  if (/^(?:sec[-_:]|section[-_:])/i.test(lower)) return 'section';

  for (const raw of followingLines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^!\[.*\]\(.*\)/.test(line) || /^<(?:figure|img)\b/i.test(line)) return 'figure';
    if (/^\|/.test(line) || /^<table\b/i.test(line)) return 'table';
    if (/^\$\$/.test(line) || /^\\begin\{(?:equation|align|gather)\}/.test(line)) return 'equation';
    if (/^#{1,6}\s+/.test(line)) return 'section';
    break;
  }
  return 'section';
}

function extractCaption(kind, followingLines = []) {
  for (const raw of followingLines) {
    const line = raw.trim();
    if (!line) continue;
    if (kind === 'figure') {
      const img = /^!\[(.*?)\]/.exec(line);
      if (img && img[1]) return img[1].trim();
      const cap = /<figcaption>(.*?)<\/figcaption>/i.exec(line);
      if (cap) return cap[1].trim();
    } else if (kind === 'table') {
      if (line.startsWith('|')) {
        const cells = line.split('|').map((s) => s.trim()).filter(Boolean);
        if (cells.length) return cells.join(' | ');
      }
    } else if (kind === 'equation') {
      const eq = line.replace(/^\$\$|\$\$$/g, '').trim();
      if (eq) return eq;
    } else if (kind === 'section') {
      const h = /^#{1,6}\s+(.*)/.exec(line);
      if (h) return h[1].replace(PANDOC_ID_RE, '').trim();
    }
    return line.slice(0, 80);
  }
  return '';
}

const REF_RE = /^(?:[Ff]ig(?:ure)?|[Tt]ab(?:le)?|[Ss]ec(?:tion)?)\b\.?(?:\s*[0-9A-Z][\w.-]{0,8})?$|^§\s*[\w.-]{0,8}$/;
const KIND_RE = { figure: /^[Ff]ig/, table: /^[Tt]ab/, section: /^(?:[Ss]ec|§)/ };
const DEFAULT_LABEL = { figure: 'Figure', table: 'Table', section: 'Section' };

export const isRefText = (text) => REF_RE.test(String(text).trim());

// Export-time: new link text for a reference like "Figure 1" once the final number is known; null when the text is not a numbered-reference label.
export function renumberRef(text, kind, num, labels = {}) {
  const t = String(text).trim();
  if (!REF_RE.test(t) || !KIND_RE[kind] || !KIND_RE[kind].test(t)) return null;
  return t.startsWith('§') ? `§ ${num}` : `${labels[kind] || DEFAULT_LABEL[kind]} ${num}`;
}

export function formatCrossReference(target, customLabel) {
  const lbl = customLabel || target.label || `${target.kind} ${target.num}`;
  return `[${lbl}](#${target.id})`;
}

// Scans document text for labelled targets, computes numbers, and identifies duplicate and missing references.
export function scanCrossReferences(text, { strategy = 'github' } = {}) {
  const lines = String(text ?? '').split(/\r?\n/);
  const rawTargets = [];
  const idOccurrences = new Map();

  let inFrontmatter = false;
  let inCode = false;
  const slugger = createSlugger(strategy);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (i === 0 && /^---\s*$/.test(trimmed)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (/^(?:---|\.\.\.)\s*$/.test(trimmed)) inFrontmatter = false;
      continue;
    }

    if (/^ {0,3}(?:`{3,}|~{3,})/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    // 1. Check explicit anchors: <a id="..."></a>
    ANCHOR_TAG_RE.lastIndex = 0;
    let m;
    while ((m = ANCHOR_TAG_RE.exec(line)) !== null) {
      const id = m[1];
      const nextLines = lines.slice(i + 1, i + 4);
      const kind = classifyKind(id, nextLines);
      const title = extractCaption(kind, nextLines);

      rawTargets.push({
        id,
        kind,
        title,
        line: i + 1,
        explicit: true,
      });

      const list = idOccurrences.get(id) || [];
      list.push(i + 1);
      idOccurrences.set(id, list);
    }

    // 2. Check headings for section targets
    const atx = ATX_RE.exec(line);
    if (atx) {
      const rawHeading = (atx[2] || '').trim();
      const pandocId = PANDOC_ID_RE.exec(rawHeading);
      const headingText = rawHeading.replace(PANDOC_ID_RE, '').trim();
      const id = pandocId ? pandocId[1] : slugger.slug(headingText || 'section');
      const level = atx[1].length;

      // If this heading was immediately preceded by an explicit anchor on the previous line, reuse it
      const prev = rawTargets[rawTargets.length - 1];
      if (prev && prev.line === i && prev.kind === 'section') {
        prev.title = prev.title || headingText;
        prev.level = level;
      } else {
        rawTargets.push({
          id,
          kind: 'section',
          title: headingText,
          level,
          line: i + 1,
          explicit: Boolean(pandocId),
        });

        const list = idOccurrences.get(id) || [];
        list.push(i + 1);
        idOccurrences.set(id, list);
      }
    }
  }

  // Compute numbers for each kind
  let figCount = 0;
  let tblCount = 0;
  let eqCount = 0;
  const secCounters = [0, 0, 0, 0, 0, 0];

  const figures = [];
  const tables = [];
  const equations = [];
  const sections = [];
  const targets = [];
  const targetMap = new Map();

  for (const t of rawTargets) {
    if (t.kind === 'figure') {
      figCount++;
      t.num = figCount;
      t.label = `Figure ${figCount}`;
      figures.push(t);
    } else if (t.kind === 'table') {
      tblCount++;
      t.num = tblCount;
      t.label = `Table ${tblCount}`;
      tables.push(t);
    } else if (t.kind === 'equation') {
      eqCount++;
      t.num = eqCount;
      t.label = `Equation ${eqCount}`;
      equations.push(t);
    } else if (t.kind === 'section') {
      const lvl = Math.min(6, Math.max(1, t.level || 1));
      secCounters[lvl - 1]++;
      for (let k = lvl; k < 6; k++) secCounters[k] = 0;
      const numStr = secCounters.slice(0, lvl).filter((n) => n > 0).join('.');
      t.num = numStr;
      t.label = `Section ${numStr}`;
      sections.push(t);
    }
    targets.push(t);
    if (!targetMap.has(t.id)) targetMap.set(t.id, t);
  }

  // Detect duplicate labels
  const duplicates = [];
  for (const [id, occurrences] of idOccurrences.entries()) {
    if (occurrences.length > 1) {
      duplicates.push({ id, count: occurrences.length, lines: occurrences });
    }
  }

  // Detect missing/unresolved internal anchor references
  const missing = [];
  inFrontmatter = false;
  inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (i === 0 && /^---\s*$/.test(trimmed)) { inFrontmatter = true; continue; }
    if (inFrontmatter) { if (/^(?:---|\.\.\.)\s*$/.test(trimmed)) inFrontmatter = false; continue; }
    if (/^ {0,3}(?:`{3,}|~{3,})/.test(line)) { inCode = !inCode; continue; }
    if (inCode) continue;

    const clean = line.replace(/`[^`\n]*`/g, '');
    REF_LINK_RE.lastIndex = 0;
    let m;
    while ((m = REF_LINK_RE.exec(clean)) !== null) {
      const targetId = m[2];
      if (!targetMap.has(targetId)) {
        missing.push({
          id: targetId,
          text: m[1],
          line: i + 1,
          raw: m[0],
        });
      }
    }
  }

  return {
    targets,
    figures,
    tables,
    equations,
    sections,
    targetMap,
    duplicates,
    missing,
  };
}
