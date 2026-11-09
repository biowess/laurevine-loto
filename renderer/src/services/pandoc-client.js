import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const detect = () => invoke(CH.PANDOC_DETECT);
export const test = (id) => invoke(CH.PANDOC_TEST, { id });
export const cancel = (id) => invoke(CH.PANDOC_CANCEL, { id });
export const exportDocx = (p) => invoke(CH.PANDOC_EXPORT_DOCX, p);
export const exportRtf = (p) => invoke(CH.PANDOC_EXPORT_RTF, p);
