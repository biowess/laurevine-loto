import { h } from '../../ui/kit/dom.js';

const STYLES = [['arabic', '1, 2, 3'], ['roman', 'i, ii, iii'], ['alphabetic', 'a, b, c']];
const POS = [['footer-centre', 'Footer, center'], ['footer-left', 'Footer, left'], ['footer-right', 'Footer, right'], ['header-centre', 'Header, center'], ['header-left', 'Header, left'], ['header-right', 'Header, right']];

// kit = { fld, sel, chk, seg } from pages.js; every edit runs `studio.set`.
export function numberingPage(c, ed, { fld, sel, chk, seg }) {
  const n = c.numbering, patch = (p) => ed.patch({ numbering: p });
  const err = h('small', { class: 'md-err', role: 'alert', style: { color: 'var(--danger, #b00020)' } });
  return [h('h4', {}, 'Page numbers'),
    chk('Show page numbers', n.on, (v) => patch({ on: v })),
    fld('Style', seg(STYLES, n.style, (v) => patch({ style: v }))),
    fld('Start at', h('input', { type: 'text', inputmode: 'numeric', value: String(n.start), 'aria-label': 'Start number', onchange: (e) => {
      const v = Number(e.target.value.trim()), ok = Number.isInteger(v) && v >= 1 && v <= 9999;
      e.target.setAttribute('aria-invalid', ok ? 'false' : 'true');
      err.textContent = ok ? '' : 'Enter a whole number from 1 to 9999';
      if (ok) patch({ start: v });
    } }), err),
    fld('Position', sel(POS, n.position, (v) => patch({ position: v }))),
    chk('“Page X of Y”', n.ofTotal, (v) => patch({ ofTotal: v })),
    chk('Hide on cover page', n.hideOnCover, (v) => patch({ hideOnCover: v })),
    h('p', { class: 'sub' }, 'With odd / even pages, left and right positions mirror on even pages. Header and footer text can also use {page} and {pages}.')];
}
