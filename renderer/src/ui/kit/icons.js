import { iconData } from './icon-data.js';

const NS = 'http://www.w3.org/2000/svg';
const ATTRS = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
const pascal = (n) => n.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
const warned = new Set();

// Lucide global first; otherwise the bundled subset (icon-data.js, trusted generated geometry).
export function icon(name, cls = '') {
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries(ATTRS)) svg.setAttribute(k, v);
  const ok = typeof name === 'string' && /^[a-z0-9-]+$/.test(name);
  svg.setAttribute('class', `lucide lucide-${ok ? name : 'missing'} ic${cls ? ' ' + cls : ''}`);
  const node = ok && window.lucide && window.lucide.icons && window.lucide.icons[pascal(name)];
  const bundled = ok && iconData[name];
  if (Array.isArray(node)) {
    // lucide >=0.400: ["svg", svgAttrs, [[childTag, childAttrs], ...]]
    // lucide <0.400:  [[childTag, childAttrs], ...]
    const children = Array.isArray(node[2]) ? node[2] : node;
    for (const [tag, attrs] of children) {
      const c = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs || {})) if (k !== 'key') c.setAttribute(k, v);
      svg.append(c);
    }
  } else if (typeof bundled === 'string') svg.innerHTML = bundled;
  else {
    svg.classList.add('ic-missing');
    if (!warned.has(name)) { warned.add(name); console.warn('[loto] icon not available:', name); }
  }
  return svg;
}

// Replaces static <i data-lucide> placeholders in server-authored markup with real icons.
export function paintIcons(root = document) {
  for (const el of root.querySelectorAll('i[data-lucide]')) el.replaceWith(icon(el.getAttribute('data-lucide'), el.className.replace(/\bic\b/, '').trim()));
}
