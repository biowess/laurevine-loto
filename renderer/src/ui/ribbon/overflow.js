import { h, $$ } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { openMenu } from '../kit/menu.js';

const SLACK = 1;

export function mountOverflow(body, itemsFor, onFit = () => {}) {
  const groups = () => $$(':scope > .rgroup', body);
  const hiddenGroups = () => groups().filter((g) => g.hidden);
  const more = h('button', {
    type: 'button', class: 'rbtn rbtn--lg ribbon-more', title: 'More commands', 'aria-label': 'More commands', 'aria-haspopup': 'menu', 'aria-expanded': 'false', hidden: true,
    onclick: () => openMenu(more, itemsFor(hiddenGroups())),
  }, h('span', { class: 'rbtn__ico' }, icon('ellipsis')), h('span', { class: 'rbtn__label' }, 'More'));
  const overflowing = () => body.scrollWidth > body.clientWidth + SLACK;
  let frame = 0;

  function fit() {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    const all = groups();
    for (const g of all) g.hidden = false;
    more.hidden = true;
    body.append(more);
    if (overflowing()) {
      more.hidden = false;
      let n = all.length;
      while (n > 1 && overflowing()) all[--n].hidden = true;
    }
    onFit();
  }

  const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
  const ro = new ResizeObserver(schedule);
  ro.observe(body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  return { fit, destroy() { ro.disconnect(); if (frame) cancelAnimationFrame(frame); more.remove(); } };
}
