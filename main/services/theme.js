import { BrowserWindow, nativeTheme } from 'electron';
import { THEME_BG, THEME_FG, TITLEBAR_HEIGHT } from '../../shared/constants.js';
import { settingsService } from './settings/index.js';

const THEMES = ['light', 'dark', 'system'];
const dark = () => nativeTheme.shouldUseDarkColors;

export const themeBackground = () => (dark() ? THEME_BG.dark : THEME_BG.light);
export const overlayOptions = () => ({ color: themeBackground(), symbolColor: dark() ? THEME_FG.dark : THEME_FG.light, height: TITLEBAR_HEIGHT });

function refresh() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.setBackgroundColor(themeBackground());
    if (process.platform === 'darwin') continue;
    try { win.setTitleBarOverlay(overlayOptions()); } catch { /* overlay not active on this window */ }
  }
}

export function applyTheme(theme) {
  if (!THEMES.includes(theme)) return false;
  nativeTheme.themeSource = theme;
  refresh();
  return true;
}

export function initTheme() {
  applyTheme(settingsService().get('appearance.theme'));
  nativeTheme.on('updated', refresh);
}
