// Pandoc citation plugin for markdown-it.
// Renders [@key], [@key, p. 12], [-@key], and @key as formatted inline references with tooltips,
// flags unknown keys with visible warnings, and appends a generated bibliography if not present in markdown.

import { formatAuthorYear, formatBibliography, formatAuthor } from '../../bibliography/format.js';

const BRACKET_RE = /^\[((?:[^[\]\n]*?)?(-?@[a-zA-Z0-9_:.#$%&*+?<>~/^-]+[^\]\n]*))\](?![\[\(:])/;
const INTEXT_RE = /^@([a-zA-Z0-9_:.#$%&*+?<>~/^-]+)(?:\s*\[([^\]\n]*)\])?/;
const ITEM_RE = /^\s*(?:(.*?)\s+)?(-?@)([a-zA-Z0-9_:.#$%&*+?<>~/^-]+)(?:,\s*([^;]+))?\s*$/;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function citationsPlugin(md) {
  // Inline rule: match citations before links
  md.inline.ruler.before('link', 'citation', (state, silent) => {
    const src = state.src.slice(state.pos);
    const ch = state.src.charCodeAt(state.pos);

    // 1. Bracketed citation [@key]
    if (ch === 0x5B /* [ */) {
      const m = BRACKET_RE.exec(src);
      if (!m) return false;
      if (!silent) {
        const inner = m[1];
        const rawItems = inner.split(';');
        const items = [];
        for (const raw of rawItems) {
          const match = ITEM_RE.exec(raw.trim());
          if (match) {
            items.push({
              prefix: (match[1] || '').trim(),
              suppressAuthor: match[2] === '-@',
              key: match[3],
              locator: (match[4] || '').trim(),
              raw: raw.trim(),
            });
          }
        }
        if (!items.length) return false;
        const token = state.push('citation', '', 0);
        token.meta = { items, raw: m[0], bracketed: true };
      }
      state.pos += m[0].length;
      return true;
    }

    // 2. In-text citation @key
    if (ch === 0x40 /* @ */) {
      const prev = state.pos > 0 ? state.src.charCodeAt(state.pos - 1) : 0x20;
      // Must not be preceded by word character or '@'
      if (/[a-zA-Z0-9_@]/.test(String.fromCharCode(prev))) return false;
      const m = INTEXT_RE.exec(src);
      if (!m) return false;
      if (!silent) {
        const token = state.push('citation', '', 0);
        token.meta = {
          items: [{
            prefix: '',
            suppressAuthor: false,
            key: m[1],
            locator: (m[2] || '').trim(),
            raw: m[0],
            inText: true,
          }],
          raw: m[0],
          bracketed: false,
        };
      }
      state.pos += m[0].length;
      return true;
    }

    return false;
  });

  // Renderer rule
  md.renderer.rules.citation = (tokens, idx, options, env) => {
    const { items, raw } = tokens[idx].meta;
    const bib = env.bib;
    const entryMap = bib?.entries instanceof Map ? bib.entries : (bib?.entryMap || new Map());
    const style = bib?.style || 'author-year';

    env.usedKeys = env.usedKeys || new Set();

    const renderedItems = items.map((item) => {
      const entry = entryMap.get(item.key);
      if (!entry) {
        const warnLabel = tokens[idx].meta.bracketed ? `[${item.raw}]` : item.raw;
        return `<span class="lt-citation lt-citation-warning" title="Unknown citation key: ${esc(item.key)}" data-key="${esc(item.key)}">${esc(warnLabel)}</span>`;
      }

      env.usedKeys.add(item.key);

      // Tooltip: full formatted reference
      const tip = formatAuthorYear(entry, { format: 'text' });
      const year = entry.year || 'n.d.';
      const loc = item.locator ? `, ${item.locator}` : '';
      const num = item.num || (bib?.numbers ? bib.numbers.get(item.key) : 1);

      let text = '';
      if (style === 'numbered') {
        text = `[${num}${loc}]`;
        if (item.inText) {
          const auth = entry.authors?.[0] ? formatAuthor(entry.authors[0], { inverted: false }) : 'Anonymous';
          text = `${auth} ${text}`;
        }
      } else {
        // Author-year
        const firstAuth = entry.authors?.[0];
        const authCount = entry.authors?.length || 0;
        let authName = 'Anonymous';
        if (firstAuth) {
          authName = firstAuth.family || firstAuth.literal || 'Anonymous';
          if (authCount === 2) authName += ` & ${entry.authors[1].family || entry.authors[1].literal}`;
          else if (authCount > 2) authName += ' et al.';
        }

        if (item.suppressAuthor) {
          text = `(${year}${loc})`;
        } else if (item.inText) {
          text = `${authName} (${year}${loc})`;
        } else {
          text = `(${authName}, ${year}${loc})`;
        }
      }

      const pfx = item.prefix ? `${esc(item.prefix)} ` : '';
      return `<span class="lt-citation" title="${esc(tip)}" data-key="${esc(item.key)}">${pfx}${esc(text)}</span>`;
    });

    return renderedItems.join('; ');
  };

  // Core rule: append generated bibliography at end if citations exist and doc has no managed bib region
  md.core.ruler.push('citation_bibliography', (state) => {
    const bib = state.env.bib;
    if (!bib) return;

    // Check if markdown already contains a managed bibliography region
    const hasBibRegion = state.tokens.some((t) => t.type === 'html_block' && t.content && t.content.includes('laurevine:bibliography:'));
    if (hasBibRegion) return;

    // Collect all citation keys from inline tokens
    const used = new Set();
    for (const t of state.tokens) {
      if (t.type === 'inline' && t.children) {
        for (const c of t.children) {
          if (c.type === 'citation' && c.meta?.items) {
            c.meta.items.forEach((it) => used.add(it.key));
          }
        }
      }
    }
    if (!used.size) return;

    const entryMap = bib.entries instanceof Map ? bib.entries : (bib.entryMap || new Map());
    const usedEntries = [...used].map((k) => entryMap.get(k)).filter(Boolean);
    if (!usedEntries.length) return;

    const style = bib.style || 'author-year';
    const bibHtml = formatBibliography(usedEntries, { style, format: 'html' });

    const token = new state.Token('html_block', '', 0);
    token.content = `<section class="lt-bibliography">\n<h3 class="lt-bibliography-title">References</h3>\n${bibHtml}\n</section>\n`;
    state.tokens.push(token);
  });
}
