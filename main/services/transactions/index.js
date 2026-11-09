import { app } from 'electron';
import path from 'node:path';
import { settingsService } from '../settings/index.js';
import { createTransactions } from './service.js';

let svc = null;

export const transactions = () => (svc ??= createTransactions({
  dir: path.join(app.getPath('userData'), 'transactions'),
  limits: () => ({ keep: settingsService().get('transactions.keep'), maxMB: settingsService().get('transactions.maxMB') }),
}));
