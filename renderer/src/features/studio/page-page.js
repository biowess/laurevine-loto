import { PAGE_SIZES, pageMm } from '../../../../shared/export-config.js';
import { h } from '../../ui/kit/dom.js';
import { paginationRules } from './pagination-page.js';

const IN = 25.4, r2 = (n) => Math.round(n * 100) / 100;

// kit = { fld, sel, chk, seg } from pages.js; every edit runs `studio.set`, Restore defaults runs `studio.reset-section`.
export function pagePage(c, ed, { fld, sel, chk, seg }) {
  const g = c.page, m = g.margins, u = g.unit, k = u === 'in' ? 1 / IN : 1, patch = (p) => ed.patch({ page: p });
  const num = (label, mm, min, max, apply) => {
    const err = h('small', { class: 'md-err', role: 'alert', style: { color: 'var(--danger, #b00020)' } });
    const inp = h('input', { type: 'text', inputmode: 'decimal', value: String(r2(mm * k)), 'aria-label': `${label} (${u})`, onchange: (e) => {
      const v = Number(e.target.value.trim().replace(',', '.')), v2 = v / k;
      const ok = e.target.value.trim() !== '' && Number.isFinite(v) && v2 >= min - 1e-6 && v2 <= max + 1e-6;
      e.target.setAttribute('aria-invalid', ok ? 'false' : 'true');
      err.textContent = ok ? '' : `Enter ${r2(min * k)}–${r2(max * k)} ${u}`;
      if (ok) apply(r2(v2));
    } });
    return fld(`${label} (${u})`, inp, err);
  };
  const size = (e) => {
    if (e !== 'Custom') return patch({ size: e });
    const [w, hh] = pageMm(g);
    patch({ size: 'Custom', width: w, height: hh });
  };
  const edge = (label, key) => num(label, m[key], 0, 60, (v) => patch({ margins: { [key]: v } }));
  const all = (v) => patch({ margins: { top: v, right: v, bottom: v, left: v } });
  const side = g.facing ? ['Inside', 'Outside'] : ['Left', 'Right'];
  return [h('h4', {}, 'Page design'),
    fld('Format', sel([...Object.keys(PAGE_SIZES), 'Custom'].map((s) => [s, s]), g.size, size)),
    ...(g.size === 'Custom' ? [num('Width', g.width, 50, 1500, (v) => patch({ width: v })), num('Height', g.height, 50, 1500, (v) => patch({ height: v }))] : []),
    fld('Units', seg([['mm', 'mm'], ['in', 'in']], u, (v) => patch({ unit: v }))),
    fld('Orientation', seg([['portrait', 'Portrait'], ['landscape', 'Landscape']], g.orientation, (v) => patch({ orientation: v }))),
    h('h4', {}, 'Margins'),
    chk('Link all margins', g.marginsLinked, (v) => (v ? patch({ marginsLinked: true, margins: { top: m.top, right: m.top, bottom: m.top, left: m.top } }) : patch({ marginsLinked: false }))),
    ...(g.marginsLinked ? [num('All margins', m.top, 0, 60, all)] : [edge('Top', 'top'), edge('Bottom', 'bottom'), edge(side[0], 'left'), edge(side[1], 'right')]),
    chk('Facing pages (inside / outside margins)', g.facing, (v) => patch({ facing: v })),
    h('h4', {}, 'Background'),
    fld('Page colour', h('input', { type: 'color', value: g.background || c.palette.background, 'aria-label': 'Page background colour', onchange: (e) => patch({ background: e.target.value }) }),
      g.background ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => patch({ background: '' }) }, 'Use palette colour') : h('small', {}, 'Palette colour')),
    h('h4', {}, 'Text direction'),
    fld('Direction', seg([['auto', 'Auto (per block)'], ['ltr', 'LTR'], ['rtl', 'RTL']], g.direction, (v) => patch({ direction: v }))),
    ...paginationRules(c, ed, { fld, sel, chk }, 'page'),
    h('p', {}, h('button', { type: 'button', class: 'btn btn--sm', onclick: () => ed.run('studio.reset-section') }, 'Restore defaults'))];
}
