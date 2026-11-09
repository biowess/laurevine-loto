import { selectField } from './select.js';

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

// Safe element builder: children are nodes or text nodes, never parsed as HTML; inline on* attributes are never set.
function apply(el, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (/^on/i.test(k)) { if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v); }
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  return el;
}

// Native <select> is never rendered: h('select', …, <option>…) builds the app's themed dropdown (same .value / change / onchange API).
function dropdown(props, kids) {
  const { class: cls, ...rest } = props || {}, c = cls || '';
  const os = kids.flat(Infinity).flatMap((k) => (k instanceof Element ? (k.tagName === 'OPTION' ? [k] : [...k.querySelectorAll('option')]) : []));
  const on = os.filter((o) => o.selected).pop() || os[0];
  const el = selectField(os.map((o) => [o.value, o.textContent, o.disabled]), on ? on.value : '', { label: rest['aria-label'], cls: ((/\b(select|input)\b/.test(c) ? '' : 'c-select--auto ') + c).trim() });
  return apply(el, rest);
}

// Safe element builder: children are nodes or text nodes, never parsed as HTML; inline on* attributes are never set.
export function h(tag, props, ...kids) {
  if (tag === 'select') return dropdown(props, kids);
  return append(apply(document.createElement(tag), props), kids);
}
