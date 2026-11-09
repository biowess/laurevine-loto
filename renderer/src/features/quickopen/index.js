import { mountQuickOpen } from './view.js';

export function register(ctx) {
  let qo = null;
  ctx.commands.register({ id: 'nav.quick-open', title: 'Quick Open', group: 'Navigate', icon: 'file-text', shortcut: 'Ctrl+E', aliases: ['go to file', 'open file', 'find file', 'file switcher'], run: () => { if (qo) qo.open(); } });
  qo = mountQuickOpen(ctx);
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.altKey || e.shiftKey || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'e') return;
    e.preventDefault(); e.stopPropagation(); ctx.commands.execute('nav.quick-open');
  }, true);
}
