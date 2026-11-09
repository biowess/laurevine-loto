import { DocError } from '../../services/fs/safe-path.js';
import { activeRoot } from '../../services/workspace/index.js';
import { cancelSearch, startSearch } from '../../services/search/index.js';
import { run } from './reply.js';

export const start = (payload, event) => run(async () => {
  const root = activeRoot(event);
  if (!root) throw new DocError('E_PATH', 'No workspace is open.');
  return { id: startSearch(event.sender, root, payload) };
});

export const cancel = (_payload, event) => run(async () => {
  cancelSearch(event.sender.id, true);
  return {};
});
