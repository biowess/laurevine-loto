import { BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { APP_ORIGIN, MIN_WINDOW, PRODUCT_NAME } from '../../shared/constants.js';
import { PRELOAD_PATH } from './paths.js';
import { initialWindowState, trackWindowState } from './window-state.js';
import { installCloseGuard } from './close-guard.js';
import { CH } from '../../shared/channels.js';
import { themeBackground } from '../services/theme.js';

const ICON = fileURLToPath(new URL('../../assets/icons/icon.png', import.meta.url));
let mainWindow = null;

export const getMainWindow = () => mainWindow;

export function createMainWindow({ dev, splash = null }) {
  const { bounds, maximized } = initialWindowState();
  const mac = process.platform === 'darwin';
  const win = new BrowserWindow({
    ...bounds,
    title: PRODUCT_NAME,
    icon: ICON,
    minWidth: MIN_WINDOW.width,
    minHeight: MIN_WINDOW.height,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: themeBackground(),
    titleBarStyle: 'hidden',
    ...(mac ? { trafficLightPosition: { x: 14, y: 13 } } : {}),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: dev,
    },
  });
  win.setMenuBarVisibility(false);
  const applyMax = () => { if (maximized && !win.isDestroyed()) win.maximize(); }; // maximize() on a hidden window shows it
  if (!splash) applyMax();
  trackWindowState(win);
  const pushMax = () => { if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send(CH.WINDOW_MAXIMIZED_CHANGED, { maximized: win.isMaximized() || win.isFullScreen() }); };
  for (const ev of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) win.on(ev, pushMax);
  installCloseGuard(win);
  if (!splash) win.once('ready-to-show', () => win.show());
  else {
    // Reveal once painted and loaded, but never before the splash has had its minimum time.
    let n = 0, done = false;
    const reveal = async () => {
      if (done) return;
      done = true;
      await splash.minTime();
      applyMax();
      if (!win.isDestroyed()) win.show();
      splash.close();
    };
    const step = () => { if (++n === 2) reveal(); };
    win.once('ready-to-show', step);
    win.webContents.once('did-finish-load', step);
    win.webContents.once('did-fail-load', reveal);
    setTimeout(reveal, 30000).unref();
  }
  win.on('closed', () => {
    if (splash) splash.close();
    if (mainWindow === win) mainWindow = null;
  });
  win.loadURL(APP_ORIGIN).catch((err) => console.error('[window] load failed:', err));
  mainWindow = win;
  return win;
}

export function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}
