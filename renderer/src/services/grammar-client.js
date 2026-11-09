import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

// Typed wrappers for `grammar:*` plus the shared grammar state (status bar indicator) and per-document findings (read by Problems).
const st = { enabled: false, active: false, host: '', error: '' }, subs = new Set(), found = new Map();

export const checkText = (text) => invoke(CH.GRAMMAR_CHECK, { text });
export const cancelCheck = () => invoke(CH.GRAMMAR_CANCEL);
export const grammarState = () => st;
export const onGrammar = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const setGrammarState = (p) => { Object.assign(st, p); subs.forEach((f) => f()); };
export const getFindings = (id) => found.get(id) || [];
export const setFindings = (id, list) => { if (list.length) found.set(id, list); else found.delete(id); };
export const clearFindings = () => found.clear();
export const grammarParts = (id, text) => (st.active ? getFindings(id).filter((f) => text.slice(f.range.from, f.range.to) === f.was) : []);
