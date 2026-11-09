import { store } from '../../state/store.js';
import { documentActions } from '../../state/slices/documents.js';
import { dropIndex } from '../../core/tabs/tab-ops.js';
import { execute } from '../../commands/registry.js';

// Starts a potential drag from a pointerdown on a tab; reorders on drop, shows a marker while dragging.
// While split, a drop on the other group moves the tab there (no reorder).
export function attachDrag(e, id, scroller) {
  if (e.button !== 0 || e.target.closest('em')) return;
  const el = e.currentTarget, x0 = e.clientX, y0 = e.clientY, own = el.closest('.md-group');
  const split = () => store.get().editorGroups.groups.length > 1;
  let at = 0, on = false, over = null;
  el.setPointerCapture(e.pointerId);
  const clear = () => scroller.querySelectorAll('.is-drop-l,.is-drop-r').forEach((n) => n.classList.remove('is-drop-l', 'is-drop-r'));
  const move = (ev) => {
    if (!on) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return; on = true; el.classList.add('is-drag'); }
    if (split()) {
      const g = document.elementFromPoint(ev.clientX, ev.clientY), t = g && g.closest('.md-group'), n = t && t !== own ? t : null;
      if (n !== over) { if (over) over.classList.remove('is-drop'); over = n; if (over) over.classList.add('is-drop'); }
      return;
    }
    const els = [...scroller.children], r = scroller.getBoundingClientRect();
    if (ev.clientX < r.left + 24) scroller.scrollLeft -= 12; else if (ev.clientX > r.right - 24) scroller.scrollLeft += 12;
    at = dropIndex(store.get().documents.tabs, id, els.map((n) => { const b = n.getBoundingClientRect(); return b.left + b.width / 2; }), ev.clientX);
    clear();
    const others = els.filter((n) => n !== el);
    if (at < others.length) others[at].classList.add('is-drop-l'); else if (others.length) others[others.length - 1].classList.add('is-drop-r');
  };
  const end = (ev) => {
    el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end);
    if (!on) return;
    clear(); el.classList.remove('is-drag');
    const to = over;
    if (to) { to.classList.remove('is-drop'); over = null; }
    const eat = (c) => c.stopImmediatePropagation();
    el.addEventListener('click', eat, true);
    setTimeout(() => el.removeEventListener('click', eat, true), 0);
    if (ev.type !== 'pointerup') return;
    if (to) execute('group.move-other', id);
    else if (!split()) store.dispatch(documentActions.move(id, at));
  };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
