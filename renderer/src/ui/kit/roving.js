import { $$ } from './dom.js';

const MOVES = {
  horizontal: { ArrowLeft: -1, ArrowRight: 1 },
  vertical: { ArrowUp: -1, ArrowDown: 1 },
  both: { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 },
};
const CURRENT = '[aria-selected="true"],[aria-current]:not([aria-current="false"]),.is-on,.is-active';

// One tab stop per group of items: the current item has tabindex 0, the rest -1; arrows, Home and End move focus.
// selected: start on the item marked selected/current. onKey(e, item) may return true to claim a key. Survives re-rendering of the items (observes the container).
export function rove(root, selector, { orientation = 'horizontal', wrap = true, selected = true, onKey } = {}) {
  const moves = MOVES[orientation] || MOVES.horizontal;
  let cur = null, queued = false;
  const usable = () => $$(selector, root).filter((n) => !n.disabled && !n.closest('[hidden]'));
  const refresh = () => {
    queued = false;
    const list = usable();
    if (!list.length) return;
    if (!cur || !list.includes(cur)) cur = (selected && list.find((n) => n.matches(CURRENT))) || list[0];
    for (const n of $$(selector, root)) n.tabIndex = n === cur ? 0 : -1;
  };
  const queue = () => { if (!queued) { queued = true; queueMicrotask(refresh); } };
  const go = (el) => { cur = el; refresh(); el.focus(); };
  const onKeydown = (e) => {
    const item = e.target.closest && e.target.closest(selector);
    if (!item || item !== e.target || !root.contains(item)) return;
    if (onKey && onKey(e, item)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const list = usable(), i = list.indexOf(item);
    if (i < 0) return;
    let to = null;
    if (e.key === 'Home') to = list[0];
    else if (e.key === 'End') to = list[list.length - 1];
    else if (moves[e.key]) {
      const j = i + moves[e.key];
      to = wrap ? list[(j + list.length) % list.length] : list[Math.min(list.length - 1, Math.max(0, j))];
    }
    if (!to) return;
    e.preventDefault();
    if (to !== item) go(to);
  };
  const onFocusin = (e) => {
    const item = e.target.closest && e.target.closest(selector);
    if (item && root.contains(item) && item !== cur && !item.disabled) { cur = item; refresh(); }
  };
  const mo = new MutationObserver(queue);
  mo.observe(root, { childList: true, subtree: true });
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('focusin', onFocusin);
  refresh();
  return { refresh, destroy() { mo.disconnect(); root.removeEventListener('keydown', onKeydown); root.removeEventListener('focusin', onFocusin); } };
}
