import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const pickImage = (opts) => invoke(CH.IMAGE_PICK, opts);
export const pickFolder = (defaultPath) => invoke(CH.IMAGE_PICK_DIR, defaultPath ? { defaultPath } : undefined);
export const copyIn = (opts) => invoke(CH.IMAGE_COPY, opts);
export const listAssets = (opts) => invoke(CH.IMAGE_LIST, opts);
export const saveData = (opts) => invoke(CH.IMAGE_SAVE, opts);
