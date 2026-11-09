import { Menu } from 'electron';

// Minimal application menu. Keeps clipboard shortcuts working; devtools only with --dev.
export function installMenu({ dev }) {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' },
    ...(dev
      ? [{ label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }] }]
      : []),
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
