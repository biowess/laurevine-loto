import { mountKeymap } from '../../commands/keymap.js';
import { preferencePages as P } from '../preferences/registry.js';
import { backstagePages } from '../../ui/backstage/registry.js';
import { shortcutsPage } from './page.js';
import { openShortcuts } from './dialog.js';

export function register(ctx) {
  const { commands, store } = ctx;
  mountKeymap();
  commands.register({ id: 'help.shortcuts', title: 'Keyboard Shortcuts', icon: 'keyboard', group: 'Help', aliases: ['cheat sheet', 'keybindings', 'hotkeys'], run: () => openShortcuts(ctx) });
  commands.register({ id: 'custom.shortcuts', title: 'Keyboard Shortcuts', icon: 'keyboard', group: 'Tools', aliases: ['shortcuts', 'customize shortcuts', 'keybindings'], run: () => openShortcuts(ctx) });
  commands.register({ id: 'prefs.keybinding', title: 'Change Keybinding', group: 'Preferences', run: () => commands.execute('prefs.goto', { page: 'shortcuts' }) });
  commands.register({ id: 'file.print', title: 'Print…', icon: 'printer', group: 'File', shortcut: 'Ctrl+P', run: () => store.dispatch({ type: 'ui/backstage', open: true, page: 'print' }), enabled: () => !!store.get().documents.activeId, reason: 'No document is open' });
  P.register({ id: 'shortcuts', title: 'Keyboard Shortcuts', icon: 'keyboard', render: () => shortcutsPage(ctx) });
  // Dynamic import to avoid loading paged-frame until print is opened
  import('../../ui/backstage/pages/print-view.js').then(({ printView }) => {
    backstagePages.register({ id: 'print', title: 'Print', icon: 'printer', render: () => printView(ctx) });
  });
}
