import { app } from 'electron';
import path from 'node:path';
import { ensureSubdir } from '../store/json-store.js';
import { createRecovery } from './service.js';

let pending = null;

async function init() {
  const svc = createRecovery({ dir: await ensureSubdir(app.getPath('userData'), 'recovery') });
  await svc.init();
  let done = false;
  app.on('before-quit', (event) => {
    if (done) return;
    event.preventDefault();
    done = true;
    svc.shutdown().catch(() => {}).finally(() => app.quit());
  });
  // Ctrl+C / kill from a terminal is not a clean exit: keep snapshots and the lock so the next start offers recovery.
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { done = true; svc.idle().finally(() => app.exit(0)); });
  return svc;
}

export const recoveryService = () => (pending ??= init());
export const initRecovery = () => recoveryService();
