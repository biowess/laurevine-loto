import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const authorizeAssetRoot = (id, path) => invoke(CH.ASSETS_AUTHORIZE_ROOT, { id, path });
