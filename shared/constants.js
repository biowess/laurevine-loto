// Constants shared by main, renderer and tests. Pure: no Node or DOM APIs.
export const PRODUCT_NAME = 'Laurevine Loto';
export const APP_ID = 'com.biowess.laurevine-loto';
export const SCHEME = 'loto';
export const ASSET_SCHEME = 'loto-asset';
export const APP_HOST = 'app';
export const APP_ORIGIN = `${SCHEME}://${APP_HOST}/`;

export const THEME_BG = Object.freeze({ light: '#F8F7F3', dark: '#201F1B' });
export const THEME_FG = Object.freeze({ light: '#292823', dark: '#E8E4DA' });
export const MIN_WINDOW = Object.freeze({ width: 960, height: 600 });
export const DEFAULT_WINDOW = Object.freeze({ width: 1360, height: 860 });
export const TITLEBAR_HEIGHT = 40;

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: loto-asset:",
  "media-src 'self' loto-asset:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const isAppUrl = (url) => typeof url === 'string' && url.startsWith(APP_ORIGIN);
