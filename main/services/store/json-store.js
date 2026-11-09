import { promises as fsp } from 'node:fs';
import path from 'node:path';

// Files and sub-folders that may live in userData. Names are whitelisted: nothing else is ever created.
export const FILES = Object.freeze(['settings', 'window-state', 'session', 'recents', 'workspaces']);
export const FOLDERS = Object.freeze(['recovery', 'history', 'presets', 'templates', 'themes', 'snippets', 'indexes']);

const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => structuredClone(v);

export async function ensureSubdir(root, name) {
  if (!FOLDERS.includes(name)) throw new Error(`store: unknown folder "${name}"`);
  const dir = path.join(root, name);
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

// temp file -> fsync -> rename, so a crash never leaves a half-written file.
export async function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  let fh = null;
  try {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    fh = await fsp.open(tmp, 'w');
    await fh.writeFile(JSON.stringify(value, null, 2), 'utf8');
    await fh.sync();
    await fh.close();
    fh = null;
    await fsp.rename(tmp, file);
  } catch (err) {
    if (fh) await fh.close().catch(() => {});
    await fsp.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

// File layout: { version, data }. migrate(data, fromVersion, toVersion) returns the upgraded data.
// load() never throws: unreadable or corrupt files are moved to <name>.json.bak and defaults are used.
export function createJsonStore({ root, name, version = 1, defaults = {}, migrate = null, delay = 400 }) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new TypeError('store: root must be an absolute path');
  if (!FILES.includes(name)) throw new TypeError(`store: unknown file "${name}"`);
  const file = path.join(root, `${name}.json`);
  const status = { recovered: false, error: null };
  let data = clone(defaults), timer = null, chain = Promise.resolve(), dirty = false;

  const keepBackup = (move) => (move ? fsp.rename(file, `${file}.bak`) : fsp.copyFile(file, `${file}.bak`)).catch(() => {});
  const recover = async () => { status.recovered = true; await keepBackup(true); data = clone(defaults); };

  async function load() {
    let raw;
    try {
      raw = await fsp.readFile(file, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') status.error = err.message;
      return data;
    }
    let doc = null;
    try { doc = JSON.parse(raw); } catch { /* corrupt */ }
    if (!plain(doc) || !Number.isInteger(doc.version) || doc.version < 1 || !plain(doc.data)) { await recover(); return data; }
    let next = doc.data;
    if (doc.version !== version) {
      await keepBackup(false);
      if (doc.version < version && migrate) {
        try {
          next = migrate(clone(doc.data), doc.version, version);
          if (!plain(next)) throw new TypeError('migrate must return an object');
          dirty = true;
          schedule();
        } catch (err) {
          status.error = err.message;
          await recover();
          return data;
        }
      }
    }
    data = { ...clone(defaults), ...next };
    return data;
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    chain = chain.then(async () => {
      if (!dirty) return;
      dirty = false;
      try {
        await writeJsonAtomic(file, { version, data });
        status.error = null;
      } catch (err) {
        dirty = true;
        status.error = err.message;
        console.error(`[store] writing ${name}.json failed:`, err.message);
      }
    });
    return chain;
  }

  function schedule() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => { flush(); }, delay);
    timer.unref?.();
  }

  return {
    file, status, load, flush,
    get: () => data,
    set(next) { if (!plain(next)) throw new TypeError('store: data must be an object'); data = next; schedule(); },
    update(fn) { const next = fn(data); if (next !== undefined) { if (!plain(next)) throw new TypeError('store: data must be an object'); data = next; } schedule(); },
  };
}
