import { promises as fsp, constants } from 'node:fs';
import path from 'node:path';
import { DocError, toDocError } from './safe-path.js';
import { assetMime } from '../../app/asset-path.js';

const EXEC = /\.(exe|bat|cmd|com|msi|scr|ps1|sh|app|jar|js|mjs|vbs|lnk|dll|appimage)$/i;
const BAD = /[<>:"/\\|?*\x00-\x1f]/g;
const SEG_BAD = /[<>:"|?*\x00-\x1f]/;
const MAX = 200 * 1024 * 1024;

export const allowed = (file, kind) => (kind === 'image' ? (assetMime(file) || '').startsWith('image/') : !EXEC.test(file));

// Folder inside the document's folder; `{doc}` becomes the document name. Absolute paths and `..` are refused.
export function assetDir(docPath, pattern) {
  const doc = path.parse(docPath);
  const rel = String(pattern || 'assets').replace(/\{doc\}/g, doc.name.replace(BAD, '_')).replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/+$/, '');
  if (!rel || rel.length > 200 || /^([a-zA-Z]:|\/)/.test(rel) || rel.split('/').some((s) => !s || s === '..' || SEG_BAD.test(s))) {
    throw new DocError('E_PATH', 'The asset folder must be a relative folder inside the document folder.');
  }
  return path.resolve(doc.dir, rel);
}

export async function describeFile(file, kind) {
  const abs = path.resolve(file);
  const st = await fsp.stat(abs).catch((e) => { throw toDocError(e); });
  if (!st.isFile()) throw new DocError('E_NOTFILE', 'The path is not a regular file.');
  if (!allowed(abs, kind)) throw new DocError('E_TYPE', kind === 'image' ? 'That is not a supported image.' : 'That file type cannot be inserted.');
  return { path: abs, name: path.basename(abs), size: st.size, image: (assetMime(abs) || '').startsWith('image/') };
}

// Copies into the target folder under a collision-safe name (name, name-2, name-3 …); never overwrites.
export async function copyAsset({ src, kind, docPath, dir, destDir }) {
  const f = await describeFile(src, kind);
  if (f.size > MAX) throw new DocError('E_TOOBIG', 'The file is larger than 200 MB.');
  let target;
  if (destDir) {
    target = path.resolve(destDir);
    const st = await fsp.stat(target).catch((e) => { throw toDocError(e); });
    if (!st.isDirectory()) throw new DocError('E_PATH', 'The attachment folder does not exist.');
  } else {
    if (!docPath) throw new DocError('E_PATH', 'Save the document first.');
    target = assetDir(docPath, dir);
    await fsp.mkdir(target, { recursive: true }).catch((e) => { throw toDocError(e); });
  }
  if (path.dirname(f.path) === target) return { path: f.path, name: f.name };
  const { name, ext } = path.parse(f.name);
  let base = name.replace(BAD, '_').replace(/^\.+|[. ]+$/g, '') || 'file';
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(base)) base = `_${base}`;
  for (let i = 1; i < 1000; i++) {
    const out = `${base}${i > 1 ? `-${i}` : ''}${ext}`, dest = path.join(target, out);
    try {
      await fsp.copyFile(f.path, dest, constants.COPYFILE_EXCL);
      return { path: dest, name: out };
    } catch (e) {
      if (e.code !== 'EEXIST') throw toDocError(e);
    }
  }
  throw new DocError('E_EXISTS', 'No free file name was found.');
}
