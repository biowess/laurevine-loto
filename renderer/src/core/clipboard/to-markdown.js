import { TurndownService, gfm } from '../../../vendor/turndown.js';
import { sanitize } from '../markdown/sanitize.js';

let td = null;

// Clipboard HTML -> sanitised -> Markdown (links, lists, tables, code kept).
export function htmlToMarkdown(html) {
  if (!td) {
    td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**', hr: '---' });
    td.use(gfm);
  }
  return td.turndown(sanitize(html)).replace(/\n{3,}/g, '\n\n').trim();
}
