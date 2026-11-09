// Normalised Bibliography Entry model and author parsing.
// shortcut: basic particles (van, von, de, der) handled, upgrade with full cultural name database if required

import { decodeLatex, stripBraces } from './latex.js';

const TYPE_MAP = {
  article: 'article-journal',
  'article-journal': 'article-journal',
  'article-magazine': 'article-magazine',
  'article-newspaper': 'article-newspaper',
  book: 'book',
  booklet: 'book',
  inbook: 'inbook',
  incollection: 'chapter',
  chapter: 'chapter',
  inproceedings: 'paper-conference',
  conference: 'paper-conference',
  'paper-conference': 'paper-conference',
  proceedings: 'book',
  mastersthesis: 'thesis',
  phdthesis: 'thesis',
  thesis: 'thesis',
  techreport: 'report',
  report: 'report',
  manual: 'report',
  webpage: 'webpage',
  online: 'webpage',
  web: 'webpage',
  'post-weblog': 'webpage',
  software: 'software',
  dataset: 'dataset',
  patent: 'patent',
  unpublished: 'manuscript',
  misc: 'misc',
};

const PARTICLES = new Set(['van', 'von', 'de', 'del', 'der', 'di', 'da', 'du', 'la', 'le']);

// Extract initials from given names, preserving hyphens: "Jean-Luc" -> "J.-L.", "Donald E." -> "D. E."
export function getInitials(given) {
  if (!given || typeof given !== 'string') return '';
  return given
    .split(/\s+/)
    .map((part) => {
      if (part.includes('-')) {
        return part.split('-').map((sub) => (sub[0] ? `${sub[0].toUpperCase()}.` : '')).join('-');
      }
      return part[0] ? `${part[0].toUpperCase()}.` : '';
    })
    .filter(Boolean)
    .join(' ');
}

// Parse a single author string into { family, given, literal }
export function parseAuthorName(name) {
  if (!name) return { family: '', given: '' };
  if (typeof name === 'object') {
    return {
      family: decodeLatex(name.family || name.lastName || name.name || ''),
      given: decodeLatex(name.given || name.firstName || ''),
      ...(name.literal ? { literal: decodeLatex(name.literal) } : {}),
    };
  }

  const trimmed = name.trim();
  if (!trimmed) return { family: '', given: '' };

  // Explicit literal / organization inside braces or keyword 'others'
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const lit = stripBraces(trimmed);
    return { family: lit, given: '', literal: lit };
  }
  if (trimmed.toLowerCase() === 'others') {
    return { family: 'others', given: '', literal: 'others' };
  }

  // Case 1: "Family, Given" or "von Family, Jr, Given"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => decodeLatex(p).trim());
    if (parts.length >= 3) {
      return { family: `${parts[0]}, ${parts[1]}`, given: parts[2] };
    }
    return { family: parts[0], given: parts[1] || '' };
  }

  // Case 2: "Given [Middle] [von] Family"
  const tokens = trimmed.split(/\s+/).map((t) => decodeLatex(t).trim()).filter(Boolean);
  if (tokens.length === 1) {
    return { family: tokens[0], given: '' };
  }

  // Detect lowercase prefix / particle (e.g., "Ludwig van Beethoven")
  let particleIdx = -1;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (PARTICLES.has(tokens[i].toLowerCase())) {
      particleIdx = i;
      break;
    }
  }

  if (particleIdx !== -1) {
    return {
      given: tokens.slice(0, particleIdx).join(' '),
      family: tokens.slice(particleIdx).join(' '),
    };
  }

  // Default: last token is family, preceding are given
  return {
    given: tokens.slice(0, -1).join(' '),
    family: tokens[tokens.length - 1],
  };
}

// Parse authors list from string ("A and B", "A; B") or array
export function parseAuthors(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(parseAuthorName).filter((a) => a.family || a.given || a.literal);
  }
  if (typeof input !== 'string') return [];

  // Split on ' and ' (BibTeX standard) or semicolon (common quirk)
  const delimiter = /\s+and\s+|;\s*/i;
  return input
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseAuthorName);
}

// Clean and normalize DOI string
export function cleanDoi(doi) {
  if (!doi || typeof doi !== 'string') return '';
  return doi
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
}

// Normalize page range with en-dash: "97-111", "97--111", "97 - 111" -> "97–111"
export function normalizePages(pages) {
  if (!pages || typeof pages !== 'string') return '';
  return pages.trim().replace(/\s*[-–—]+\s*/g, '–');
}

// Extract 4-digit year from date or year field
export function extractYear(raw = {}) {
  const src = raw.year || raw.date || raw.issued || '';
  if (typeof src === 'number') return String(src);
  if (typeof src === 'string') {
    const match = src.match(/\b([12]\d{3})\b/);
    return match ? match[1] : '';
  }
  return '';
}

// Normalize entry into uniform bibliography model
export function normalizeEntry(entry = {}) {
  const typeKey = (entry.type || 'misc').toLowerCase().trim();
  const type = TYPE_MAP[typeKey] || typeKey;

  const title = decodeLatex(entry.title || entry['title-short'] || '').trim();
  const authors = parseAuthors(entry.authors || entry.author);
  const editors = parseAuthors(entry.editors || entry.editor);

  const container = decodeLatex(
    entry.containerTitle ||
    entry['container-title'] ||
    entry.journal ||
    entry.journaltitle ||
    entry.booktitle ||
    entry['collection-title'] ||
    ''
  ).trim();

  const rawYear = extractYear(entry);
  const publisher = decodeLatex(entry.publisher || '').trim();
  const publisherPlace = decodeLatex(entry.publisherPlace || entry['publisher-place'] || entry.address || '').trim();
  const volume = entry.volume != null ? String(entry.volume).trim() : '';
  const issue = entry.issue != null ? String(entry.issue).trim() : (entry.number != null ? String(entry.number).trim() : '');
  const pages = normalizePages(entry.pages || entry.page || entry['page-first'] || '');
  const doi = cleanDoi(entry.doi || entry.DOI || '');
  const url = (entry.url || entry.URL || '').trim();
  const isbn = (entry.isbn || entry.ISBN || '').trim();
  const issn = (entry.issn || entry.ISSN || '').trim();
  const edition = entry.edition != null ? String(entry.edition).trim() : '';

  return {
    id: String(entry.id || entry.key || '').trim(),
    type,
    title,
    authors,
    editors,
    year: rawYear,
    date: entry.date ? String(entry.date).trim() : rawYear,
    containerTitle: container,
    volume,
    issue,
    pages,
    publisher,
    publisherPlace,
    doi,
    url,
    isbn,
    issn,
    edition,
    abstract: decodeLatex(entry.abstract || '').trim(),
    raw: entry.raw || entry,
  };
}
