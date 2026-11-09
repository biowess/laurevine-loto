import { classifyLink, parseWiki, resolveLink } from './resolve.js';
import { extractHeadings } from '../toc/headings.js';
import { withIds } from '../toc/generate.js';
import { slugify } from '../markdown/slug.js';
import { findLinks } from '../text/link.js';

const TEXT = /\.(md|markdown|mdown|txt)$/i;
const dirOf = (p) => p.slice(0, p.lastIndexOf('/') + 1);

// href -> { act: url | anchor | open | external | choose | create | none, path?, anchor?, matches?, msg? }; paths are workspace-relative.
export function planFollow(href, o = {}) {
  const kind = classifyLink(href);
  if (kind === 'external' || kind === 'mailto') return { act: 'url' };
  const r = resolveLink(href, o);
  if (r.status === 'unknown') return { act: 'none', msg: 'Open a workspace to follow this link.' };
  if (r.status === 'ambiguous') return { act: 'choose', matches: r.matches, anchor: r.anchor };
  if (r.status === 'missing-file') {
    const p = kind === 'wiki' ? dirOf(o.from || '') + parseWiki(href).target : r.path;
    if (!p || /(^|\/)\.\.(\/|$)/.test(p)) return { act: 'none', msg: 'The link points outside the workspace.' };
    return { act: 'create', path: /\.[^/]+$/.test(p) ? p : `${p}.md`, anchor: r.anchor };
  }
  if (kind === 'anchor') return { act: 'anchor', anchor: r.anchor };
  return { act: TEXT.test(r.path) ? 'open' : 'external', path: r.path, anchor: r.anchor };
}

// 0-based line of the heading whose id (or slug) matches `anchor`, -1 when absent.
export function headingLine(text, anchor, strategy) {
  const hs = withIds(extractHeadings(text), strategy), a = slugify(anchor, strategy);
  const h = hs.find((x) => x.id === anchor) || hs.find((x) => x.id === a);
  return h ? h.line : -1;
}

// Link destination (or `[[wiki]]`) under the offset, '' when none.
export function linkAt(text, pos) {
  for (const l of findLinks(text)) {
    if (pos < l.s || pos > l.e) continue;
    const d = text.slice(l.dest[0], l.dest[1]);
    return d[0] === '<' && d.endsWith('>') ? d.slice(1, -1) : d;
  }
  const a = text.lastIndexOf('\n', pos - 1) + 1, b = text.indexOf('\n', pos), line = text.slice(a, b < 0 ? text.length : b);
  for (const m of line.matchAll(/(!?)\[\[[^[\]|\n]+(?:\|[^[\]\n]*)?\]\]/g)) {
    const s = a + m.index;
    if (!m[1] && pos >= s && pos <= s + m[0].length) return m[0];
  }
  return '';
}
