import { h, $, $$ } from './dom.js';
import { icon } from './icons.js';
import { closeAllPopovers, hasPopover } from './popover.js';

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const open = [];
let uid = 0;

function onKey(e) {
  const d = open[open.length - 1];
  if (!d) return;
  if (e.key === 'Escape') { if (hasPopover()) return; e.preventDefault(); e.stopPropagation(); d.close(); return; }
  if (e.key !== 'Tab') return;
  const f = $$(FOCUSABLE, d.el).filter((n) => n.offsetParent !== null), cur = document.activeElement;
  if (!f.length) { e.preventDefault(); d.el.focus(); return; }
  const a = f[0], z = f[f.length - 1];
  if (!d.el.contains(cur)) { e.preventDefault(); a.focus(); }
  else if (e.shiftKey && (cur === a || cur === d.el)) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && cur === z) { e.preventDefault(); a.focus(); }
}

// body: Node | string (text) | array; buttons: [{label, primary, onClick(api)}] (onClick returning false keeps it open).
export function openDialog({ title, icon: ic = 'info', body, width = 520, cls = '', buttons, focus, onClose } = {}) {
  closeAllPopovers();
  const prev = document.activeElement, id = 'dlg-title-' + ++uid;
  const btns = buttons && buttons.length ? buttons : [{ label: 'Close', primary: true }];
  const bodyEl = h('div', { class: 'dlg__body' }, body);
  const foot = h('div', { class: 'dlg__foot' });
  const closeBtn = h('button', { type: 'button', class: 'dlg__close', 'aria-label': 'Close' }, icon('x'));
  const el = h('div', {
    class: 'dlg ' + cls, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id, tabindex: '-1',
    style: { width: `min(${Number(width) || 520}px, calc(100vw - 32px))`, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)' },
  }, h('div', { class: 'dlg__head' }, h('span', { class: 'dlg__icon' }, icon(ic)), h('h2', { class: 'dlg__title', id }, title), closeBtn), bodyEl, foot);
  const bd = h('div', { class: 'dlg-backdrop' }, el);
  const api = { el, body: bodyEl, close };
  let done = false;
  function close(result) {
    if (done) return;
    done = true;
    open.splice(open.indexOf(api), 1);
    if (!open.length) document.removeEventListener('keydown', onKey, true);
    bd.remove();
    if (prev && prev.focus && document.contains(prev)) prev.focus();
    if (onClose) onClose(result);
  }
  btns.forEach((b) => foot.append(h('button', {
    type: 'button', class: 'btn' + (b.primary ? ' btn--primary' : ''),
    onclick: () => { if (!b.onClick || b.onClick(api) !== false) close(b.label); },
  }, b.label)));
  closeBtn.addEventListener('click', () => close());
  bd.addEventListener('mousedown', (e) => { if (e.target === bd) close(); });
  if (!open.length) document.addEventListener('keydown', onKey, true);
  open.push(api);
  document.body.append(bd);
  requestAnimationFrame(() => {
    bd.classList.add('is-open');
    const t = (focus && $(focus, el)) || $('.btn--primary', el) || el;
    t.focus();
  });
  return api;
}
