import { readFile } from 'node:fs/promises';
import { protocol } from 'electron';
import { ASSET_SCHEME, CSP, SCHEME } from '../../shared/constants.js';
import { mimeFor, resolveAppPath } from './app-path.js';
import { RENDERER_DIR, SHARED_DIR } from './paths.js';

// Must run before the app is ready.
export function registerPrivilegedSchemes() {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
    { scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

const respond = (status, body, type = 'text/plain; charset=utf-8') => new Response(body, {
  status,
  headers: {
    'Content-Type': type,
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
  },
});

// Serves renderer/ at loto://app/ and shared/ at loto://app/shared/. Must run after the app is ready.
export function registerAppProtocol() {
  protocol.handle(SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return respond(405, 'Method not allowed');
    const file = resolveAppPath(request.url, { rendererDir: RENDERER_DIR, sharedDir: SHARED_DIR });
    const type = file && mimeFor(file);
    if (!file || !type) return respond(404, 'Not found');
    try {
      return respond(200, request.method === 'HEAD' ? null : await readFile(file), type);
    } catch {
      return respond(404, 'Not found');
    }
  });
}
