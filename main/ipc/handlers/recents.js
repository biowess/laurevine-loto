import { recentsService } from '../../services/fs/index.js';

const call = (method) => async (payload) => (await recentsService())[method](payload?.path);

export const list = call('list');
export const pin = call('pin');
export const unpin = call('unpin');
export const remove = call('remove');
export const clear = call('clear');
