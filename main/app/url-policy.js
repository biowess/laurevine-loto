// Pure URL validation for links that may leave the app.
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

// Returns the normalised href when the URL may be opened in the OS, otherwise null.
export function parseExternalUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!EXTERNAL_PROTOCOLS.has(url.protocol)) return null;
  if (url.protocol === 'mailto:') return url.pathname ? url.href : null;
  if (!url.hostname || url.username || url.password) return null;
  return url.href;
}
