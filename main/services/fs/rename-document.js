import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError, safePath, toDocError } from './safe-path.js';

const BAD = /[<>:"|?*\\/\x00-\x1f]/;

// Renames a file inside its own folder; never overwrites (a case-only change of the same file is allowed).
export async function renameDocument(from, name) {
  const { path: src, stat: s } = await safePath(from);
  if (typeof name !== 'string' || !name.trim() || name.length > 255 || name !== name.trim() || BAD.test(name) || /^\.+$/.test(name) || /[. ]$/.test(name)) {
    throw new DocError('E_NAME', 'Enter a file name without folders or reserved characters.');
  }
  const dst = path.join(path.dirname(src), name);
  if (dst === src) return { from: src, path: src };
  const { stat: t } = await safePath(dst, { mustExist: false });
  if (t && !(t.ino && t.ino === s.ino && t.dev === s.dev)) throw new DocError('E_EXISTS', 'A file with that name already exists.');
  try { await fsp.rename(src, dst); } catch (err) { throw toDocError(err); }
  return { from: src, path: dst };
}
