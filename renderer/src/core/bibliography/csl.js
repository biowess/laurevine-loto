// Pure CSL JSON (Citation Style Language JSON) parser.
// shortcut: extracts primary year from date-parts, upgrade if full ISO date ranges needed

import { normalizeEntry } from './model.js';

function extractCslYear(issued) {
  if (!issued) return '';
  if (Array.isArray(issued['date-parts']) && issued['date-parts'].length > 0) {
    const firstPart = issued['date-parts'][0];
    if (firstPart && firstPart[0] != null) {
      return String(firstPart[0]);
    }
  }
  const raw = issued.raw || issued.literal || '';
  if (typeof raw === 'string') {
    const match = raw.match(/\b([12]\d{3})\b/);
    if (match) return match[1];
  }
  return '';
}

export function parseCslJson(input) {
  if (!input) return { entries: [], errors: [] };

  let data = input;
  const errors = [];

  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (err) {
      return { entries: [], errors: [`Invalid JSON: ${err.message}`] };
    }
  }

  const items = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
  const entries = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const year = extractCslYear(item.issued);

    const entry = normalizeEntry({
      id: item.id != null ? String(item.id) : '',
      type: item.type || 'misc',
      title: item.title || item['title-short'] || '',
      authors: item.author || [],
      editors: item.editor || [],
      year,
      date: item.issued && (item.issued.raw || item.issued.literal) ? String(item.issued.raw || item.issued.literal) : year,
      containerTitle: item['container-title'] || item['collection-title'] || '',
      volume: item.volume,
      issue: item.issue || item.number,
      pages: item.page || item['page-first'],
      publisher: item.publisher,
      publisherPlace: item['publisher-place'],
      doi: item.DOI || item.doi,
      url: item.URL || item.url,
      isbn: item.ISBN || item.isbn,
      issn: item.ISSN || item.issn,
      abstract: item.abstract,
      edition: item.edition,
      raw: item,
    });

    entries.push(entry);
  }

  return { entries, errors };
}
