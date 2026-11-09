import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const list = () => invoke(CH.RECOVERY_LIST);
export const read = (key) => invoke(CH.RECOVERY_READ, { key });
export const put = (snap) => invoke(CH.RECOVERY_PUT, snap);
export const drop = (keys) => invoke(CH.RECOVERY_DROP, { keys });
export const dropAll = () => invoke(CH.RECOVERY_DROP, { all: true });
export const describe = (i) => `${new Date(i.savedAt).toLocaleString()} · ${i.size < 1024 ? `${i.size} B` : `${(i.size / 1024).toFixed(1)} KB`}`;
