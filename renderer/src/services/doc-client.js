import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const openPath = (path) => invoke(CH.DOC_OPEN, { path });
export const readPath = (path) => invoke(CH.DOC_OPEN, { path, recent: false });
export const openDialog = (defaultPath) => invoke(CH.DOC_OPEN_DIALOG, defaultPath ? { defaultPath } : undefined);
export const pickText = () => invoke(CH.DOC_OPEN_DIALOG, { recent: false });
export const saveDoc = (p) => invoke(CH.DOC_SAVE, p);
export const saveAs = (p) => invoke(CH.DOC_SAVE_AS, p);
export const saveCopy = (p) => invoke(CH.DOC_SAVE_COPY, p);
export const stat = (path) => invoke(CH.DOC_STAT, { path });
export const reveal = (path) => invoke(CH.DOC_REVEAL, { path });
export const openExternal = (path) => invoke(CH.DOC_OPEN_EXTERNAL, { path });
export const rename = (path, name) => invoke(CH.DOC_RENAME, { path, name });
export const writeExport = (p) => invoke(CH.EXPORT_WRITE, p);
export const exportExists = (dir, names) => invoke(CH.EXPORT_EXISTS, { dir, names });
export const exportTree = (dir, entries, overwrite) => invoke(CH.EXPORT_TREE, { dir, entries, overwrite });
