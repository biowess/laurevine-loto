import { openContextMenu } from '../../ui/kit/menu.js';
import { toast } from '../../ui/kit/toast.js';
import { addQuick, moveQuick, removeQuick, QUICK_MAX } from '../../core/ribbon/quick.js';
import { openCustomize } from './dialog.js';
import { mountQat, readQuick, ribbonMenu, writeQuick } from './qat.js';

const HINT = 'Right-click a ribbon button and choose Add to Quick Access Toolbar.';

export function register(ctx) {
  const { commands } = ctx;
  const group = 'Customization';
  const usable = (id) => typeof id === 'string' && commands.has(id) && !commands.get(id).planned;

  commands.register({
    id: 'custom.ribbon', title: 'Customize Ribbon…', icon: 'layout-panel-top', group, run: () => openCustomize(ctx),
    aliases: ['customize ribbon', 'ribbon layout', 'show hide ribbon tabs', 'custom ribbon group'],
  });

  commands.register({
    id: 'ribbon.qat-add', title: 'Add to Quick Access Toolbar', icon: 'plus', group, aliases: ['pin command', 'quick access'],
    async run(id) {
      if (!usable(id)) { toast(HINT); return; }
      const { ids } = readQuick(ctx);
      if (ids.includes(id)) return;
      if (ids.length >= QUICK_MAX) { toast(`The Quick Access Toolbar holds up to ${QUICK_MAX} commands.`); return; }
      if (await writeQuick(ctx, addQuick(ids, id))) toast(`Added ${commands.get(id).title} to the Quick Access Toolbar`);
    },
  });

  commands.register({
    id: 'ribbon.qat-remove', title: 'Remove from Quick Access Toolbar', icon: 'x', group,
    async run(id) {
      const { ids } = readQuick(ctx);
      if (typeof id !== 'string' || !ids.includes(id)) { toast('Right-click a Quick Access Toolbar button to remove it.'); return; }
      await writeQuick(ctx, removeQuick(ids, id));
    },
  });

  commands.register({
    id: 'ribbon.qat-move', title: 'Move Quick Access Toolbar Command', icon: 'arrow-right', group,
    async run(arg) {
      const { ids } = readQuick(ctx);
      if (!arg || typeof arg.id !== 'string' || !ids.includes(arg.id) || (arg.by !== -1 && arg.by !== 1)) { toast('Right-click a Quick Access Toolbar button to move it.'); return; }
      const next = moveQuick(ids, arg.id, arg.by);
      if (next !== ids) await writeQuick(ctx, next);
    },
  });

  commands.register({
    id: 'ribbon.qat-reset', title: 'Reset Quick Access Toolbar', icon: 'rotate-ccw', group, aliases: ['clear quick access'],
    async run() {
      if (!readQuick(ctx).ids.length) { toast('The Quick Access Toolbar is already empty.'); return; }
      await writeQuick(ctx, []);
    },
  });

  document.addEventListener('contextmenu', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || !t.closest('#ribbon, #rtabs')) return;
    const id = t.closest('#ribbon [data-cmd]')?.dataset.cmd;
    const items = id && commands.has(id) ? ribbonMenu(ctx, id) : [{ label: 'Customize the Ribbon…', icon: 'sliders-horizontal', onSelect: () => ctx.ui.runCommand('custom.ribbon') }];
    openContextMenu(e, items);
  });

  mountQat(ctx);
}
