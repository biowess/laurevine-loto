import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const list = () => invoke(CH.TEMPLATES_LIST);

const subs = new Set();
export const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const changed = () => subs.forEach((f) => f());
const mut = (ch, p) => invoke(ch, p).then((r) => { changed(); return r; });
export const save = (p) => mut(CH.TEMPLATES_SAVE, p);
export const update = (p) => mut(CH.TEMPLATES_UPDATE, p);
export const duplicate = (id) => mut(CH.TEMPLATES_DUPLICATE, { id });
export const remove = (id) => mut(CH.TEMPLATES_DELETE, { id });
export const importFiles = () => mut(CH.TEMPLATES_IMPORT);
export const exportOne = (id) => invoke(CH.TEMPLATES_EXPORT, { id });
