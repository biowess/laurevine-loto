import { mountPalette } from './view.js';

export function register(ctx) {
  const { commands } = ctx;
  let pal = null;
  const def = (id, title, shortcut, prefix, aliases) => commands.register({ id, title, group: 'Navigate', icon: 'search', shortcut, aliases, run: (a) => { if (pal) pal.open({ prefix, ...a }); } });
  def('palette.open', 'Command Palette', 'Ctrl+Shift+P', '>', ['run command', 'find command', 'actions']);
  def('palette.headings', 'Go to Heading', 'Ctrl+Shift+O', '@', ['outline', 'jump to heading', 'symbol']);
  pal = mountPalette(ctx);
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.altKey || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase(), id = k === 'p' ? 'palette.open' : k === 'o' ? 'palette.headings' : '';
    if (id) { e.preventDefault(); e.stopPropagation(); commands.execute(id); }
  }, true);
}
