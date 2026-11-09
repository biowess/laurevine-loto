// Bridge to window.loto (exposed by main/preload.cjs). Unwraps { ok, data } replies.
export class IpcError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'IpcError';
    this.code = code;
  }
}

function bridge() {
  if (!window.loto) throw new IpcError('NO_BRIDGE', 'The desktop bridge is unavailable.');
  return window.loto;
}

export async function invoke(channel, payload) {
  const reply = await bridge().invoke(channel, payload);
  if (!reply || reply.ok !== true) {
    throw new IpcError(reply?.error?.code ?? 'UNKNOWN', reply?.error?.message ?? 'Unknown IPC error.');
  }
  return reply.data;
}

// Subscribes to a main-to-renderer event; returns an unsubscribe function.
export const on = (channel, listener) => bridge().on(channel, listener);
