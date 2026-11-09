import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const printDoc = (html) => invoke(CH.PDF_PRINT, { html });
