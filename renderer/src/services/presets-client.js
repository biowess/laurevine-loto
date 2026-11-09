// Typed wrappers for presets:* channels.
import { invoke } from './ipc.js';
import { CH } from '../../../shared/channels.js';

export const list = () => invoke(CH.PRESETS_LIST);
export const save = (payload) => invoke(CH.PRESETS_SAVE, payload);
export const update = (payload) => invoke(CH.PRESETS_UPDATE, payload);
export const duplicate = (id) => invoke(CH.PRESETS_DUPLICATE, { id });
export const remove = (id) => invoke(CH.PRESETS_DELETE, { id });
export const importFiles = () => invoke(CH.PRESETS_IMPORT);
export const exportOne = (id) => invoke(CH.PRESETS_EXPORT, { id });
export const exportBundle = () => invoke(CH.PRESETS_EXPORT_BUNDLE);
