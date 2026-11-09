// Pure Pandoc citation parsing, managed bibliography regions, and document analysis.
import { formatAuthorYear, formatNumbered } from './format.js';

const START_RE = /^ {0,3}<!--\s*laurevine:bibliography:start(?:\s+(\{.*\}))?\s*-->\s*$/;
const END_RE = /^ {0,3}<!--\s*laurevine:bibliography:end\s*-->\s*$/;

// Matches pandoc bracketed citations: [@key], [@key, p. 12], [-@key], [@k1; @k2]
const BRACKET_CITE_RE = /\[((?:[^[\]\n]*?)?(-?@[a-zA-Z0-9_:.#$%&*+?<>~/^-]+[^\]\n]*))\](?![\[\(:])/g;
// Matches individual citation item inside bracket: [see @key, p. 12; -@key2]
const ITEM_RE = /^\s*(?:(.*?)\s+)?(-?@)([a-zA-Z0-9_:.#$%&*+?<>~/^-]+)(?:,\s*([^;]+))?\s*$/;
// Matches in-text citation: @key or @key [p. 12]
const INTEXT_CITE_RE = /(?:^|[^\w@])@([a-zA-Z0-9_:.#$%&*+?<>~/^-]+)(?:\s*\[([^\]\n]*)\])?/g;

export function buildCitation(key, { locator = '', suppressAuthor = false } = {}) {
  const cleanKey = String(key || '').trim().replace(/^@+/, '');
  const prefix = suppressAuthor ? '-@' : '@';
  const loc = locator ? `, ${locator.trim()}` : '';
  return `[${prefix}${cleanKey}${loc}]`;
}

// Extract all citation keys and references used in document text outside code blocks and frontmatter.
export function extractCitations(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const citations = [];
  let inFrontmatter = false;
  let inCode = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (lineIdx === 0 && /^---\s*$/.test(trimmed)) {
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

    // Scan bracketed citations
    const cleanLine = line.replace(/`[^`\n]*`/g, '');
    let m;
    BRACKET_CITE_RE.lastIndex = 0;
    while ((m = BRACKET_CITE_RE.exec(cleanLine)) !== null) {
      const fullMatch = m[0];
      const inner = m[1];
      const parts = inner.split(';');
      for (const part of parts) {
        const itemMatch = ITEM_RE.exec(part.trim());
        if (itemMatch) {
          citations.push({
            key: itemMatch[3],
            line: lineIdx + 1,
            suppressAuthor: itemMatch[2] === '-@',
            prefix: (itemMatch[1] || '').trim(),
            locator: (itemMatch[4] || '').trim(),
            raw: fullMatch,
          });
        }
      }
    }

    // Scan in-text citations: @key or @key [p. 12] outside brackets
    const lineWithoutBrackets = cleanLine.replace(BRACKET_CITE_RE, '');
    INTEXT_CITE_RE.lastIndex = 0;
    while ((m = INTEXT_CITE_RE.exec(lineWithoutBrackets)) !== null) {
      citations.push({
        key: m[1],
        line: lineIdx + 1,
        suppressAuthor: false,
        prefix: '',
        locator: (m[2] || '').trim(),
        raw: m[0].trim(),
        inText: true,
      });
    }
  }

  return citations;
}

export function bibMarkers(options = {}) {
  const json = Object.keys(options).length ? ` ${JSON.stringify(options)}` : '';
  return {
    start: `<!-- laurevine:bibliography:start${json} -->`,
    end: '<!-- laurevine:bibliography:end -->',
  };
}

export function findBibRegions(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const regions = [];
  const problems = [];
  let open = null;
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const len = line.length + (i < lines.length - 1 ? 1 : 0);

    const st = START_RE.exec(line);
    if (st) {
      if (open) problems.push({ kind: 'nested-start', line: i, message: 'Nested bibliography start' });
      let opts = {};
      if (st[1]) {
        try { opts = JSON.parse(st[1]); } catch { /* ignore bad json */ }
      }
      open = { startLine: i, from: offset + line.length + 1, opts };
    } else if (END_RE.test(line)) {
      if (!open) {
        problems.push({ kind: 'orphan-end', line: i, message: 'Bibliography end without start' });
      } else {
        regions.push({ ...open, endLine: i, to: offset });
        open = null;
      }
    }

    offset += len;
  }

  if (open) problems.push({ kind: 'unclosed', line: open.startLine, message: 'Unclosed bibliography region' });
  return { regions, problems };
}

// Generate formatted bibliography markdown for entries.
export function generateBibliographyMarkdown(entries, { style = 'author-year', keys = null } = {}) {
  if (!entries || !entries.length) return '';
  let list = [...entries];

  if (keys) {
    const keySet = new Set(Array.isArray(keys) ? keys : [...keys]);
    if (keySet.size > 0) {
      list = list.filter((e) => keySet.has(e.id));
    }
  }

  if (!list.length) return '';

  if (style === 'author-year') {
    list.sort((a, b) => {
      const famA = (a.authors?.[0]?.family || '').toLowerCase();
      const famB = (b.authors?.[0]?.family || '').toLowerCase();
      const cmp = famA.localeCompare(famB);
      if (cmp !== 0) return cmp;
      return String(a.year || '').localeCompare(String(b.year || ''));
    });
  }

  return list
    .map((e, idx) => (style === 'numbered'
      ? formatNumbered(e, { format: 'text', number: idx + 1 })
      : formatAuthorYear(e, { format: 'text' })))
    .join('\n\n');
}

// Refresh all bibliography regions in text using loaded entries.
export function refreshBibliography(text, { entries = [], style = 'author-year' } = {}) {
  const { regions, problems } = findBibRegions(text);
  if (!regions.length) return { text, changed: false, regions, problems };

  const used = extractCitations(text).map((c) => c.key);
  const md = generateBibliographyMarkdown(entries, { style, keys: used.length ? used : null });
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let out = text;

  for (const r of [...regions].reverse()) {
    const ins = md ? md.replace(/\n/g, eol) + eol : '';
    out = out.slice(0, r.from) + ins + out.slice(r.to);
  }

  return { text: out, changed: out !== text, regions, problems };
}

// Insert or refresh a bibliography region in text.
export function planBibliography(text, { pos, entries = [], style = 'author-year' } = {}) {
  const { regions } = findBibRegions(text);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const used = extractCitations(text).map((c) => c.key);
  const md = generateBibliographyMarkdown(entries, { style, keys: used.length ? used : null });

  // If pos is inside an existing region, update it
  if (pos != null) {
    const existing = regions.find((r) => pos >= r.from && pos <= r.to);
    if (existing) {
      const ins = md ? md.replace(/\n/g, eol) + eol : '';
      const updated = text.slice(0, existing.from) + ins + text.slice(existing.to);
      return {
        text: updated,
        change: { from: existing.from, to: existing.to, insert: ins },
      };
    }
  }

  // Otherwise, create a new managed region
  const markers = bibMarkers({ style });
  const block = `${markers.start}${eol}${md ? md.replace(/\n/g, eol) + eol : ''}${markers.end}`;

  let insertPos = pos != null ? pos : text.length;
  let pre = '';
  let suf = '';

  if (insertPos > 0 && text[insertPos - 1] !== '\n') pre = `${eol}${eol}`;
  else if (insertPos > 1 && text[insertPos - 2] !== '\n') pre = eol;

  if (insertPos < text.length && text[insertPos] !== '\n') suf = `${eol}${eol}`;

  const insert = `${pre}${block}${suf}`;
  const out = text.slice(0, insertPos) + insert + text.slice(insertPos);
  return {
    text: out,
    change: { from: insertPos, to: insertPos, insert },
  };
}

// Analyzes the current document and bibliography for manager dialog.
export function analyzeBibliography({ text = '', entries = [], errors = [] } = {}) {
  const entryMap = new Map();
  const duplicates = [];

  for (const e of entries) {
    if (entryMap.has(e.id)) {
      duplicates.push(e.id);
    } else {
      entryMap.set(e.id, e);
    }
  }

  const usedCitations = extractCitations(text);
  const missingKeys = [];
  const seenMissing = new Set();

  for (const c of usedCitations) {
    if (!entryMap.has(c.key)) {
      missingKeys.push({ key: c.key, line: c.line });
      seenMissing.add(c.key);
    }
  }

  return {
    entries,
    entryMap,
    errors,
    duplicates,
    usedCitations,
    missingKeys,
  };
}

// Pure search over bibliography entries matching key, author, title, or year.
export function searchBibliography(entries = [], query = '') {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter((e) => {
    const idMatch = (e.id || '').toLowerCase().includes(q);
    const titleMatch = (e.title || '').toLowerCase().includes(q);
    const yearMatch = String(e.year || '').includes(q);
    const authMatch = (e.authors || []).some((a) =>
      (a.family || '').toLowerCase().includes(q) || (a.given || '').toLowerCase().includes(q)
    );
    return idMatch || titleMatch || yearMatch || authMatch;
  });
}

