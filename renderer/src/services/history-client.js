import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const list = (r) => invoke(CH.HISTORY_LIST, r);
export const read = (r, id) => invoke(CH.HISTORY_READ, { ...r, id });
export const restore = (r, id, current) => invoke(CH.HISTORY_RESTORE, { ...r, id, current });
export const pin = (r, id, pinned) => invoke(CH.HISTORY_PIN, { ...r, id, pinned });
export const del = (r, id) => invoke(CH.HISTORY_DELETE, { ...r, id });
export const snapshot = (r, text, label) => invoke(CH.HISTORY_SNAPSHOT, { ...r, text, label });
export const stats = () => invoke(CH.HISTORY_STATS);
export const files = () => invoke(CH.HISTORY_FILES);
export const size = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
