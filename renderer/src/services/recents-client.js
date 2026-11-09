import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const list = () => invoke(CH.RECENTS_LIST);
export const pin = (path) => invoke(CH.RECENTS_PIN, { path });
export const unpin = (path) => invoke(CH.RECENTS_UNPIN, { path });
export const remove = (path) => invoke(CH.RECENTS_REMOVE, { path });
export const clear = () => invoke(CH.RECENTS_CLEAR);
