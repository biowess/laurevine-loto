import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const list = () => invoke(CH.SNIPPETS_LIST);

const subs = new Set();
export const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const changed = () => subs.forEach((f) => f());
const mut = (ch, p) => invoke(ch, p).then((r) => { changed(); return r; });
export const save = (p) => mut(CH.SNIPPETS_SAVE, p);
export const update = (p) => mut(CH.SNIPPETS_UPDATE, p);
export const duplicate = (id) => mut(CH.SNIPPETS_DUPLICATE, { id });
export const remove = (id) => mut(CH.SNIPPETS_DELETE, { id });
export const importFiles = () => mut(CH.SNIPPETS_IMPORT);
export const exportOne = (id) => invoke(CH.SNIPPETS_EXPORT, { id });
