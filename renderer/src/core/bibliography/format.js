// Pure author-year (APA/Harvard) and numbered (IEEE) bibliography and citation formatters.
// Produces plain text and semantic HTML.
// shortcut: handles standard monograph, journal, conference and chapter layouts; upgrade for specialized legal or patent bluebook rules

import { getInitials } from './model.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Format a single author name
export function formatAuthor(author, { inverted = true, initials = true } = {}) {
  if (!author) return '';
  if (author.literal) return author.literal;
  if (author.family === 'others') return 'et al.';

  const given = initials && author.given ? getInitials(author.given) : author.given;

  if (inverted) {
    return given ? `${author.family}, ${given}` : author.family;
  }
  return given ? `${given} ${author.family}` : author.family;
}

// Format a list of authors
export function formatAuthors(authors, { inverted = true, initials = true, etAlThreshold = 4, amp = true } = {}) {
  if (!authors || !authors.length) return '';

  const othersIdx = authors.findIndex((a) => a.family === 'others');
  const effective = othersIdx !== -1 ? authors.slice(0, othersIdx) : authors;
  const hasOthers = othersIdx !== -1;

  if (effective.length > etAlThreshold || hasOthers) {
    const first = formatAuthor(effective[0], { inverted, initials });
    return `${first} et al.`;
  }

  const formatted = effective.map((a, idx) =>
    formatAuthor(a, { inverted: inverted && idx === 0, initials })
  );

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) {
    const joiner = amp ? ' & ' : ' and ';
    return formatted.join(joiner);
  }

  const lastJoiner = amp ? ', & ' : ', and ';
  return `${formatted.slice(0, -1).join(', ')}${lastJoiner}${formatted[formatted.length - 1]}`;
}

