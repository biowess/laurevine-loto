import { ipcMain } from 'electron';
import { INVOKE_CHANNELS } from '../../shared/channels.js';
import { handlers } from './handlers/index.js';
import { isTrustedSender, validatePayload } from './validate.js';

const fail = (code, message) => ({ ok: false, error: { code, message } });

// Registers ipcMain.handle only for channels declared in shared/channels.js.
// Every reply is { ok: true, data } or { ok: false, error: { code, message } }; handlers never throw to the renderer.
export function registerIpc() {
  const declared = Object.keys(INVOKE_CHANNELS);
  for (const channel of Object.keys(handlers)) {
    if (!declared.includes(channel)) throw new Error(`Handler for undeclared IPC channel: ${channel}`);
  }
  for (const channel of declared) {
    const handler = handlers[channel];
    if (typeof handler !== 'function') throw new Error(`Missing handler for IPC channel: ${channel}`);
    ipcMain.handle(channel, async (event, payload) => {
      if (!isTrustedSender(event)) return fail('FORBIDDEN_SENDER', 'Untrusted sender.');
      const check = validatePayload(INVOKE_CHANNELS[channel], payload);
      if (!check.ok) return fail('INVALID_PAYLOAD', check.message);
      try {
        return { ok: true, data: await handler(payload, event) };
      } catch (err) {
        console.error(`[ipc] ${channel} failed:`, err);
        return fail('INTERNAL', 'The operation failed.');
      }
    });
  }
}
