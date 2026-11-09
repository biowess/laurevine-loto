import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const clearFolder = (what) => invoke(CH.PRIVACY_CLEAR, { what });
