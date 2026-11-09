import { BrowserWindow } from 'electron';
import { applyTheme } from '../../services/theme.js';
import { armCloseGuard as arm, closeWindow } from '../../app/close-guard.js';

export const setTheme = ({ theme }) => ({ applied: applyTheme(theme) });

const live = (event) => { const w = BrowserWindow.fromWebContents(event.sender); return w && !w.isDestroyed() ? w : null; };
const maxed = (w) => !!w && (w.isMaximized() || w.isFullScreen());

export function toggleMaximize(_payload, event) {
  const win = live(event);
  if (win && !win.isFullScreen()) (win.isMaximized() ? win.unmaximize() : win.maximize());
  return { maximized: maxed(win) };
}

export const minimize = (_payload, event) => { const w = live(event); if (w) w.minimize(); return {}; };
export const requestClose = (_payload, event) => { const w = live(event); if (w) w.close(); return {}; };
export const isMaximized = (_payload, event) => ({ maximized: maxed(live(event)) });

export function setFullScreen({ value }, event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.setFullScreen(value);
  return { fullScreen: !!win && !win.isDestroyed() && win.isFullScreen() };
}

export function setZoom({ factor }, event) {
  event.sender.setZoomFactor(factor);
  return { factor };
}

export function armCloseGuard(_payload, event) {
  arm(BrowserWindow.fromWebContents(event.sender));
  return {};
}

export function close(_payload, event) {
  closeWindow(BrowserWindow.fromWebContents(event.sender));
  return {};
}
