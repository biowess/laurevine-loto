import * as grammar from '../../services/grammar.js';

export const check = ({ text }, e) => grammar.check(e.sender, text);
export const cancel = (_p, e) => { grammar.cancel(e.sender); return { done: true }; };
