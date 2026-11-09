import { sessionStore } from '../../services/session.js';

export const get = async () => ({ session: (await sessionStore()).get().session ?? null });
export const set = async ({ session }) => { (await sessionStore()).set({ session }); return {}; };
