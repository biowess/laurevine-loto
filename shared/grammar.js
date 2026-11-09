// Grammar endpoint rules shared by main (enforces) and renderer (disclosure): https anywhere, plain http only on this computer; no credentials.
export const GRAMMAR_LIMIT = 20000;
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
export function parseEndpoint(s) {
  try {
    const u = new URL(String(s || '').trim());
    return (u.protocol === 'https:' || (u.protocol === 'http:' && LOCAL.has(u.hostname))) && !u.username && !u.password && !u.hash ? u : null;
  } catch { return null; }
}
