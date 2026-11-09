import { DocError, toDocError } from '../../services/fs/safe-path.js';

// { ok: true, ...result } or { ok: false, error: { code, message } }
export async function run(fn) {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    const e = toDocError(err);
    if (e instanceof DocError) return { ok: false, error: { code: e.code, message: e.message } };
    console.error('[ipc]', e);
    return { ok: false, error: { code: 'E_IO', message: 'The operation failed.' } };
  }
}
