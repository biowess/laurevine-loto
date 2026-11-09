import { CH } from '../../../shared/channels.js';
import { invoke, on } from './ipc.js';

export const getAppInfo = () => invoke(CH.APP_INFO);
export const getNotices = (doc) => invoke(CH.APP_NOTICES, doc ? { doc } : undefined);
export const onOpenPath = (fn) => on(CH.APP_OPEN_PATH, fn);

