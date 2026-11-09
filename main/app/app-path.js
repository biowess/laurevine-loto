// Pure helpers behind the loto:// protocol (no Electron import, so they are unit-testable).
import path from 'node:path';
import { APP_HOST, SCHEME } from '../../shared/constants.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export const mimeFor = (file) => MIME[path.extname(file).toLowerCase()] ?? null;

// Maps a loto://app/ URL to an absolute file under rendererDir (or sharedDir for /shared/).
// Returns null for anything else, including every path-traversal attempt.
export function resolveAppPath(urlString, { rendererDir, sharedDir }) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }
  if (url.protocol !== `${SCHEME}:` || url.hostname !== APP_HOST) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0') || pathname.includes('\\')) return null;
  if (pathname === '/') pathname = '/index.html';

  const inShared = pathname.startsWith('/shared/');
  const rel = inShared ? pathname.slice('/shared/'.length) : pathname.slice(1);
  if (!rel || rel.split('/').some((segment) => segment === '..')) return null;

  const root = path.resolve(inShared ? sharedDir : rendererDir);
  const target = path.resolve(root, rel);
  return target.startsWith(root + path.sep) ? target : null;
}
