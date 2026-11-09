import { promises as fsp } from 'node:fs';
import path from 'node:path';

export class DocError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const DEVICE = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
const FS_CODES = {
  ENOENT: ['E_NOENT', 'File not found.'],
  EACCES: ['E_ACCESS', 'Permission denied.'],
  EPERM: ['E_ACCESS', 'Permission denied.'],
  EBUSY: ['E_BUSY', 'The file is locked by another process.'],
};

export function toDocError(err) {
  const m = FS_CODES[err?.code];
  return m ? new DocError(m[0], m[1]) : err;
}

// Absolute, normalised path to a regular file (or, with mustExist: false, to a file that may not exist yet).
export async function safePath(input, { mustExist = true, dir: allowDir = false } = {}) {
  if (typeof input !== 'string' || !input || input.length > 4096 || input.includes('\0') || !path.isAbsolute(input)) {
    throw new DocError('E_PATH', 'The path must be an absolute file path.');
  }
  const abs = path.resolve(input);
  if (/^[\\/]{2}[.?][\\/]/.test(input) || DEVICE.test(path.basename(abs))) throw new DocError('E_PATH', 'Device paths are not allowed.');
  try {
    const stat = await fsp.stat(abs);
    if (!stat.isFile() && !(allowDir && stat.isDirectory())) throw new DocError('E_NOTFILE', 'The path is not a regular file.');
    return { path: abs, stat };
  } catch (err) {
    if (err.code !== 'ENOENT') throw toDocError(err);
  }
  if (mustExist) throw new DocError('E_NOENT', 'File not found.');
  const dir = await fsp.stat(path.dirname(abs)).catch(() => null);
  if (!dir?.isDirectory()) throw new DocError('E_NOENT', 'Folder not found.');
  return { path: abs, stat: null };
}