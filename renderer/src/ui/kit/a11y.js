import { h } from './dom.js';

const timers = new Map();
let regions = null;

function ensure() {
  if (regions && regions.polite.isConnected) return regions;
  regions = {
    polite: h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    assertive: h('div', { class: 'sr-only', role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'true' }),
  };
  document.body.append(regions.polite, regions.assertive);
  return regions;
}

// Speaks a message through a persistent live region; clearing first makes repeated identical messages announce again.
export function announce(message, { assertive = false } = {}) {
  const el = ensure()[assertive ? 'assertive' : 'polite'];
  clearTimeout(timers.get(el));
  el.textContent = '';
  timers.set(el, setTimeout(() => { el.textContent = String(message); }, 60));
}

export const reducedMotion = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
