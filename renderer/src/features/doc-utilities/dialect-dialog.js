import { LEVELS } from '../../core/markdown/portability.js';

const SHOWN = 12;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function openDialectDialog(ctx, { result, name, jump }) {
  const { h, openDialog } = ctx.ui;
  const names = new Map(result.constructs.map((c) => [c.id, c.label]));
  let dlg = null;
  const go = (from) => { dlg.close(); jump(from); };

  const links = (c) => {
    const box = h('div', { class: 'dia-jumps' });
    const draw = (all) => {
      const list = all ? c.jumps : c.jumps.slice(0, SHOWN);
      box.replaceChildren(...list.map((j) => h('button', {
        type: 'button', class: 'dia-jump', 'aria-label': `Jump to line ${j.line}: ${c.label}`, onclick: () => go(j.from),
      }, `Line ${j.line}`)));
      if (!all && c.jumps.length > SHOWN) box.append(h('button', { type: 'button', class: 'dia-more', onclick: () => { draw(true); box.querySelector('.dia-jump').focus(); } }, `Show all ${c.jumps.length}`));
      if (all && c.count > c.jumps.length) box.append(h('span', { class: 'dia-note' }, `First ${c.jumps.length} of ${c.count} shown.`));
    };
    draw(false);
    return box;
  };

  const beyond = (c) => (c.beyond === 'gfm' ? 'Beyond GFM' : c.beyond === 'commonmark' ? 'Beyond CommonMark' : '');
  const construct = (c) => h('li', { class: 'dia-item' },
    h('div', { class: 'dia-head' },
      h('strong', {}, c.label),
      h('span', { class: 'dia-chip' }, LEVELS[c.level].label),
      beyond(c) ? h('span', { class: 'dia-chip is-warn' }, beyond(c)) : null,
      h('span', { class: 'dia-count' }, plural(c.count, 'use'))),
    h('p', { class: 'dia-text' }, c.note),
    links(c));

  const fit = (f) => h('li', { class: 'dia-fit' + (f.profile === result.profile ? ' is-best' : '') },
    h('strong', {}, f.label),
    h('span', {}, f.missing.length ? `Does not support ${f.missing.map((id) => names.get(id) || id).join(', ')}` : 'Supports everything found'));

  const gfm = result.fits.find((f) => f.profile === 'gfm');
  const gfmLine = !gfm ? '' : gfm.missing.length
    ? `GitHub Flavored Markdown (GFM): not fully compatible. GitHub would not render ${gfm.missing.map((id) => names.get(id) || id).join(', ')} as written.`
    : 'GitHub Flavored Markdown (GFM): compatible. Everything found renders on GitHub.';

  const body = h('div', { class: 'dia' },
    h('p', { class: 'dia-lead', role: 'status' },
      h('strong', {}, `Best-fit profile: ${result.label}.`),
      ' ',
      result.constructs.length === 0 ? `${name} uses only standard CommonMark.`
        : result.exact ? `Every construct found in ${name} is supported.` : `Some constructs found in ${name} are not supported, even by this closest profile.`),
    result.constructs.length ? h('ul', { class: 'dia-list', 'aria-label': 'Constructs found' }, ...result.constructs.map(construct)) : null,
    h('p', { class: 'dia-text' }, gfmLine),
    h('h3', { class: 'dia-sub' }, 'Profile fit'),
    h('p', { class: 'dia-text' }, 'A profile is a set of Markdown features a tool understands. The best fit is the profile that supports the most of what this document uses.'),
    h('ul', { class: 'dia-fits', 'aria-label': 'Profile fit' }, ...result.fits.map(fit)));

  dlg = openDialog({ title: 'Inspect Markdown Dialect', icon: 'scan-search', width: 640, cls: 'lv-dia-dlg', body, buttons: [{ label: 'Close', primary: true }] });
  return dlg;
}
