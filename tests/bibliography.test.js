import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeLatex,
  stripBraces,
  parseAuthorName,
  parseAuthors,
  getInitials,
  normalizeEntry,
  parseBibTeX,
  parseCslJson,
  formatEntry,
  formatAuthorYear,
  formatNumbered,
  formatBibliography,
  formatCitation,
} from '../renderer/src/core/bibliography/index.js';

test('LaTeX decoder handles diacritics, symbols, escapes, and protective braces', () => {
  assert.equal(decodeLatex('Schr\\"odinger and G{\\"o}del'), 'Schrödinger and Gödel');
  assert.equal(decodeLatex('Fran\\c{c}ois and Ni\\v{c}'), 'François and Nič');
  assert.equal(decodeLatex('Kave\\v{c}ansk\\\'y and Bogus{\\l}awski'), 'Kavečanský and Bogusławski');
  assert.equal(decodeLatex('M\\aa l and Stra\\ss e and \\AE lfred'), 'Mål and Straße and Ælfred');
  assert.equal(decodeLatex('Page 10--20 --- full\\&final'), 'Page 10–20 — full&final');
  assert.equal(decodeLatex('The {NASA} and {DNA} sequences in {J}ournal'), 'The NASA and DNA sequences in Journal');
  assert.equal(decodeLatex('Mr.~Smith and \\$100'), 'Mr. Smith and $100');
  assert.equal(stripBraces('{A} {Simple} {Test}'), 'A Simple Test');
});

test('Author parser handles varied names, particles, and corporate authors', () => {
  const a1 = parseAuthorName('Knuth, Donald E.');
  assert.equal(a1.family, 'Knuth');
  assert.equal(a1.given, 'Donald E.');

  const a2 = parseAuthorName('Donald E. Knuth');
  assert.equal(a2.family, 'Knuth');
  assert.equal(a2.given, 'Donald E.');

  const a3 = parseAuthorName('Ludwig van Beethoven');
  assert.equal(a3.family, 'van Beethoven');
  assert.equal(a3.given, 'Ludwig');

  const a4 = parseAuthorName('{World Health Organization}');
  assert.equal(a4.family, 'World Health Organization');
  assert.equal(a4.literal, 'World Health Organization');

  const a5 = parseAuthorName('others');
  assert.equal(a5.family, 'others');

  assert.equal(getInitials('Donald Ervin'), 'D. E.');
  assert.equal(getInitials('Jean-Luc'), 'J.-L.');

  const authors = parseAuthors('Knuth, Donald E. and Lamport, Leslie and others');
  assert.equal(authors.length, 3);
  assert.equal(authors[0].family, 'Knuth');
  assert.equal(authors[1].family, 'Lamport');
  assert.equal(authors[2].family, 'others');

  const semiAuthors = parseAuthors('Turing, Alan; Church, Alonzo');
  assert.equal(semiAuthors.length, 2);
  assert.equal(semiAuthors[0].family, 'Turing');
  assert.equal(semiAuthors[1].family, 'Church');
});

test('BibTeX parser handles @string, comments, quotes, braces, and concatenation', () => {
  const bib = `
% Sample bibliography file
@STRING{ acm = "ACM Press" }
@STRING{ tpami = "IEEE Trans. PAMI" }

Text outside entries is safely ignored.

@ARTICLE{knuth1984,
  author = {Knuth, Donald E.},
  title = {Literate {P}rogramming},
  journal = tpami,
  volume = 27,
  number = 2,
  pages = {97--111},
  year = 1984,
  month = jan,
  publisher = acm # " / " # "Addison-Wesley",
  doi = {https://doi.org/10.1093/comjnl/27.2.97}
}

@BOOK(lamport1994,
  author = "Leslie Lamport",
  title = "LaTeX: A Document Preparation System",
  publisher = {Addison-Wesley},
  year = 1994,
)
`;

  const { entries, strings } = parseBibTeX(bib);
  assert.equal(entries.length, 2);

  const e1 = entries[0];
  assert.equal(e1.id, 'knuth1984');
  assert.equal(e1.type, 'article-journal');
  assert.equal(e1.title, 'Literate Programming');
  assert.equal(e1.authors.length, 1);
  assert.equal(e1.authors[0].family, 'Knuth');
  assert.equal(e1.authors[0].given, 'Donald E.');
  assert.equal(e1.containerTitle, 'IEEE Trans. PAMI');
  assert.equal(e1.volume, '27');
  assert.equal(e1.issue, '2');
  assert.equal(e1.pages, '97–111');
  assert.equal(e1.year, '1984');
  assert.equal(e1.publisher, 'ACM Press / Addison-Wesley');
  assert.equal(e1.doi, '10.1093/comjnl/27.2.97');

  const e2 = entries[1];
  assert.equal(e2.id, 'lamport1994');
  assert.equal(e2.type, 'book');
  assert.equal(e2.authors[0].family, 'Lamport');
  assert.equal(e2.authors[0].given, 'Leslie');
  assert.equal(e2.year, '1994');
});

test('BibTeX parser tolerates real-world quirks (missing comma, trailing comma, case)', () => {
  const messyBib = `
@INPROCEEDINGS{vaswani2017
  AUTHOR = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and others}
  TITLE = {Attention Is All You Need}
  booktitle = {Advances in Neural Information Processing Systems}
  Year = 2017,
  pages = 5998--6008,
}
`;
  const { entries } = parseBibTeX(messyBib);
  assert.equal(entries.length, 1);
  const entry = entries[0];
  assert.equal(entry.id, 'vaswani2017');
  assert.equal(entry.type, 'paper-conference');
  assert.equal(entry.title, 'Attention Is All You Need');
  assert.equal(entry.authors.length, 4);
  assert.equal(entry.authors[3].family, 'others');
  assert.equal(entry.year, '2017');
  assert.equal(entry.pages, '5998–6008');
});

