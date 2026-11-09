import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const list = () => invoke(CH.PALETTES_LIST);
export const save = (p) => invoke(CH.PALETTES_SAVE, p);
export const update = (p) => invoke(CH.PALETTES_UPDATE, p);
export const duplicate = (id) => invoke(CH.PALETTES_DUPLICATE, { id });
export const remove = (id) => invoke(CH.PALETTES_DELETE, { id });
export const importFiles = () => invoke(CH.PALETTES_IMPORT);
export const exportOne = (id) => invoke(CH.PALETTES_EXPORT, { id });
