import { app } from 'electron';
import { createJsonStore } from './store/json-store.js';

let pending = null;

async function init() {
  const store = createJsonStore({ root: app.getPath('userData'), name: 'session', defaults: { session: null } });
  await store.load();
  let done = false;
  app.on('before-quit', (event) => {
    if (done) return;
    event.preventDefault();
    done = true;
    store.flush().finally(() => app.quit());
  });
  return store;
}

export const sessionStore = () => (pending ??= init());
