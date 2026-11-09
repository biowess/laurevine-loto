import { parseFrontmatter } from '../markdown/frontmatter.js';
import { findRegions } from '../toc/region.js';
import { scanLines } from '../toc/headings.js';
import { slugify } from '../markdown/slug.js';

export const DOCX_FROM = 'markdown+lists_without_preceding_blankline+autolink_bare_uris+emoji-raw_tex-yaml_metadata_block';

const LABEL = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution', info: 'Info', success: 'Success', question: 'Question', danger: 'Danger', bug: 'Bug', example: 'Example', quote: 'Quote' };
const CALLOUT = /^( {0,3}>[ \t]?)\[!([A-Za-z]+)\][+-]?[ \t]*(.*)$/;
const TOC_LINE = /^ {0,3}\[(?:TOC|toc)\]\s*$/;
const PAGEBREAK = /^ {0,3}<!--\s*laurevine:pagebreak\s*-->\s*$/;
const MERMAID = /^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid\b/i;
const PAGE_XML = ['', '```{=openxml}', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>', '```', ''];
const ENC = { '(': '%28', ')': '%29', ' ': '%20' };

const tidy = (s) => s
  .replace(/\\(?:tag|label)\*?\{[^}]*\}/g, '')
  .replace(/\\(?:nonumber|notag|displaystyle|textstyle|limits|nolimits)(?![A-Za-z])/g, '')
  .replace(/\\[dt]frac(?![A-Za-z])/g, '\\frac')
  .replace(/\\operatorname\*?\{/g, '\\mathrm{')
  .replace(/\\(?:boldsymbol|bm)\{/g, '\\mathbf{')
  .replace(/\\(begin|end)\{(?:align|alignat|eqnarray|split|gather|multline|flalign)\*?\}(?:\{\d+\})?/g, '\\$1{aligned}')
  .replace(/\\(?:begin|end)\{equation\*?\}/g, '');

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const safeImage = (s) => /^data:image\/(?:png|jpe?g|gif);base64,[A-Za-z0-9+/=]+$/i.test(s)
  || (s.length > 0 && !/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[\\/~]/.test(s) && !/(^|[\\/])\.\.([\\/]|$)/.test(decode(s)) && /\.(?:png|jpe?g|gif|bmp|tiff?|emf|wmf)(?:[?#].*)?$/i.test(s) && !s.includes('\0'));

// -> { markdown, metadata, toc, tocDepth, warnings: [{ kind, message, line, level: warn|info }] }. Pure; the source text is never changed.
export function prepareDocx(text, { config = null, resolveWiki = null } = {}) {
  const warnings = [];
  const warn = (kind, message, line = 0, level = 'warn') => warnings.push({ kind, message, line, level });
  const fm = parseFrontmatter(String(text ?? '')), body = fm.present ? fm.body : String(text ?? '');
  const offset = fm.present ? fm.raw.split('\n').length - 1 : 0;
  const metadata = {};
  for (const k of ['title', 'author', 'date']) {
    const v = Array.isArray(fm.data[k]) ? fm.data[k].join(', ') : fm.data[k];
    if (v != null && String(v).trim()) metadata[k] = String(v).replace(/[\0\r\n]+/g, ' ').trim().slice(0, 500);
  }
  if (fm.error) warn('frontmatter', 'Front matter could not be read, so title, author and date are left out.', 1);

  const ls = scanLines(body), drop = new Set();
  let toc = false, tocDepth = 3;
  const { regions, problems } = findRegions(body);
  if (!problems.some((p) => !p.region)) {
    regions.filter((r) => !r.error).forEach((r, i) => {
      for (let n = r.startLine; n <= r.endLine; n++) drop.add(n);
      if (i === 0) { toc = true; const d = Number(r.opts.depth ?? r.opts.maxDepth ?? r.opts.maxLevel); if (d >= 1 && d <= 6) tocDepth = d; }
    });
    if (regions.length > 1) warn('toc', 'Only one contents can be exported; the others are left out.', 0);
  }

  const items = [], n = { callout: 0, abbr: 0, html: 0, mermaid: 0 };
  let htmlLine = 0;
  ls.forEach(({ s, code, c }, i) => {
    if (drop.has(i)) return;
    if (code || c) {
      if (code && MERMAID.test(s)) { n.mermaid++; warn('mermaid', 'A Mermaid diagram is exported as a code block, not as a picture.', i + 1 + offset); }
      return items.push({ s, keep: true, i });
    }
    if (TOC_LINE.test(s)) { toc = true; return; }
    if (PAGEBREAK.test(s)) return PAGE_XML.forEach((x) => items.push({ s: x, keep: true, i }));
    if (/^ {0,3}\*\[[^\]\n]+\]:/.test(s)) { n.abbr++; return; }
    const m = CALLOUT.exec(s), type = m && m[2].toLowerCase();
    if (m && Object.hasOwn(LABEL, type)) {
      n.callout++;
      const title = m[3].trim();
      items.push({ s: `${m[1]}**${LABEL[type]}${title ? `: ${title.replace(/\*/g, '')}` : ''}**`, keep: true, i });
      if (ls[i + 1] && /^ {0,3}>/.test(ls[i + 1].s)) items.push({ s: m[1].trimEnd(), keep: true, i });
      return;
    }
    if (/^ {0,3}<\/?[A-Za-z][\w-]*(?:\s|\/?>)/.test(s)) { n.html++; htmlLine ||= i + 1 + offset; }
    items.push({ s, keep: false, i });
  });

  const count = { wikiText: 0, wikiLink: 0, embed: 0, img: 0, fn: 0, cite: 0, macro: 0 };
  const inline = (raw, start) => {
    const spans = [], at = (idx) => start + offset + raw.slice(0, idx).split('\n').length;
    let t = raw.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, (m) => `\u0000${spans.push(m) - 1}\u0000`);
    if (/\[\^[^\]\s]+\]/.test(t)) count.fn++;
    if (/\[@[^\]\s][^\]]*\]/.test(t)) count.cite++;
    t = t.replace(/(!?)\[\[([^\]\n|#]*)(?:#([^\]\n|]*))?(?:\|([^\]\n]*))?\]\]/g, (m, bang, target, anchor = '', alias = '') => {
      target = target.trim(); anchor = anchor.trim();
      const label = (alias.trim() || [target, anchor].filter(Boolean).join(' › ')).replace(/[[\]]/g, '');
      if (bang) { count.embed++; return label; }
      const href = !target && anchor ? `#${slugify(anchor)}` : (resolveWiki ? resolveWiki(target, anchor) : null);
      if (label && href) { count.wikiLink++; return `[${label}](${String(href).replace(/[() ]/g, (ch) => ENC[ch])})`; }
      count.wikiText++;
      return label;
    });
    t = t.replace(/!\[([^\]\n]*)\]\(\s*<?([^)\s>]*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g, (m, alt, src, idx) => {
      if (safeImage(src)) return m;
      count.img++;
      warn('image', `Image not embedded (remote, outside the document folder or unsupported type): ${src.slice(0, 60) || 'empty path'}`, at(idx));
      return `*[image${alt ? `: ${alt.replace(/[*_[\]]/g, '')}` : ''} not embedded]*`;
    });
    t = t.replace(/\$\$([\s\S]+?)\$\$|(?<![\\$\w])\$(?![\s$])((?:\\.|[^$\n\\])+?)(?<![\s\\])\$(?!\d)/g, (m, d, i, idx) => {
      if (/\\(?:re)?newcommand|\\def(?![A-Za-z])|\\ce\{/.test(m) && !count.macro++) warn('math', 'Custom TeX macros and chemistry commands are not expanded in equations.', at(idx));
      return d !== undefined ? `$$${tidy(d)}$$` : `$${tidy(i)}$`;
    });
    return t.replace(/\u0000(\d+)\u0000/g, (m, k) => spans[+k]);
  };

  const out = [];
  let run = [], runStart = 0;
  const flush = () => { if (run.length) out.push(inline(run.join('\n'), runStart)); run = []; };
  for (const it of items) {
    if (it.keep) { flush(); out.push(it.s); } else { if (!run.length) runStart = it.i; run.push(it.s); }
  }
  flush();

  if (n.callout) warn('callout', `${n.callout} callout${n.callout === 1 ? '' : 's'} became labelled block quotes (no coloured box or folding).`, 0, 'info');
  if (count.wikiLink + count.wikiText) warn('wiki', `${count.wikiLink + count.wikiText} wiki-link${count.wikiLink + count.wikiText === 1 ? '' : 's'} exported as links or plain text; targets in other notes are not followed.`, 0, 'info');
  if (count.embed) warn('wiki', 'Embedded notes (![[…]]) are exported as their name only.', 0);
  if (n.abbr) warn('abbr', 'Abbreviation definitions are not expanded in Word.', 0, 'info');
  if (n.html) warn('html', 'Raw HTML blocks are dropped by the Word writer.', htmlLine);
  if (count.fn) warn('footnote', 'Footnotes become Word footnotes; numbering and placement follow Word and can differ from the preview.', 0, 'info');
  if (count.cite) warn('citation', 'Citations stay as typed text; no bibliography is generated.', 0, 'info');
  if (toc) warn('toc', 'The contents is a Word field placed at the start of the document; open it in Word and update fields to fill it.', 0, 'info');
  if (config) {
    const d = config.decor || {};
    if (config.columns && config.columns.count > 1) warn('columns', 'Column layout is ignored; text flows in one column.');
    if ((d.border && d.border.style !== 'none') || d.corners || d.accentBar || d.sideBar || (d.divider && d.divider !== 'none') || (config.watermark && config.watermark.on)) warn('decor', 'Page decorations and watermarks are not exported.');
    const hf = config.headerFooter || {};
    if ((hf.header && hf.header.on) || (hf.footer && hf.footer.on)) warn('header-footer', 'Headers and footers are not exported.');
  }
  return { markdown: `${out.join('\n').replace(/\s+$/, '')}\n`, metadata, toc, tocDepth, warnings };
}
