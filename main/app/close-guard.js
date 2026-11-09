import { CH } from '../../shared/channels.js';

const armed = new WeakSet(), forced = new WeakSet();

export function installCloseGuard(win) {
  win.webContents.on('did-start-loading', () => armed.delete(win));
  win.on('close', (e) => {
    const wc = win.webContents;
    if (!armed.has(win) || forced.has(win) || wc.isDestroyed() || wc.isCrashed()) return;
    e.preventDefault();
    wc.send(CH.WINDOW_CLOSE_REQUESTED);
  });
}

export const armCloseGuard = (win) => { if (win && !win.isDestroyed()) armed.add(win); };

export function closeWindow(win) {
  if (!win || win.isDestroyed()) return;
  forced.add(win);
  win.close();
}
