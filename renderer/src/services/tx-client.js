import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const txPreview = (ops, label) => invoke(CH.TX_PREVIEW, { ops, label });
export const txApply = (id) => invoke(CH.TX_APPLY, { id });
export const txUndo = (id) => invoke(CH.TX_UNDO, { id });
export const txList = () => invoke(CH.TX_LIST);
