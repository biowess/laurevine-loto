import { h } from '../../ui/kit/dom.js';

const N6 = ['1', '2', '3', '4', '5', '6'].map((v) => [v, v]);
const N12 = ['2', '3', '4', '5', '6', '8', '10', '12'].map((v) => [v, v]);

// kit = { fld, sel, chk }; part 'page' = text and block rules, 'structure' = captions, tables, breaks. Every edit runs `studio.set` via ed.patch.
export function paginationRules(c, ed, { fld, sel, chk }, part) {
  const k = c.pagination, p = (v) => ed.patch({ pagination: v }), f = (label, key) => chk(label, k[key], (v) => p({ [key]: v }));
  const n = (label, key, opts) => fld(label, sel(opts, String(k[key]), (v) => p({ [key]: +v })));
  const note = (t) => h('p', { class: 'sub' }, t);
  if (part === 'page') {
    return [h('h4', {}, 'Pagination rules'), f('Keep headings with the next lines', 'headingKeep'), n('Orphans: minimum lines at page bottom', 'orphans', N6), n('Widows: minimum lines at page top', 'widows', N6),
      f('Keep code blocks intact when they fit', 'keepCode'), f('Keep callouts intact when they fit', 'keepCallouts'), f('Collapse consecutive page breaks', 'collapseBreaks'), f('Prevent empty and blank pages', 'noEmptyPages'),
      note('Orphan, widow, code and callout rules apply to single-column layouts; use the Columns page otherwise.')];
  }
  return [h('h5', {}, 'Pagination rules'), f('Keep captions with their figure or table', 'captionKeep'), f('Repeat table header rows on continuation pages', 'tableHeader'),
    f('Avoid single-row table fragments', 'tableSingleRow'), f('Move small tables whole to the next page', 'tableSmallKeep'), n('Small table: up to rows', 'smallTableRows', N12)];
}
