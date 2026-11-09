import { h } from '../../ui/kit/dom.js';

const FONTS = [['sans', 'Sans-serif'], ['body', 'Body'], ['heading', 'Heading'], ['mono', 'Monospace']];

// kit = { fld, sel, range, chk, seg } from pages.js; every edit runs `studio.set`.
export function headerFooterPage(c, ed, { fld, sel, range, chk, seg }) {
  const f = c.headerFooter, patch = (p) => ed.patch({ headerFooter: p });
  const zones = (title, key) => [h('h5', {}, title), ...[['left', 'Left'], ['centre', 'Center'], ['right', 'Right']].map(([z, l]) =>
    fld(l, h('input', { type: 'text', maxlength: 200, value: f[key][z], 'aria-label': `${title} ${l}`, onchange: (e) => patch({ [key]: { [z]: e.target.value } }) })))];
  const group = (r) => [chk(`Show ${r}`, f[r].on, (v) => patch({ [r]: { on: v } })),
    ...(f[r].on ? [...zones(f.oddEven ? `${r} (odd pages)` : r, r), ...(f.oddEven ? zones(`${r} (even pages)`, `${r}Even`) : [])] : [])];
  return [h('h4', {}, 'Header & footer'),
    h('p', { class: 'sub' }, 'Tokens: {title} {author} {date} {page} {pages} {section} {chapter}. {chapter} is the current H1, {section} the current H2.'),
    ...group('header'), ...group('footer'),
    h('h4', {}, 'Typography'),
    fld('Font', sel(FONTS, f.font, (v) => patch({ font: v }))),
    fld('Size (pt)', ...range(5, 16, 0.5, f.size, (v) => patch({ size: v }))),
    chk('Italic', f.italic, (v) => patch({ italic: v })),
    fld('Colour', h('input', { type: 'color', value: f.color || c.palette.textSecondary, 'aria-label': 'Header and footer colour', onchange: (e) => patch({ color: e.target.value }) }),
      f.color ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => patch({ color: '' }) }, 'Use palette colour') : h('small', {}, 'Palette colour')),
    h('h4', {}, 'Layout'),
    fld('Rule line', seg([['none', 'None'], ['header', 'Header'], ['footer', 'Footer'], ['both', 'Both']], f.rule, (v) => patch({ rule: v }))),
    chk('Different first page (blank header and footer)', f.firstDifferent, (v) => patch({ firstDifferent: v })),
    chk('Odd / even pages', f.oddEven, (v) => patch({ oddEven: v })),
    fld('Vertical offset (mm)', ...range(-10, 10, 0.5, f.offset, (v) => patch({ offset: v })))];
}
