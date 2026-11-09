import { recoveryService } from '../../services/recovery/index.js';

export const list = async () => ({ items: (await recoveryService()).list() });
export const read = async ({ key }) => ({ snapshot: await (await recoveryService()).read(key) });
export const put = async (snap) => (await recoveryService()).put(snap);
export const drop = async ({ keys, all }) => { const s = await recoveryService(); await (all ? s.dropAll() : s.drop(keys)); return {}; };
