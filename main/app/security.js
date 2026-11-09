import { app, session, shell } from 'electron';
import { isAppUrl } from '../../shared/constants.js';
import { parseExternalUrl } from './url-policy.js';

function openExternal(raw) {
  const href = parseExternalUrl(raw);
  if (!href) return;
  shell.openExternal(href).catch((err) => console.error('[security] openExternal failed:', err));
}

// Deny-by-default policy for every web contents: no new windows, no foreign navigation, no permissions.
export function applySecurityPolicy() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (isAppUrl(url)) return;
      event.preventDefault();
      openExternal(url);
    });
    contents.on('will-redirect', (event, url) => {
      if (!isAppUrl(url)) event.preventDefault();
    });
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });
}
