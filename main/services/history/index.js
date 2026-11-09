import { app } from 'electron';
import { ensureSubdir } from '../store/json-store.js';
import { settingsService } from '../settings/index.js';
import { createHistory } from './service.js';

let pending = null;

const limits = () => {
  const g = (k) => settingsService().get(`history.${k}`);
  return { maxVersions: g('maxVersions'), maxAge: g('maxAgeDays') * 864e5, keepLatest: g('keepLatest'), maxBytes: g('maxMB') * 1e6, autosaveInterval: g('autosaveSeconds') * 1e3, autosaveDelta: g('autosaveDelta') };
};

async function init() {
  const svc = createHistory({ dir: await ensureSubdir(app.getPath('userData'), 'history'), limits });
  await svc.init();
  return svc;
}

export const historyService = () => (pending ??= init());
export const initHistory = () => historyService();

// Best effort: history problems are logged and never fail the file operation that triggered them.
export const track = async (fn) => {
  try { await fn(await historyService()); } catch (err) { console.error('[history]', err.message); }
};
