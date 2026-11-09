import { h } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { getSetting, setSetting } from '../../services/settings-client.js';

const soft = (fn) => Promise.resolve().then(fn).catch((e) => console.warn('[group-divider]', e.message));
const clamp = (r) => Math.min(0.8, Math.max(0.2, r));
const vertical = () => store.get().editorGroups.orientation === 'vertical';

// Divider between the two groups; the ratio is the first group's share, persisted as `ui.groupRatio`.
export function mountGroupDivider(wrap) {
  const bar = h('div', { class: 'md-gdiv', role: 'separator', tabindex: '0', title: 'Drag to resize, double-click to reset', 'aria-label': 'Resize editor groups', 'aria-valuemin': '20', 'aria-valuemax': '80' });
  let r = 0.5, timer = 0;
  try { const v = getSetting('ui.groupRatio'); if (Number.isFinite(v)) r = clamp(v); } catch { /* defaults */ }
  const save = () => { timer = 0; soft(() => setSetting('ui.groupRatio', Math.round(r * 1000) / 1000)); };
  const paint = () => {
    wrap.style.setProperty('--gr', r);
    wrap.style.setProperty('--gr2', 1 - r);
    bar.setAttribute('aria-valuenow', String(Math.round(r * 100)));
    bar.setAttribute('aria-orientation', vertical() ? 'horizontal' : 'vertical');
  };
  const set = (v) => { r = clamp(v); paint(); clearTimeout(timer); timer = setTimeout(save, 300); };
  const move = (e) => {
    if (!bar.hasPointerCapture(e.pointerId)) return;
    const b = wrap.getBoundingClientRect();
    set(vertical() ? (e.clientY - b.top) / b.height : (e.clientX - b.left) / b.width);
  };
  const end = (e) => { bar.classList.remove('is-drag'); if (bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId); };
  bar.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); bar.setPointerCapture(e.pointerId); bar.classList.add('is-drag'); });
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', () => set(0.5));
  bar.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    set(r + 0.02 * d);
  });
  const off = store.subscribe((s) => s.editorGroups.orientation, paint);
  paint();
  return {
    el: bar,
    off: () => {
      off();
      if (timer) { clearTimeout(timer); save(); }
      ['--gr', '--gr2'].forEach((k) => wrap.style.removeProperty(k));
      bar.remove();
    },
  };
}
