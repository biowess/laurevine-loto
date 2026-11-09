import { fontStack, searchFonts } from '../../core/publish/font-catalog.js';
import { h } from '../../ui/kit/dom.js';

const ROLES = [['body', 'Body', 'The quick brown fox jumps over the lazy dog.'], ['heading', 'Heading', 'Heading Sample 123'], ['title', 'Title', 'Document Title'],
  ['caption', 'Caption', 'Figure 1. A short caption.'], ['table', 'Table', 'Name · Value · 1,234.50'], ['code', 'Code', 'const x = () => 42;']];
const WEIGHTS = [['0', 'Template'], ['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold'], ['800', 'Extra bold']];

// Searchable font picker (native <details>); each option is drawn in its own font.
function picker(role, r, set) {
  const list = h('div', { class: 'lv-fl', role: 'listbox' });
  const draw = (q) => list.replaceChildren(...[{ name: '', stack: '' }, ...searchFonts(q)].map((f) => h('button', { type: 'button', role: 'option', class: 'lv-fo' + (f.name === r.font ? ' is-on' : ''), style: { fontFamily: f.stack || 'inherit' }, onclick: () => set({ font: f.name }) }, f.name || 'Template default')));
  draw('');
  return h('details', { class: 'lv-pk' }, h('summary', { style: { fontFamily: fontStack(r.font) || 'inherit' } }, r.font || 'Template default'),
    h('input', { type: 'search', placeholder: 'Search fonts…', 'aria-label': `Search ${role} fonts`, oninput: (e) => draw(e.target.value) }), list);
}

// kit = { fld, sel, range, chk, seg } from pages.js; ed.patch runs `studio.set`.
export function typographyPage(c, ed, { fld, sel, range, chk, seg }) {
  const t = c.typography, g = c.page, p = (k) => (v) => ed.patch({ typography: { [k]: v } });
  const blocks = ROLES.flatMap(([role, label, sample]) => {
    const r = t.roles[role], set = (v) => ed.patch({ typography: { roles: { [role]: v } } });
    const style = { fontFamily: fontStack(r.font) || 'inherit', fontWeight: r.weight || 'normal', fontStyle: r.italic === 'auto' ? 'normal' : r.italic, letterSpacing: `${t.letterSpacing}em`, fontSize: `${r.size || 1}em` };
    return [h('h5', { class: 'lv-rl' }, label), picker(role, r, set), h('div', { class: 'lv-smp', style }, sample),
      fld('Weight', sel(WEIGHTS, String(r.weight), (v) => set({ weight: +v }))), fld('Italic', seg([['auto', 'Auto'], ['italic', 'Italic'], ['normal', 'Upright']], r.italic, (v) => set({ italic: v }))),
      ...('size' in r ? [fld('Size (em)', ...range(0, 5, 0.05, r.size, (v) => set({ size: v})))] : []),
      ...(role === 'body' ? [fld('Size (px)', ...range(8, 24, 0.5, t.fontSize, p('fontSize')))] : []),
      ...(role === 'heading' ? [fld('Scale', ...range(1, 1.6, 0.05, t.headingScale, p('headingScale')))] : []),
      ...(role === 'code' ? [fld('Size (em)', ...range(0.7, 1.2, 0.02, t.codeSize, p('codeSize')))] : [])];
  });
  return [h('h4', {}, 'Typography'), ...blocks, h('h5', { class: 'lv-rl' }, 'Spacing and layout'),
    fld('Line spacing', ...range(1.1, 2.4, 0.05, t.lineHeight, p('lineHeight'))), fld('Paragraph', ...range(0, 2, 0.05, t.paragraphSpacing, p('paragraphSpacing'))),
    fld('Letters (em)', ...range(-0.1, 0.5, 0.01, t.letterSpacing, p('letterSpacing'))), fld('Heading above', ...range(0, 4, 0.1, t.headingBefore, p('headingBefore'))),
    fld('Heading below', ...range(0, 2, 0.05, t.headingAfter, p('headingAfter'))), fld('Max width (ch)', ...range(40, 120, 1, g.maxWidth, (v) => ed.patch({ page: { maxWidth: v } }))),
    fld('Alignment', seg([['left', 'Left'], ['justify', 'Justified']], t.align, p('align'))), chk('Hyphenate', t.hyphenate, p('hyphenate'))];
}
