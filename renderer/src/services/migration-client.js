import { CH } from '../../../shared/channels.js';
import { invoke, on } from './ipc.js';

export const pickSource = (kind) => invoke(CH.MIGRATION_PICK, { kind });
export const scan = (path) => invoke(CH.MIGRATION_SCAN, { path });
export const cancelScan = () => invoke(CH.MIGRATION_CANCEL);
export const pickDest = (mode) => invoke(CH.MIGRATION_PICK_DEST, { mode });
export const copy = (o) => invoke(CH.MIGRATION_COPY, o);
export const convert = (root) => invoke(CH.MIGRATION_CONVERT, { root });
export const revert = (root) => invoke(CH.MIGRATION_REVERT, { root });
export const onCopyProgress = (fn) => on(CH.MIGRATION_PROGRESS, (p) => { if (p && p.phase === 'copy') fn(p); });
export const onProgress = (fn) => on(CH.MIGRATION_PROGRESS, fn);
