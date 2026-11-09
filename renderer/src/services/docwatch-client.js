import { CH } from '../../../shared/channels.js';
import { invoke, on } from './ipc.js';

export const watch = (id, path, hash) => invoke(CH.DOC_WATCH, { id, path, hash }).catch(() => null);
export const unwatch = (id) => invoke(CH.DOC_UNWATCH, { id }).catch(() => null);
export const onChanged = (fn) => on(CH.DOC_CHANGED, fn);
