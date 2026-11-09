import { app } from 'electron';
import { createJsonStore } from '../store/json-store.js';
import { createRecents } from './recents.js';

let pending = null;

async function init() {
  const store = createJsonStore({ root: app.getPath('userData'), name: 'recents', defaults: { items: [] } });
  await store.load();
  let flushed = false;
  app.on('before-quit', (event) => {
    if (flushed) return;
    event.preventDefault();
    flushed = true;
    store.flush().finally(() => app.quit());
  });
  return createRecents({ store });
}

export const recentsService = () => (pending ??= init());
