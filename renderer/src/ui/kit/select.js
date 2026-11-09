import { h } from './dom.js';
import { icon } from './icons.js';
import { openMenu } from './menu.js';

// Theme-aware dropdown replacing native <select>. options: [[value, label, disabled?]] | [value]; exposes .value and fires a bubbling 'change'.
export function selectField(options, value, { label, cls = '' } = {}) {
  const opts = options.map((o) => (Array.isArray(o) ? o : [o, o])), txt = h('span', { class: 'c-select__text' });
  const btn = h('button', { type: 'button', class: `c-select ${cls}`.trim(), 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': label || null }, txt, icon('chevron-down', 'c-select__arrow'));
  let cur = String(value);
  const show = () => { const o = opts.find((x) => String(x[0]) === cur) || opts[0]; txt.textContent = o ? o[1] : ''; };
  Object.defineProperty(btn, 'value', { get: () => cur, set: (v) => { cur = String(v); show(); } });
  const pick = (v) => { if (cur === String(v)) return; cur = String(v); show(); btn.dispatchEvent(new Event('change', { bubbles: true })); };
  btn.addEventListener('click', () => {
    const pop = openMenu(btn, opts.map(([v, t, d]) => ({ label: t, checked: String(v) === cur, disabled: !!d, onSelect: () => pick(v) })));
    if (pop && pop.firstChild) pop.firstChild.style.minWidth = btn.offsetWidth + 'px';
  });
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); btn.click(); } });
  show();
  return btn;
}
