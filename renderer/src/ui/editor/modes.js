import { h, $ } from '../kit/dom.js';
import { store } from '../../state/store.js';
import { uiActions, MODES } from '../../state/slices/ui.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { getEntry } from '../../services/documents.js';
import { runCommand } from '../shell/panels.js';

const soft = (fn) => Promise.resolve().then(fn).catch((e) => console.warn('[modes]', e.message));
const read = (k) => { try { return getSetting(k); } catch { return undefined; } };
const active = () => getEntry(store.get().documents.activeId);

// Restores the last mode, stores the mode per document, saves the last mode as a setting.
export function mountModes() {
  const saved = read('ui.mode');
  if (MODES.includes(saved)) store.dispatch(uiActions.mode(saved));
  const onDoc = () => {
    const e = active();
    if (!e) return;
    if (e.mode) store.dispatch(uiActions.mode(e.mode));
    else e.mode = store.get().ui.mode;
  };
  const offs = [
    store.subscribe((s) => s.ui.mode, (m) => { const e = active(); if (e) e.mode = m; soft(() => setSetting('ui.mode', m)); }),
    store.subscribe((s) => s.documents.activeId, onDoc),
  ];
  onDoc();
  return () => offs.forEach((f) => f());
}

// Draggable divider between source and preview; the ratio is the source share.
export function mountDivider(root = document, local = null) {
  const panes = local ? local.panes : $('.md-panes', root), src = local ? local.src : $('#src', root);
  if (!panes || !src) return null;
  const bar = h('div', { class: 'md-div', role: 'separator', tabindex: '0', title: 'Drag to resize, double-click to reset', 'aria-label': 'Resize panes', 'aria-valuemin': '20', 'aria-valuemax': '80' });
  src.after(bar);
  const saved = read('ui.splitRatio');
  if (!local && Number.isFinite(saved)) store.dispatch(uiActions.splitRatio(saved));
  let lr = store.get().ui.splitRatio;
  const ratio = () => (local ? lr : store.get().ui.splitRatio);
  const rev = () => ((panes.closest('.md-editor') || {}).dataset?.mode || store.get().ui.mode) === 'previewLeft';
  const set = (r) => { if (!local) return store.dispatch(uiActions.splitRatio(r)); lr = Math.min(0.8, Math.max(0.2, r)); paint(lr); };
  let timer = 0;
  const orient = () => bar.setAttribute('aria-orientation', getComputedStyle(panes).flexDirection === 'column' ? 'horizontal' : 'vertical');
  const paint = (r) => {
    panes.style.setProperty('--sr', r);
    bar.setAttribute('aria-valuenow', String(Math.round(r * 100)));
    orient();
    clearTimeout(timer);
    if (!local) timer = setTimeout(() => soft(() => setSetting('ui.splitRatio', Math.round(r * 1000) / 1000)), 300);
  };
  let grab = 0;
  const move = (e) => {
    if (!bar.hasPointerCapture(e.pointerId)) return;
    const b = panes.getBoundingClientRect(), col = getComputedStyle(panes).flexDirection === 'column';
    const dw = col ? bar.offsetHeight : bar.offsetWidth, size = (col ? b.height : b.width) - dw;
    if (size <= 0) return;
    const r = ((col ? e.clientY - b.top : e.clientX - b.left) - grab - dw / 2) / size;
    set(rev() ? 1 - r : r);
  };
  const end = (e) => { bar.classList.remove('is-drag'); panes.classList.remove('is-drag'); if (bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId); };
  bar.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); bar.setPointerCapture(e.pointerId); const br = bar.getBoundingClientRect(), col = getComputedStyle(panes).flexDirection === 'column'; grab = col ? e.clientY - (br.top + br.height / 2) : e.clientX - (br.left + br.width / 2); bar.classList.add('is-drag'); panes.classList.add('is-drag'); });
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', () => (local ? set(0.5) : runCommand('view.split-reset')));
  bar.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    set(ratio() + 0.02 * d * (rev() ? -1 : 1));
  });
  const off = local ? () => {} : store.subscribe((s) => s.ui.splitRatio, paint);
  panes.style.setProperty('--sr', ratio());
  bar.setAttribute('aria-valuenow', String(Math.round(ratio() * 100)));
  orient();
  window.addEventListener('resize', orient);
  return () => { off(); window.removeEventListener('resize', orient); clearTimeout(timer); bar.remove(); };
}
