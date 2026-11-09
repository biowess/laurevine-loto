// Pure: key-level frontmatter diff, link/image diffs via the shared render pipeline, and the combined document diff.
import { parseFrontmatter } from '../markdown/frontmatter.js';
import { render } from '../markdown/renderer.js';
import { diffBlocks, summarize, collapse } from './block-diff.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// { added: [{key,value}], removed: [{key,value}], changed: [{key,from,to}], error }
export function diffFrontmatter(oldText, newText) {
  const a = parseFrontmatter(oldText), b = parseFrontmatter(newText), out = { added: [], removed: [], changed: [], error: a.error || b.error };
  for (const k of Object.keys(a.data)) {
    if (!(k in b.data)) out.removed.push({ key: k, value: a.data[k] });
    else if (!same(a.data[k], b.data[k])) out.changed.push({ key: k, from: a.data[k], to: b.data[k] });
  }
  for (const k of Object.keys(b.data)) if (!(k in a.data)) out.added.push({ key: k, value: b.data[k] });
  return out;
}

// Multiset diff of references: { added, removed, changed: [{from,to}] }; leftovers pair by label, then by target.
function diffRefs(A, B, id, label) {
  const key = (r) => `${id(r)}\0${label(r)}`, left = new Map();
  for (const r of A) { const k = key(r); (left.get(k) || left.set(k, []).get(k)).push(r); }
  let added = [];
  for (const r of B) { const l = left.get(key(r)); if (l && l.length) l.shift(); else added.push(r); }
  let removed = [...left.values()].flat();
  const changed = [];
  for (const by of [label, id]) {
    for (const r of [...removed]) {
      const i = added.findIndex((x) => by(x) && by(x) === by(r));
      if (i < 0) continue;
      changed.push({ from: r, to: added[i] });
      added = added.filter((_, n) => n !== i); removed = removed.filter((x) => x !== r);
    }
  }
  return { added, removed, changed };
}

export const diffLinks = (oldText, newText, opts = {}) =>
  diffRefs(render(oldText, opts).links, render(newText, opts).links, (l) => l.href || '', (l) => l.text || '');

export const diffImages = (oldText, newText, opts = {}) =>
  diffRefs(render(oldText, opts).images, render(newText, opts).images, (i) => i.src || '', (i) => i.alt || '');

const n = (d) => d.added.length + d.removed.length + d.changed.length;

// Everything at once: blocks, collapsed items, frontmatter, links, images and summary counts.
export function diffDocument(oldText, newText, { context = 1, ...opts } = {}) {
  const blocks = diffBlocks(oldText, newText), frontmatter = diffFrontmatter(oldText, newText);
  const links = diffLinks(oldText, newText, opts), images = diffImages(oldText, newText, opts);
  const summary = { ...summarize(blocks), frontmatter: n(frontmatter), links: n(links), images: n(images) };
  summary.changed = summary.changed || !!(summary.frontmatter || summary.links || summary.images);
  return { blocks, items: collapse(blocks, context), frontmatter, links, images, summary };
}
