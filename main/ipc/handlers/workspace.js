import { authorizeRoot } from '../../app/asset-protocol.js';
import { DocError } from '../../services/fs/safe-path.js';
import * as scan from '../../services/fs/scan.js';
import { activeRoot, closeWorkspace, openWorkspace, workspaceRegistry } from '../../services/workspace/index.js';
import { indexerFor } from '../../services/indexer/index.js';
import { run } from './reply.js';

export const open = (payload, event) => run(async () => {
  const r = await openWorkspace(event, payload?.path);
  if (!r.canceled) await authorizeRoot(r.workspace.assetRoot, r.workspace.root);
  return r;
});

export const close = (_payload, event) => run(async () => {
  closeWorkspace(event);
  return {};
});

export const list = async () => ({ items: (await workspaceRegistry()).list() });
export const remove = async (payload) => ({ items: (await workspaceRegistry()).remove(payload.root) });
export const recent = async () => ({ items: (await workspaceRegistry()).recent() });

export const listFiles = (payload, event) => run(async () => {
  const root = activeRoot(event);
  if (!root) throw new DocError('E_PATH', 'No workspace is open.');
  return { root, ...(await scan.listFiles(root, payload || {})) };
});

export const index = (payload, event) => run(async () => {
  const ix = indexerFor(event.sender.id);
  if (!ix) throw new DocError('E_PATH', 'No workspace is open.');
  return ix.query(payload.op, payload);
});
