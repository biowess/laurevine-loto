import { isAppUrl } from '../../shared/constants.js';

// Runs a channel's declared input validator. Never throws.
export function validatePayload(def, payload) {
  let problem;
  try {
    problem = def.input(payload);
  } catch {
    problem = 'payload could not be validated';
  }
  return problem == null ? { ok: true } : { ok: false, message: String(problem) };
}

// Only frames served from loto://app/ may call into main.
export function isTrustedSender(event) {
  const frame = event?.senderFrame;
  return Boolean(frame) && isAppUrl(frame.url);
}
