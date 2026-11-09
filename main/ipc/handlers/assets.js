import { authorizeRoot as authorize } from '../../app/asset-protocol.js';

export const authorizeRoot = async ({ id, path }) => ({ authorized: await authorize(id, path) });
