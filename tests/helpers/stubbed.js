import { register } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let done = false;

// Imports a module with Electron-bound dependencies stubbed (see stub-hooks.mjs). State lives in globalThis.__loto.
export async function importStubbed(rel) {
  if (!done) { register('./stub-hooks.mjs', import.meta.url); done = true; }
  return import(new URL(rel, import.meta.url).href);
}

export async function tmpDir(t, prefix = 'loto-test-') {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
