import { app, screen } from 'electron';
import { createJsonStore } from '../services/store/json-store.js';
import { DEFAULT_WINDOW, MIN_WINDOW } from '../../shared/constants.js';
import { pickBounds } from './window-bounds.js';

let store = null;

export async function initWindowState() {
  store = createJsonStore({ root: app.getPath('userData'), name: 'window-state', defaults: { bounds: null, maximized: false } });
  await store.load();
}

export function initialWindowState() {
  const areas = screen.getAllDisplays().map((d) => d.workArea);
  return pickBounds(store?.get(), areas, DEFAULT_WINDOW, MIN_WINDOW);
}

export function trackWindowState(win) {
  const save = () => {
    if (!store || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    store.set({ bounds: win.getNormalBounds(), maximized: win.isMaximized() });
  };
  for (const ev of ['resize', 'move', 'maximize', 'unmaximize']) win.on(ev, save);
  win.on('close', () => { save(); store?.flush(); });
}
