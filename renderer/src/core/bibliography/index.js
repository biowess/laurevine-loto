// Pure bibliography tools for Laurevine Loto: BibTeX, CSL JSON, models and formatters.

export { decodeLatex, stripBraces } from './latex.js';
export {
  normalizeEntry,
  parseAuthorName,
  parseAuthors,
  getInitials,
  cleanDoi,
  normalizePages,
  extractYear,
} from './model.js';
export { parseBibTeX } from './bibtex.js';
export { parseCslJson } from './csl.js';
export {
  formatEntry,
  formatAuthorYear,
  formatNumbered,
  formatBibliography,
  formatCitation,
  formatAuthor,
  formatAuthors,
} from './format.js';
export {
  buildCitation,
  extractCitations,
  bibMarkers,
  findBibRegions,
  generateBibliographyMarkdown,
  refreshBibliography,
  planBibliography,
  analyzeBibliography,
  searchBibliography,
} from './citations.js';