test('CSL JSON parser extracts normalised entries', () => {
  const jsonStr = JSON.stringify([
    {
      id: 'shannon1948',
      type: 'article-journal',
      title: 'A Mathematical Theory of Communication',
      author: [
        { family: 'Shannon', given: 'Claude E.' },
      ],
      issued: {
        'date-parts': [[1948, 7]],
      },
      'container-title': 'Bell System Technical Journal',
      volume: '27',
      issue: '3',
      page: '379-423',
      DOI: '10.1002/j.1538-7305.1948.tb01338.x',
    },
  ]);

  const { entries, errors } = parseCslJson(jsonStr);
  assert.equal(errors.length, 0);
  assert.equal(entries.length, 1);

  const e = entries[0];
  assert.equal(e.id, 'shannon1948');
  assert.equal(e.type, 'article-journal');
  assert.equal(e.title, 'A Mathematical Theory of Communication');
  assert.equal(e.authors[0].family, 'Shannon');
  assert.equal(e.authors[0].given, 'Claude E.');
  assert.equal(e.year, '1948');
  assert.equal(e.containerTitle, 'Bell System Technical Journal');
  assert.equal(e.volume, '27');
  assert.equal(e.issue, '3');
  assert.equal(e.pages, '379–423');
  assert.equal(e.doi, '10.1002/j.1538-7305.1948.tb01338.x');
});

test('Author-year formatter produces plain text and HTML', () => {
  const entry = normalizeEntry({
    id: 'knuth1984',
    type: 'article-journal',
    title: 'Literate Programming',
    authors: [{ family: 'Knuth', given: 'Donald E.' }],
    year: '1984',
    containerTitle: 'The Computer Journal',
    volume: '27',
    issue: '2',
    pages: '97–111',
    doi: '10.1093/comjnl/27.2.97',
  });

  const plain = formatAuthorYear(entry, { format: 'text' });
  assert.equal(
    plain,
    'Knuth, D. E. (1984). Literate Programming. The Computer Journal, 27(2), 97–111. https://doi.org/10.1093/comjnl/27.2.97'
  );

  const html = formatAuthorYear(entry, { format: 'html' });
  assert.ok(html.includes('<div class="csl-entry" data-id="knuth1984">'));
  assert.ok(html.includes('<span class="csl-authors">Knuth, D. E.</span>'));
  assert.ok(html.includes('<span class="csl-year">(1984)</span>.'));
  assert.ok(html.includes('<span class="csl-title">Literate Programming</span>.'));
  assert.ok(html.includes('<em class="csl-container">The Computer Journal</em>'));
  assert.ok(html.includes('<a class="csl-doi" href="https://doi.org/10.1093/comjnl/27.2.97">'));
});

test('Numbered formatter produces plain text and HTML', () => {
  const entry = normalizeEntry({
    id: 'knuth1984',
    type: 'article-journal',
    title: 'Literate Programming',
    authors: [{ family: 'Knuth', given: 'Donald E.' }],
    year: '1984',
    containerTitle: 'The Computer Journal',
    volume: '27',
    issue: '2',
    pages: '97–111',
    doi: '10.1093/comjnl/27.2.97',
  });

  const plain = formatNumbered(entry, { format: 'text', number: 1 });
  assert.equal(
    plain,
    '[1] D. E. Knuth, "Literate Programming," The Computer Journal, vol. 27, no. 2, pp. 97–111, 1984. doi: 10.1093/comjnl/27.2.97.'
  );

  const html = formatNumbered(entry, { format: 'html', number: 1 });
  assert.ok(html.includes('<span class="csl-number">[1]</span>'));
  assert.ok(html.includes('<span class="csl-authors">D. E. Knuth</span>'));
  assert.ok(html.includes('&ldquo;<span class="csl-title">Literate Programming</span>,&rdquo;'));
  assert.ok(html.includes('vol. <span class="csl-volume">27</span>'));
  assert.ok(html.includes('pp. <span class="csl-pages">97–111</span>'));
});

test('Bibliography and citation formatters handle lists and sorting', () => {
  const e1 = normalizeEntry({
    id: 'lamport1994',
    type: 'book',
    title: 'LaTeX',
    authors: [{ family: 'Lamport', given: 'Leslie' }],
    year: '1994',
  });
  const e2 = normalizeEntry({
    id: 'knuth1984',
    type: 'book',
    title: 'The TeXbook',
    authors: [{ family: 'Knuth', given: 'Donald E.' }],
    year: '1984',
  });

  // Author-year citation
  assert.equal(formatCitation([e2, e1], { style: 'author-year' }), '(Knuth, 1984; Lamport, 1994)');
  assert.equal(formatCitation([e1], { style: 'numbered', numbers: [3] }), '[3]');

  // Bibliography sorting (Knuth before Lamport in author-year)
  const bibText = formatBibliography([e1, e2], { style: 'author-year', sort: true, format: 'text' });
  const lines = bibText.split('\n\n');
  assert.ok(lines[0].startsWith('Knuth'));
  assert.ok(lines[1].startsWith('Lamport'));

  // HTML bibliography wrapping
  const bibHtml = formatBibliography([e1], { style: 'numbered', format: 'html' });
  assert.ok(bibHtml.startsWith('<div class="csl-bib-body">'));
  assert.ok(bibHtml.includes('<span class="csl-number">[1]</span>'));
});
