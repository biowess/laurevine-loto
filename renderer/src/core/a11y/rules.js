// Pure accessibility rules: heading hierarchy, image alt text, link labels, table headers.
// runA11y(text, only?) -> [{ cat, id, severity: error|warning|info, message, line }] sorted by line (1-based).
import { lineIndex, findCodeRanges } from '../diagnostics/rules.js';
import { extractHeadings } from '../toc/headings.js';
import { splitFrontmatter } from '../markdown/frontmatter.js';
import { isDelimiter, splitRow } from '../table/parse.js';

export const CATS = { headings: 'Heading hierarchy', alt: 'Image alt text', links: 'Link labels', tables: 'Table headers' };
const VAGUE = /^(click here|click|here|this|this link|link|read more|more|learn more|details|see here|url)$/i;
const BAD_ALT = /^(image|img|picture|photo|graphic|screenshot|untitled|[\w-]+\.(png|jpe?g|gif|svg|webp))$/i;
const clean = (s) => s.replace(/[*_`~]/g, '').trim();
const add = (out, cat, id, severity, message, line) => out.push({ cat, id: 'a11y.' + id, severity, message, line });

function scan(text) {
  const { lines, starts } = lineIndex(text), code = findCodeRanges(text), skip = splitFrontmatter(text).raw.length;
  const bad = (p) => p < skip || code.some(([s, e]) => p >= s && p < e);
  const line = (p) => { let i = starts.length - 1; while (i > 0 && starts[i] > p) i--; return i + 1; };
  return { lines, starts, bad, line };
}

function headings(text) {
  const hs = extractHeadings(text), out = [];
  let prev = 0;
  if (!hs.length && text.trim().length > 1500) add(out, 'headings', 'heading-none', 'info', 'Long document has no headings', 1);
  for (const h of hs) {
    if (!prev && h.level !== 1) add(out, 'headings', 'heading-first', 'warning', `First heading is H${h.level}, not H1`, h.line + 1);
    if (!h.text.trim()) add(out, 'headings', 'heading-empty', 'error', 'Empty heading', h.line + 1);
    if (prev && h.level > prev + 1) add(out, 'headings', 'heading-skip', 'warning', `Heading level skips from H${prev} to H${h.level}`, h.line + 1);
    prev = h.level;
  }
  return out;
}

function alt(text, s) {
  const out = [], re = /!\[([^\]\n]*)\]\(([^)\n]*)\)/g, img = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(text))) {
    if (s.bad(m.index)) continue;
    const a = clean(m[1]);
    if (!a) add(out, 'alt', 'alt-missing', 'error', 'Image has no alt text', s.line(m.index));
    else if (BAD_ALT.test(a)) add(out, 'alt', 'alt-vague', 'warning', `Alt text "${a}" does not describe the image`, s.line(m.index));
  }
  while ((m = img.exec(text))) if (!s.bad(m.index) && !/\balt\s*=/i.test(m[0])) add(out, 'alt', 'alt-missing', 'error', '<img> has no alt attribute', s.line(m.index));
  return out;
}

function links(text, s) {
  const out = [], seen = new Map(), re = /(!?)\[([^\]\n]*)\]\(\s*<?([^)\s>]*)>?[^)\n]*\)/g;
  const bare = /<(https?:\/\/[^>\s]+)>|(?<![(\]<"'=[\w])https?:\/\/[^\s<>)\]]+/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] || s.bad(m.index)) continue;
    const label = clean(m[2]), ln = s.line(m.index), url = m[3].replace(/\/$/, '');
    if (!label) { add(out, 'links', 'link-empty', 'error', 'Link has no text', ln); continue; }
    if (/^(https?:\/\/|www\.)\S+$/i.test(label)) add(out, 'links', 'link-url', 'warning', 'Link text is a bare URL; describe the destination', ln);
    else if (VAGUE.test(label)) add(out, 'links', 'link-vague', 'warning', `Link text "${label}" is not descriptive`, ln);
    const key = label.toLowerCase(), f = seen.get(key);
    if (!f) seen.set(key, { url, ln, more: new Set() });
    else if (f.url !== url && !f.more.has(url)) {
      f.more.add(url);
      add(out, 'links', 'link-duplicate', 'warning', `Label "${label}" links to a different target than on line ${f.ln}`, ln);
    }
  }
  while ((m = bare.exec(text))) {
    const ln = s.line(m.index);
    if (!s.bad(m.index) && !/^\s*\[[^\]]+\]:/.test(s.lines[ln - 1])) add(out, 'links', 'link-bare', 'info', 'Bare URL; use descriptive link text', ln);
  }
  return out;
}

function tables(text, s) {
  const out = [], L = s.lines, re = /<table\b[\s\S]*?<\/table>/gi;
  let m;
  for (let j = 0; j < L.length; j++) {
    if (!L[j].includes('|') || !isDelimiter(L[j]) || s.bad(s.starts[j])) continue;
    if (!j || !L[j - 1].trim()) add(out, 'tables', 'table-header', 'error', 'Table has no header row', j + 1);
    else if (L[j - 1].includes('|') && splitRow(L[j - 1]).every((c) => !c.trim())) add(out, 'tables', 'table-header', 'error', 'Table header row is empty', j);
  }
  while ((m = re.exec(text))) if (!s.bad(m.index) && !/<th[\s>]/i.test(m[0])) add(out, 'tables', 'table-header', 'error', 'HTML table has no header cells (<th>)', s.line(m.index));
  return out;
}

const RUNNERS = { headings, alt, links, tables };

export function runA11y(text, only) {
  const t = String(text ?? ''), s = scan(t);
  return Object.entries(RUNNERS).filter(([c]) => !only || c === only).flatMap(([, f]) => f(t, s)).sort((a, b) => a.line - b.line);
}
