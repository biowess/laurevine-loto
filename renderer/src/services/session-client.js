import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

let gate = Promise.resolve();

export const get = () => invoke(CH.SESSION_GET);
export const set = (session) => invoke(CH.SESSION_SET, { session });
export const hold = (p) => { gate = p; };
export const whenRestored = () => gate;
