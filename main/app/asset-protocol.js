import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';
import { ASSET_SCHEME, CSP } from '../../shared/constants.js';
import { assetMime, resolveAssetPath } from './asset-path.js';

const roots = new Map();
const PASS = ['content-length', 'content-range', 'accept-ranges'];

const respond = (status, body, headers = {}) => new Response(body, {
  status,
  headers: { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', ...headers },
});

export async function authorizeRoot(id, dir) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir)) return false;
  try {
    const real = await realpath(dir);
    if (!(await stat(real)).isDirectory()) return false;
    roots.set(id, real);
    return true;
  } catch {
    return false;
  }
}

// Read-only: GET/HEAD of image, audio, video and PDF files inside authorized roots. Must run after the app is ready.
export function registerAssetProtocol() {
  protocol.handle(ASSET_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return respond(405, 'Method not allowed');
    const hit = resolveAssetPath(request.url, roots);
    if (!hit) return respond(404, 'Not found');
    try {
      const real = await realpath(hit.file);
      const rel = path.relative(hit.root, real);
      if (rel.startsWith('..') || path.isAbsolute(rel) || !assetMime(real)) return respond(404, 'Not found');
      const res = await net.fetch(pathToFileURL(real).href, { method: request.method, headers: request.headers });
      const headers = { 'Content-Type': hit.type };
      for (const k of PASS) if (res.headers.has(k)) headers[k] = res.headers.get(k);
      return respond(res.status, res.body, headers);
    } catch {
      return respond(404, 'Not found');
    }
  });
}
