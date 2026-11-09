import path from 'node:path';

const MIME = Object.freeze({
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.flac': 'audio/flac',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.ogv': 'video/ogg',
  '.pdf': 'application/pdf',
});

export const ASSET_ROOT_ID = /^[a-z][a-z0-9-]{0,31}$/;
export const assetMime = (file) => MIME[path.extname(file).toLowerCase()] || null;

// loto-asset://<rootId>/<relative path> -> { file, type, root } inside an authorized root, else null.
export function resolveAssetPath(rawUrl, roots) {
  let url, rel;
  try {
    url = new URL(rawUrl);
    rel = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const root = roots.get(url.hostname.toLowerCase());
  if (!root || url.username || url.password) return null;
  const parts = rel.split('/').filter(Boolean);
  if (!parts.length || parts.some((s) => s === '.' || s === '..' || /[:\\\0]/.test(s))) return null;
  const file = path.join(root, ...parts);
  const r = path.relative(root, file);
  const type = assetMime(file);
  return type && r && !r.startsWith('..') && !path.isAbsolute(r) ? { file, type, root } : null;
}
