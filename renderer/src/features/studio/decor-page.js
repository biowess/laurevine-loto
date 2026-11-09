import { h } from '../../ui/kit/dom.js';
import { pickImage } from './cover-page.js';

const POS = [['centre', 'Center'], ['top', 'Top'], ['bottom', 'Bottom'], ['start', 'Start edge'], ['end', 'End edge']];
const BORDER = [['none', 'None'], ['solid', 'Solid'], ['double', 'Double'], ['dashed', 'Dashed'], ['dotted', 'Dotted']];
const DIV = [['none', 'None'], ['rule', 'Rule'], ['fleuron', '❦'], ['stars', '∗ ∗ ∗'], ['diamond', '◆'], ['dots', '· · ·']];
const TIE = [['decoration', 'Decoration'], ['accent', 'Accent'], ['heading', 'Heading'], ['divider', 'Divider']];

// kit = { fld, sel, range, chk, seg } from pages.js; every edit runs `studio.set`.
export function decorPage(c, ed, { fld, sel, range, chk, seg }) {
  const w = c.watermark, d = c.decor, b = d.border;
  const pw = (p) => ed.patch({ watermark: p }), pd = (p) => ed.patch({ decor: p }), pb = (p) => pd({ border: p });
  const err = h('small', { class: 'md-err', role: 'alert', style: { color: 'var(--danger, #b00020)' } });
  const colour = (label, v, fallback, on) => fld(label, h('input', { type: 'color', value: v || fallback, 'aria-label': label, onchange: (e) => on(e.target.value) }),
    v ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => on('') }, 'Use palette colour') : h('small', {}, 'Palette colour'));
  return [h('h4', {}, 'Watermark'),
    chk('Show watermark', w.on, (v) => pw({ on: v })),
    ...(w.on ? [
      fld('Type', seg([['text', 'Text'], ['image', 'Image']], w.kind, (v) => pw({ kind: v }))),
      w.kind === 'text' ? fld('Text', h('input', { type: 'text', maxlength: 60, value: w.text, 'aria-label': 'Watermark text', onchange: (e) => pw({ text: e.target.value }) }))
        : fld('Image', pickImage((v) => pw({ image: v }), err), w.image ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => pw({ image: '' }) }, 'Remove image') : h('small', {}, 'None'), err),
      ...(w.kind === 'text' ? [colour('Colour', w.color, c.palette.text, (v) => pw({ color: v }))] : []),
      fld('Angle (°)', ...range(-90, 90, 1, w.angle, (v) => pw({ angle: v }))),
      fld('Opacity', ...range(0.02, 1, 0.01, w.opacity, (v) => pw({ opacity: v }))),
      fld('Size (% of page width)', ...range(5, 100, 1, w.size, (v) => pw({ size: v }))),
      fld('Position', sel(POS, w.position, (v) => pw({ position: v }))),
      chk('Not on the first page', w.skipFirst, (v) => pw({ skipFirst: v }))] : []),
    h('h4', {}, 'Page border'),
    fld('Style', seg(BORDER, b.style, (v) => pb({ style: v }))),
    ...(b.style !== 'none' ? [fld('Width (mm)', ...range(0.1, 5, 0.1, b.width, (v) => pb({ width: v }))), fld('Inset (mm)', ...range(2, 40, 1, b.inset, (v) => pb({ inset: v }))), colour('Colour', b.color, c.palette.divider, (v) => pb({ color: v }))] : []),
    h('h4', {}, 'Section dividers'),
    fld('Ornament between sections', seg(DIV, d.divider, (v) => pd({ divider: v }))),
    h('h4', {}, 'Page decorations'),
    chk('Corner ornaments', d.corners, (v) => pd({ corners: v })),
    chk('Accent bar', d.accentBar, (v) => pd({ accentBar: v })),
    chk('Side bar', d.sideBar, (v) => pd({ sideBar: v })),
    fld('Colour from palette', seg(TIE, d.colour, (v) => pd({ colour: v })))];
}
