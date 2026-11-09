const stack = [];
const rectOf = (a) => (a.getBoundingClientRect ? a.getBoundingClientRect() : { left: a.x, right: a.x, top: a.y, bottom: a.y });
const isEl = (a) => a && a.classList && a.setAttribute;

function cool(a) {
  if (!isEl(a)) return;
  a.classList.add('lv-nohover');
  document.addEventListener('pointermove', () => a.classList.remove('lv-nohover'), { once: true, capture: true });
}

function drop(restore) {
  const t = stack.pop();
  if (!t) return null;
  t.el.remove();
  if (isEl(t.anchor)) { t.anchor.classList.remove('is-open'); t.anchor.setAttribute('aria-expanded', 'false'); cool(t.anchor); }
  if (t.onClose) t.onClose();
  if (restore) { const f = t.anchor.restore || t.anchor; if (f.focus) f.focus(); }
  return t;
}

export const hasPopover = () => stack.length > 0;
export const closePopover = (restore = false) => { drop(restore); };
export function closeAllPopovers(restore = false) {
  const base = stack[0] && (stack[0].anchor.restore || stack[0].anchor);
  while (stack.length) drop(false);
  if (restore && base && base.focus) base.focus();
}

// anchor: an element or a point {x, y, restore?}. Clicking the same anchor again closes it. Returns el, or null when toggled closed.
export function openPopover(anchor, el, { onClose } = {}) {
  if (stack.length && stack[stack.length - 1].anchor === anchor) { drop(false); return null; }
  const parent = isEl(anchor) ? stack.findIndex((p) => p.el.contains(anchor)) : -1, nest = parent >= 0;
  while (stack.length > parent + 1) drop(false);
  el.classList.add('popover', 'is-open');
  document.body.append(el);
  const r = rectOf(anchor), w = el.offsetWidth, ht = el.offsetHeight;
  let x = nest ? r.right + 2 : r.left;
  if (nest && x + w > innerWidth - 8) x = r.left - w - 2;
  el.style.left = Math.max(4, Math.min(x, innerWidth - w - 8)) + 'px';
  const below = nest ? r.top : r.bottom + 2;
  el.style.top = (below + ht <= innerHeight - 8 ? below : Math.max(8, nest ? r.bottom - ht : r.top - ht - 2)) + 'px';
  stack.push({ el, anchor, onClose });
  if (isEl(anchor)) { anchor.classList.add('is-open'); anchor.setAttribute('aria-expanded', 'true'); }
  return el;
}

if (typeof document !== 'undefined') {
  document.addEventListener('mousedown', (e) => {
    if (!stack.length) return;
    const i = stack.findIndex((p) => p.el.contains(e.target));
    if (i >= 0) {
      const c = stack[i + 1];
      if (c && !(isEl(c.anchor) && c.anchor.contains(e.target))) while (stack.length > i + 1) drop(false);
      return;
    }
    if (stack.some((p) => isEl(p.anchor) && p.anchor.contains(e.target))) return;
    closeAllPopovers();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { e.stopImmediatePropagation(); closePopover(true); } });
  window.addEventListener('blur', () => closeAllPopovers());
  window.addEventListener('resize', () => closeAllPopovers());
}
