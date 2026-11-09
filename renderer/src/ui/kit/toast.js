import { h, $ } from './dom.js';
import { icon } from './icons.js';

const ICONS = { info: null, success: 'check', warn: 'triangle-alert', error: 'circle-alert' };
const FAILURE = /\b(could not|couldn’t|cannot|unable to|failed)\b/i;
const MAX_VISIBLE = 4;
const DISMISSIBLE_FROM = 5000;
const sentence = (text) => (/[.!?…:%]$/.test(text) ? text : `${text}.`);

export function toast(message, { timeout = 2200, kind } = {}) {
  let box = $('#toasts');
  if (!box) { box = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite', 'aria-relevant': 'additions' }); document.body.append(box); }
  const text = String(message).trim();
  const k = kind in ICONS ? kind : FAILURE.test(text) ? 'error' : 'info';
  const t = h('div', { class: `toast toast--${k} is-in`, role: k === 'error' ? 'alert' : null }, h('span', { class: 'toast__msg' }, sentence(text)));
  if (ICONS[k]) t.append(h('span', { class: 'toast__icon' }, icon(ICONS[k])));
  if (timeout >= DISMISSIBLE_FROM) t.append(h('button', { type: 'button', class: 'toast__x', 'aria-label': 'Dismiss', onclick: () => t.remove() }, icon('x')));
  while (box.children.length >= MAX_VISIBLE) box.firstChild.remove();
  box.append(t);
  if (timeout > 0) setTimeout(() => t.remove(), timeout);
  return t;
}

export const clearToasts = () => { const b = $('#toasts'); if (b) b.replaceChildren(); };
