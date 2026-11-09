import { CH } from '../../../shared/channels.js';
import { invoke, on } from './ipc.js';

export const startSearch = (q) => invoke(CH.SEARCH_START, q);
export const cancelSearch = () => invoke(CH.SEARCH_CANCEL);
export const onSearchResults = (fn) => on(CH.SEARCH_RESULTS, fn);
