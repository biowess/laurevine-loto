import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const exportPdf = (p) => invoke(CH.PDF_EXPORT, p);
export const pickPdfDir = () => invoke(CH.PDF_PICK_DIR);
export const cancelPdf = (id) => invoke(CH.PDF_CANCEL, { id });
export const readAsset = (baseDir, rel) => invoke(CH.PDF_ASSET, { baseDir, rel });
export const onProgress = (fn) => window.loto.on(CH.PDF_PROGRESS, fn);
