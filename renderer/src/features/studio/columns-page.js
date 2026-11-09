import { h } from '../../ui/kit/dom.js';

const NAMES = ['One column', 'Two columns', 'Three columns'];
const sub = (v) => h('small', { style: { display: 'block', opacity: 0.7 } }, v);

// kit = { fld, sel, range, chk, seg, card } from pages.js; every edit runs `studio.set` via ed.patch (count switch keeps all other keys).
function preview(n, k) {
  const lines = (c) => Array.from({ length: c }, () => h('i'));
  const rule = k.rule && n > 1 ? `${Math.max(1, Math.round(k.ruleWidth))}px ${k.ruleStyle} ${k.ruleColor || 'var(--border-2)'}` : 'none';
  const head = k.headingSpan === 'none' ? [h('b', {})] : [h('b', { class: 'is-span' })];
  return h('span', { class: 'lv-colprev', 'aria-hidden': 'true' },
    ...(k.headingSpan === 'none' ? [] : head),
    h('span', { class: 'lv-colbody', style: { columnCount: String(n), columnGap: `${Math.min(k.gap, 4) * 3}px`, columnRule: rule, columnFill: k.balance ? 'balance' : 'auto' } },
      ...(k.headingSpan === 'none' ? head : []), ...lines(10 * n), h('u', { class: k.images === 'span' ? 'is-span' : k.images === 'float' ? 'is-float' : '' })));
}

export function columnsPage(c, ed, { fld, sel, range, chk, seg, card }) {
  const k = c.columns, p = (n) => (v) => ed.patch({ columns: { [n]: v } }), one = k.count === 1;
  const num = (key, min, max, label) => fld(label, sel(Array.from({ length: max - min + 1 }, (_, i) => [String(min + i), String(min + i)]), String(k[key]), (v) => p(key)(+v)));
  return [h('h4', {}, 'Columns'),
    h('div', { class: 'md-cols3' }, ...[1, 2, 3].map((n) => h('div', { class: 'lv-colcard' }, card(NAMES[n - 1], k.count === n, () => p('count')(n), preview(n, k))))),
    h('fieldset', { class: 'lv-colset', disabled: one ? true : null },
      one ? sub('Choose two or three columns to use these options. Your settings are kept.') : null,
      fld('Gap (em)', ...range(0, 4, 0.25, k.gap, p('gap'))),
      chk('Separator line', k.rule, p('rule')),
      ...(k.rule ? [fld('Line style', seg([['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted'], ['double', 'Double']], k.ruleStyle, p('ruleStyle'))),
        fld('Line colour', h('input', { type: 'color', value: k.ruleColor || c.palette.border, 'aria-label': 'Separator line colour', onchange: (e) => p('ruleColor')(e.target.value) }),
          k.ruleColor ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => p('ruleColor')('') }, 'Use palette colour') : sub('Palette colour')),
        fld('Line width (px)', ...range(0.25, 4, 0.25, k.ruleWidth, p('ruleWidth')))] : []),
      chk('Balance columns on the last page', k.balance, p('balance')),
      h('h4', {}, 'Headings'),
      fld('Placement', seg([['none', 'Stay in column'], ['h1', 'H1 spans all'], ['h1h2', 'H1 + H2 span all']], k.headingSpan, p('headingSpan'))),
      h('h4', {}, 'Paragraph flow'),
      fld('Flow', seg([['flow', 'Continuous'], ['keep', 'Keep paragraphs whole']], k.flow, p('flow'))),
      num('orphans', 1, 6, 'Orphans (min lines at column bottom)'), num('widows', 1, 6, 'Widows (min lines at column top)'),
      h('h4', {}, 'Images'),
      fld('Placement', seg([['inline', 'Inline in column'], ['span', 'Span all columns'], ['float', 'Float']], k.images, p('images'))),
      h('h4', {}, 'Tables'),
      fld('Placement', seg([['fit', 'Fit column'], ['span', 'Span all columns'], ['scale', 'Scale to fit']], k.tables, p('tables'))),
      h('h4', {}, 'Breaks'),
      chk('Avoid breaking inside figures', k.keepFigures, p('keepFigures')), chk('Avoid breaking inside code blocks', k.keepCode, p('keepCode')),
      chk('Avoid breaking inside tables', k.keepTables, p('keepTables')), chk('Avoid breaking inside callouts', k.keepCallouts, p('keepCallouts')),
      chk('Long code may break (shows a continuation marker)', k.codeBreak, p('codeBreak'))),
    h('p', {}, h('button', { type: 'button', class: 'btn btn--sm', onclick: () => ed.run('studio.reset-section') }, 'Restore defaults'))];
}
