import { h, $, $$ } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { openContextMenu } from '../../ui/kit/menu.js';
import { toast } from '../../ui/kit/toast.js';
import { parseQuick, serializeQuick, QUICK_MAX } from '../../core/ribbon/quick.js';

export const QUICK_KEY = 'ribbon.quickAccess';

export const readQuick = (ctx) => parseQuick(ctx.store.get().settings.values[QUICK_KEY], ctx.commands.has);

export async function writeQuick(ctx, ids) {
  try {
    await ctx.settings.set(QUICK_KEY, serializeQuick(ids));
    return true;
  } catch (e) {
    toast(`Could not save the Quick Access Toolbar: ${e.message}`);
    return false;
  }
}

const customizeItem = (ctx) => ({ label: 'Customize the Ribbon…', icon: 'sliders-horizontal', onSelect: () => ctx.ui.runCommand('custom.ribbon') });

export function ribbonMenu(ctx, id) {
  const c = ctx.commands.get(id), { ids } = readQuick(ctx);
  if (ids.includes(id)) return [{ label: 'Remove from Quick Access Toolbar', icon: 'x', onSelect: () => ctx.ui.runCommand('ribbon.qat-remove', id) }, '-', customizeItem(ctx)];
  const full = ids.length >= QUICK_MAX;
  return [
    { label: 'Add to Quick Access Toolbar', icon: 'plus', disabled: c.planned || full, hint: c.planned ? 'Soon' : full ? 'Full' : undefined, onSelect: () => ctx.ui.runCommand('ribbon.qat-add', id) },
    '-', customizeItem(ctx),
  ];
}

function barMenu(ctx, id) {
  const { ids } = readQuick(ctx), i = ids.indexOf(id);
  return [
    { label: 'Move Left', icon: 'arrow-left', disabled: i <= 0, onSelect: () => ctx.ui.runCommand('ribbon.qat-move', { id, by: -1 }) },
    { label: 'Move Right', icon: 'arrow-right', disabled: i < 0 || i >= ids.length - 1, onSelect: () => ctx.ui.runCommand('ribbon.qat-move', { id, by: 1 }) },
    { label: 'Remove from Quick Access Toolbar', icon: 'x', onSelect: () => ctx.ui.runCommand('ribbon.qat-remove', id) },
    '-',
    { label: 'Reset Quick Access Toolbar', icon: 'rotate-ccw', onSelect: () => ctx.ui.runCommand('ribbon.qat-reset') },
    customizeItem(ctx),
  ];
}

export function mountQat(ctx) {
  const host = $('.titlebar__left');
  if (!host) return;
  const { commands, store } = ctx;
  const bar = h('div', { class: 'qat', role: 'toolbar', 'aria-label': 'Quick Access Toolbar', hidden: true });
  host.append(bar);

  const stops = () => $$('.qat__btn', bar);
  const rove = (to) => { for (const b of stops()) b.tabIndex = b === to ? 0 : -1; };

  function sync() {
    for (const b of stops()) {
      const c = commands.get(b.dataset.cmd);
      if (!c) continue;
      const off = !commands.canRun(c.id), on = commands.isChecked(c.id);
      b.disabled = off;
      b.classList.toggle('is-on', on);
      b.title = off ? `${c.title} (unavailable here)` : c.title + (c.shortcut ? ` (${c.shortcut})` : '');
      if (c.checked) b.setAttribute('aria-pressed', String(on)); else b.removeAttribute('aria-pressed');
    }
  }

  let shown = '';
  function render(force) {
    const { ids } = readQuick(ctx), key = ids.join(' ');
    if (key === shown && !force) return;
    shown = key;
    const had = bar.contains(document.activeElement) && document.activeElement.dataset.cmd;
    bar.hidden = !ids.length;
    bar.replaceChildren(...ids.map((id) => {
      const c = commands.get(id);
      return h('button', {
        type: 'button', class: 'tbtn tbtn--sm qat__btn', tabindex: -1, dataset: { cmd: id }, 'aria-label': c.title,
        onclick: () => ctx.ui.runCommand(id),
        oncontextmenu: (e) => openContextMenu(e, barMenu(ctx, id)),
      }, icon(c.icon || 'circle'));
    }));
    const first = stops()[0];
    if (first) rove(first);
    sync();
    const back = had && $(`.qat__btn[data-cmd="${had}"]`, bar);
    if (back && !back.disabled) { rove(back); back.focus(); }
  }

  bar.addEventListener('keydown', (e) => {
    const all = stops(), i = all.indexOf(document.activeElement);
    const to = { ArrowRight: all[(i + 1) % all.length], ArrowLeft: all[(i - 1 + all.length) % all.length], Home: all[0], End: all[all.length - 1] }[e.key];
    if (!to || i < 0) return;
    e.preventDefault();
    rove(to);
    to.focus();
  });
  bar.addEventListener('focusin', (e) => { if (e.target.classList.contains('qat__btn')) rove(e.target); });

  store.subscribe((s) => s.settings.values[QUICK_KEY], () => render());
  store.subscribe((s) => s.ui, sync);
  commands.onChange((e) => { if (e.type === 'change') sync(); else render(shown.split(' ').includes(e.id)); });
  render();
}
