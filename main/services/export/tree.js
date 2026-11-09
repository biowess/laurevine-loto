import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from '../fs/safe-path.js';
import { isBatchDir } from '../publish/pdf.js';

const MAX_BYTES = 400_000_000;
const norm = (n) => n.replace(/\\/g, '/');

function target(event, dir, name) {
  if (!isBatchDir(event, dir)) throw new DocError('E_PATH', 'Choose the output folder first.');
  const file = path.join(dir, ...norm(name).split('/')), rel = path.relative(dir, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new DocError('E_PATH', 'A file name in the export is not allowed.');
  return file;
}

const exists = async (f) => { try { await fsp.access(f); return true; } catch { return false; } };

export async function existingIn(event, { dir, names }) {
  const out = [];
  for (const n of names) if (await exists(target(event, dir, n))) out.push(norm(n));
  return out;
}

// Checks every name first; a file that already exists is replaced only when the caller listed it in overwrite.
export async function writeTree(event, { dir, entries, overwrite }) {
  const allowed = new Set(overwrite.map(norm)), jobs = [];
  let total = 0;
  for (const e of entries) {
    const name = norm(e.name), file = target(event, dir, name), data = e.text !== undefined ? Buffer.from(e.text, 'utf8') : Buffer.from(e.data, 'base64');
    total += data.length;
    if (total > MAX_BYTES) throw new DocError('E_TOOBIG', 'The export is too large.');
    if ((await exists(file)) && !allowed.has(name)) throw new DocError('E_EXISTS', `“${name}” already exists and was not confirmed for replacement. Nothing was written.`);
    jobs.push([file, data]);
  }
  if (new Set(jobs.map(([f]) => f.toLowerCase())).size !== jobs.length) throw new DocError('E_ARGS', 'The export contains duplicate file names.');
  for (const [file, data] of jobs) {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${Date.now().toString(36)}.part`;
    try {
      await fsp.writeFile(tmp, data, { flag: 'wx' });
      await fsp.rename(tmp, file);
    } catch (err) {
      await fsp.rm(tmp, { force: true }).catch(() => {});
      throw err;
    }
  }
  return { path: dir, files: jobs.length, size: total };
}
