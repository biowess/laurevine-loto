import { app, BrowserWindow } from 'electron';
import { CH } from '../../../shared/channels.js';
import { createJsonStore } from '../store/json-store.js';
import { createSettingsService } from './settings-service.js';

let service = null;

export async function initSettings() {
  const store = createJsonStore({ root: app.getPath('userData'), name: 'settings', defaults: { values: {} } });
  await store.load();
  service = createSettingsService({
    store,
    emit: (values) => {
      for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(CH.SETTINGS_CHANGED, { values });
    },
  });
  let flushed = false;
  app.on('before-quit', (event) => {
    if (flushed) return;
    event.preventDefault();
    flushed = true;
    service.flush().finally(() => app.quit());
  });
  return service;
}

export function settingsService() {
  if (!service) throw new Error('Settings service not initialised.');
  return service;
}
