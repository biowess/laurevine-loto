import { h, $$ } from './dom.js';
import { icon } from './icons.js';
import { openPopover, closeAllPopovers } from './popover.js';

const HINT = { marginLeft: 'auto', paddingLeft: '12px', flex: 'none', fontSize: '11px', color: 'var(--text-2)' };

// items: '-' | {head} | {label, icon, hint, checked, disabled, value, onSelect}; picks call it.onSelect(it) or onPick(value, it).
export function openMenu(anchor, items, onPick) {
  const list = h('div', { class: 'menu' + (items.length > 10 ? ' menu--scroll' : ''), role: 'menu' });
  for (const raw of items) {
    if (raw === '-' || (raw && raw.sep)) { list.append(h('div', { class: 'menu__sep', role: 'separator' })); continue; }
    const it = typeof raw === 'string' ? { label: raw } : raw;
    if (it.head) { list.append(h('div', { class: 'menu__head', role: 'presentation' }, it.head)); continue; }
    const checked = typeof it.checked === 'function' ? it.checked() : it.checked;
    list.append(h('button', {
      type: 'button', tabindex: '-1', class: 'menu__item' + (checked ? ' is-checked' : ''),
      role: checked === undefined ? 'menuitem' : 'menuitemcheckbox', 'aria-checked': checked === undefined ? null : String(!!checked),
      disabled: !!it.disabled,
      onclick: (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pt = { x: rect.left, y: rect.bottom, restore: e.currentTarget };
        closeAllPopovers(true);
        if (it.onSelect) it.onSelect(it, pt);
        else if (onPick) onPick(it.value !== undefined ? it.value : it.id || it.label, pt);
      },
    },
    h('span', { class: 'menu__icon' }, checked ? icon('check') : it.icon ? icon(it.icon) : null),
    h('span', { class: 'menu__label' }, it.label),
    it.hint ? h('span', { class: 'menu__tag', style: HINT }, it.hint) : null));
  }
  list.addEventListener('keydown', (e) => {
    const btns = $$('.menu__item:not([disabled])', list), i = btns.indexOf(document.activeElement);
    if (e.key === 'Tab') return closeAllPopovers(true);
    const to = { ArrowDown: btns[(i + 1) % btns.length], ArrowUp: btns[(i - 1 + btns.length) % btns.length], Home: btns[0], End: btns[btns.length - 1] }[e.key];
    if (to) { e.preventDefault(); to.focus(); }
  });
  const el = h('div', {}, list);
  const pop = openPopover(anchor, el);
  if (pop) { const first = $$('.menu__item:not([disabled])', list)[0]; if (first) first.focus({ preventScroll: true }); }
  return pop;
}

export function openContextMenu(e, items, onPick) {
  e.preventDefault();
  const t = e.target, kb = !e.clientX && !e.clientY && t && t.getBoundingClientRect;
  const r = kb ? t.getBoundingClientRect() : null;
  return openMenu({ x: r ? r.left : e.clientX, y: r ? r.bottom : e.clientY, restore: t }, items, onPick);
}
