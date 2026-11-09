import { h } from '../../ui/kit/dom.js';

const LAYOUTS = [['auto', 'Template default'], ['centered', 'Centered'], ['left', 'Left'], ['band', 'Band'], ['framed', 'Framed']];
const FIELDS = [['title', 'Title'], ['subtitle', 'Subtitle'], ['author', 'Author'], ['date', 'Date'], ['organisation', 'Organization']];
const MAX = 1000000;

// Reads an image file into a validated data URI (png, jpeg, webp, gif; 1 MB max). Shared with the decoration page.
export const pickImage = (set, err) => h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', 'aria-label': 'Choose image', onchange: (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type) || f.size > MAX) { err.textContent = 'Use a PNG, JPEG, WebP or GIF image up to 1 MB'; return; }
  err.textContent = '';
  const r = new FileReader();
  r.onload = () => set(String(r.result));
  r.readAsDataURL(f);
} });

// kit = { fld, sel, chk, seg } from pages.js; every edit runs `studio.set`. Empty fields fall back to metadata / frontmatter.
export function coverPage(c, ed, { fld, chk, seg }) {
  const o = c.cover, patch = (p) => ed.patch({ cover: p });
  const err = h('small', { class: 'md-err', role: 'alert', style: { color: 'var(--danger, #b00020)' } });
  return [h('h4', {}, 'Cover page'),
    chk('Add a cover page', c.structure.cover, (v) => ed.patch({ structure: { cover: v } })),
    h('p', { class: 'sub' }, 'Empty fields use the Document metadata, then the first document’s frontmatter (title, subtitle, author, date, organization).'),
    fld('Layout', seg(LAYOUTS, o.layout, (v) => patch({ layout: v }))),
    ...FIELDS.map(([k, l]) => fld(l, h('input', { type: 'text', maxlength: 200, value: o[k], placeholder: 'From metadata', 'aria-label': `Cover ${l}`, onchange: (e) => patch({ [k]: e.target.value }) }))),
    fld('Logo', pickImage((v) => patch({ logo: v }), err), o.logo ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => patch({ logo: '' }) }, 'Remove logo') : h('small', {}, 'None'), err)];
}