// Ensure sentence punctuation ends cleanly with a period
function endWithPeriod(str) {
  if (!str) return '';
  const trimmed = str.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

// Format single entry in Author-Year (APA/Harvard-like) style
export function formatAuthorYear(entry, { format = 'text' } = {}) {
  const isHtml = format === 'html';
  const authorsStr = formatAuthors(entry.authors || [], { inverted: true, initials: true, amp: true }) || 'Anonymous';
  const yearStr = entry.year ? `(${entry.year})` : '(n.d.)';

  const isBookOrReport = ['book', 'thesis', 'report'].includes(entry.type);
  let titleStr = '';
  if (entry.title) {
    if (isHtml) {
      titleStr = isBookOrReport
        ? `<em class="csl-title">${escapeHtml(entry.title)}</em>.`
        : `<span class="csl-title">${escapeHtml(entry.title)}</span>.`;
    } else {
      titleStr = `${endWithPeriod(entry.title)}`;
    }
  }

  // Publication venue / container
  let containerPart = '';
  if (entry.containerTitle) {
    if (isHtml) {
      containerPart = `<em class="csl-container">${escapeHtml(entry.containerTitle)}</em>`;
      if (entry.volume) {
        containerPart += `, <span class="csl-volume">${escapeHtml(entry.volume)}</span>`;
        if (entry.issue) {
          containerPart += `(<span class="csl-issue">${escapeHtml(entry.issue)}</span>)`;
        }
      }
      if (entry.pages) {
        containerPart += `, <span class="csl-pages">${escapeHtml(entry.pages)}</span>`;
      }
      containerPart += '.';
    } else {
      let extra = '';
      if (entry.volume) {
        extra += `, ${entry.volume}`;
        if (entry.issue) extra += `(${entry.issue})`;
      }
      if (entry.pages) extra += `, ${entry.pages}`;
      containerPart = `${entry.containerTitle}${extra}.`;
    }
  } else if (entry.publisher) {
    const pub = entry.publisherPlace ? `${entry.publisherPlace}: ${entry.publisher}` : entry.publisher;
    containerPart = endWithPeriod(pub);
  }

  // Links: DOI or URL
  let linkPart = '';
  if (entry.doi) {
    const doiUrl = `https://doi.org/${entry.doi}`;
    linkPart = isHtml
      ? `<a class="csl-doi" href="${doiUrl}">${doiUrl}</a>`
      : doiUrl;
  } else if (entry.url) {
    linkPart = isHtml
      ? `<a class="csl-url" href="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</a>`
      : entry.url;
  }

  const parts = [
    isHtml ? `<span class="csl-authors">${escapeHtml(authorsStr)}</span>` : authorsStr,
    isHtml ? `<span class="csl-year">${escapeHtml(yearStr)}</span>.` : `${yearStr}.`,
    titleStr,
    containerPart,
    linkPart,
  ].filter(Boolean);

  if (isHtml) {
    return `<div class="csl-entry" data-id="${escapeHtml(entry.id)}">${parts.join(' ')}</div>`;
  }
  return parts.join(' ');
}

// Format single entry in Numbered (IEEE-like) style
export function formatNumbered(entry, { format = 'text', number = 1 } = {}) {
  const isHtml = format === 'html';
  const prefix = isHtml
    ? `<span class="csl-number">[${number}]</span>`
    : `[${number}]`;

  const authorsStr = formatAuthors(entry.authors || [], { inverted: false, initials: true, amp: false });
  const isArticleOrChapter = ['article-journal', 'paper-conference', 'chapter'].includes(entry.type);

  let titleStr = '';
  if (entry.title) {
    if (isHtml) {
      titleStr = isArticleOrChapter
        ? `&ldquo;<span class="csl-title">${escapeHtml(entry.title)}</span>,&rdquo;`
        : `<em class="csl-title">${escapeHtml(entry.title)}</em>.`;
    } else {
      titleStr = isArticleOrChapter
        ? `"${entry.title},"`
        : `${endWithPeriod(entry.title)}`;
    }
  }

  let containerPart = '';
  if (entry.containerTitle) {
    if (isHtml) {
      containerPart = `<em class="csl-container">${escapeHtml(entry.containerTitle)}</em>`;
      if (entry.volume) containerPart += `, vol. <span class="csl-volume">${escapeHtml(entry.volume)}</span>`;
      if (entry.issue) containerPart += `, no. <span class="csl-issue">${escapeHtml(entry.issue)}</span>`;
      if (entry.pages) containerPart += `, pp. <span class="csl-pages">${escapeHtml(entry.pages)}</span>`;
      if (entry.year) containerPart += `, <span class="csl-year">${escapeHtml(entry.year)}</span>`;
      containerPart += '.';
    } else {
      let extra = '';
      if (entry.volume) extra += `, vol. ${entry.volume}`;
      if (entry.issue) extra += `, no. ${entry.issue}`;
      if (entry.pages) extra += `, pp. ${entry.pages}`;
      if (entry.year) extra += `, ${entry.year}`;
      containerPart = `${entry.containerTitle}${extra}.`;
    }
  } else if (entry.publisher) {
    const pub = entry.publisherPlace ? `${entry.publisherPlace}: ${entry.publisher}` : entry.publisher;
    const yearSuffix = entry.year ? `, ${entry.year}` : '';
    containerPart = `${pub}${yearSuffix}.`;
  } else if (entry.year) {
    containerPart = `${entry.year}.`;
  }

  let linkPart = '';
  if (entry.doi) {
    const doiUrl = `https://doi.org/${entry.doi}`;
    linkPart = isHtml
      ? `doi: <a class="csl-doi" href="${doiUrl}">${escapeHtml(entry.doi)}</a>.`
      : `doi: ${entry.doi}.`;
  } else if (entry.url) {
    linkPart = isHtml
      ? `[Online]. Available: <a class="csl-url" href="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</a>.`
      : `[Online]. Available: ${entry.url}.`;
  }

  const bodyParts = [
    authorsStr ? (isHtml ? `<span class="csl-authors">${escapeHtml(authorsStr)}</span>,` : `${authorsStr},`) : '',
    titleStr,
    containerPart,
    linkPart,
  ].filter(Boolean);

  if (isHtml) {
    return `<div class="csl-entry" data-id="${escapeHtml(entry.id)}">${prefix} ${bodyParts.join(' ')}</div>`;
  }
  return `${prefix} ${bodyParts.join(' ')}`;
}

// Format a single entry using specified style ('author-year' or 'numbered')
export function formatEntry(entry, { style = 'author-year', format = 'text', number = 1 } = {}) {
  if (style === 'numbered') {
    return formatNumbered(entry, { format, number });
  }
  return formatAuthorYear(entry, { format });
}

// Compare two entries for alphabetical sorting by author family name and year
function compareAuthorYear(a, b) {
  const famA = (a.authors && a.authors[0] && a.authors[0].family) || '';
  const famB = (b.authors && b.authors[0] && b.authors[0].family) || '';
  const cmp = famA.localeCompare(famB);
  if (cmp !== 0) return cmp;
  const yearA = a.year || '';
  const yearB = b.year || '';
  const yCmp = yearA.localeCompare(yearB);
  if (yCmp !== 0) return yCmp;
  return (a.title || '').localeCompare(b.title || '');
}

// Format an entire bibliography reference list
export function formatBibliography(entries, { style = 'author-year', format = 'text', sort = true } = {}) {
  if (!entries || !entries.length) {
    return format === 'html' ? '<div class="csl-bib-body"></div>' : '';
  }

  let list = [...entries];
  if (sort && style === 'author-year') {
    list.sort(compareAuthorYear);
  }

  const items = list.map((entry, idx) =>
    formatEntry(entry, { style, format, number: idx + 1 })
  );

  if (format === 'html') {
    return `<div class="csl-bib-body">\n${items.map((line) => `  ${line}`).join('\n')}\n</div>`;
  }
  return items.join('\n\n');
}

// Format in-text citation like (Knuth, 1984) or [1]
export function formatCitation(entryOrEntries, { style = 'author-year', format = 'text', numbers = [] } = {}) {
  const list = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries].filter(Boolean);
  if (!list.length) return '';

  const isHtml = format === 'html';

  if (style === 'numbered') {
    const nums = numbers.length ? numbers : list.map((_, i) => i + 1);
    const citeKeys = list.map((e) => e.id).filter(Boolean).join(',');
    const text = `[${nums.join(', ')}]`;
    return isHtml
      ? `<span class="csl-citation" data-cites="${escapeHtml(citeKeys)}">${escapeHtml(text)}</span>`
      : text;
  }

  // Author-year style: (Knuth, 1984; Lamport, 1994)
  const parts = list.map((e) => {
    const author = e.authors && e.authors[0] ? (e.authors[0].family || e.authors[0].literal || 'Anon.') : 'Anon.';
    const etAl = e.authors && e.authors.length > 2 ? ' et al.' : (e.authors && e.authors.length === 2 ? ` & ${e.authors[1].family}` : '');
    const yr = e.year || 'n.d.';
    return `${author}${etAl}, ${yr}`;
  });

  const citeKeys = list.map((e) => e.id).filter(Boolean).join(',');
  const text = `(${parts.join('; ')})`;
  return isHtml
    ? `<span class="csl-citation" data-cites="${escapeHtml(citeKeys)}">${escapeHtml(text)}</span>`
    : text;
}
