import { DocError } from '../../services/fs/safe-path.js';
import { transactions } from '../../services/transactions/index.js';
import { activeRoot } from '../../services/workspace/index.js';
import { run } from './reply.js';

const root = (event) => {
  const r = activeRoot(event);
  if (!r) throw new DocError('E_PATH', 'No workspace is open.');
  return r;
};

export const preview = (payload, event) => run(() => transactions().preview(root(event), payload));
export const apply = ({ id }, event) => run(() => transactions().apply(root(event), id));
export const undo = ({ id }, event) => run(() => transactions().undo(root(event), id));
export const list = (_payload, event) => run(() => transactions().list(root(event)));
