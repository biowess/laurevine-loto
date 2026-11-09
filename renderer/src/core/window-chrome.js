import { PRODUCT_NAME } from '../../../shared/constants.js';

export const THEME_KEY = 'loto.theme';
export const THEME_ORDER = Object.freeze(['light', 'dark', 'system']);

export const normalizeTheme = (t) => (THEME_ORDER.includes(t) ? t : 'light');
export const nextTheme = (t) => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length];
export const resolveDark = (theme, systemDark) => theme === 'dark' || (theme === 'system' && !!systemDark);

export function windowTitle(name, dirty = false, workspace = '') {
  const n = typeof name === 'string' ? name.trim() : '', w = typeof workspace === 'string' ? workspace.trim() : '';
  return [n ? `${dirty ? '• ' : ''}${n}` : '', w, PRODUCT_NAME].filter(Boolean).join(' — ');
}
