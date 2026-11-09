// Special Character popover: search box, recent characters, grouped grid.
import { GROUPS, find, nameOf } from '../../core/text/chars.js';
import { openPopover, closePopover } from '../../ui/kit/popover.js';

export function charPopover(h, anchor, recent, onPick) {
  const q = h('input', { class: 'ct-q', type: 'search', placeholder: 'Search characters', 'aria-label': 'Search characters' });
  const body = h('div', { class: 'ct-list sc-body' });
  const cell = ([c, n]) => h('button', { type: 'button', class: 'sc-c', title: `${n} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`, 'aria-label': n, onclick: () => { closePopover(); onPick(c); } }, c);
  const grid = (items) => h('div', { class: 'sc-grid' }, ...items.map(cell));
  const head = (t) => h('div', { class: 'ct-head' }, t);
  const draw = () => {
    const t = q.value.trim(), hits = t && find(t), rec = recent.map((c) => [c, nameOf(c)]).filter((r) => r[1]);
    body.replaceChildren(...(t ? (hits.length ? [grid(hits)] : [head('No matches')])
      : [...(rec.length ? [head('Recent'), grid(rec)] : []), ...GROUPS.flatMap(([g, items]) => [head(g), grid(items)])]));
  };
  q.addEventListener('input', draw);
  draw();
  if (openPopover(anchor, h('div', { class: 'ct-pop sc-pop' }, q, body))) q.focus();
}
