const DEPTH = 4;
const MANUAL_TITLE = '[title]:not([data-auto-title])';

const clip = (el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === 'ellipsis';

// Gives any ellipsized text its full content as a native tooltip on hover or focus; titles set elsewhere are left alone.
export function mountTruncation(root = document.body) {
  const check = (e) => {
    const start = e.target;
    if (!start || start.nodeType !== 1 || start.closest(MANUAL_TITLE)) return;
    let el = start;
    for (let i = 0; i < DEPTH && el && el !== root; i++, el = el.parentElement) {
      if (clip(el)) {
        const text = el.textContent.trim();
        if (text) { el.title = text; el.dataset.autoTitle = '1'; }
        return;
      }
      if (el.dataset.autoTitle) { el.removeAttribute('title'); delete el.dataset.autoTitle; }
    }
  };
  root.addEventListener('pointerover', check);
  root.addEventListener('focusin', check);
  return () => { root.removeEventListener('pointerover', check); root.removeEventListener('focusin', check); };
}
