import { historyService } from '../../services/history/index.js';
import { run } from './reply.js';

const call = (name) => (p) => run(async () => (await historyService())[name](p));

export const list = call('list');
export const read = call('read');
export const restore = call('restore');
export const pin = call('pin');
export const del = call('remove');
export const stats = call('stats');
export const snapshot = call('snapshot');
export const files = call('files');
