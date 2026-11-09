import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError, toDocError } from './safe-path.js';
import { assetDir } from './asset-copy.js';

const EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif'];
const MAX = 50 * 1024 * 1024;
const p2 = (n) => String(n).padStart(2, '0');

export const stamp = (d = new Date()) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;

// Writes pasted image bytes as image-<timestamp>.<ext> into the asset folder or an existing folder; never overwrites.
export async function saveImage({ data, ext = 'png', docPath, dir, destDir }) {
  ext = String(ext).toLowerCase();
  if (!EXT.includes(ext)) throw new DocError('E_TYPE', 'That is not a supported image.');
  const buf = Buffer.from(data, 'base64');
  if (!buf.length) throw new DocError('E_TYPE', 'The image is empty.');
  if (buf.length > MAX) throw new DocError('E_TOOBIG', 'The image is larger than 50 MB.');
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
  const base = `image-${stamp()}`;
  for (let i = 1; i < 1000; i++) {
    const name = `${base}${i > 1 ? `-${i}` : ''}.${ext}`, dest = path.join(target, name);
    try {
      await fsp.writeFile(dest, buf, { flag: 'wx' });
      return { path: dest, name };
    } catch (e) {
      if (e.code !== 'EEXIST') throw toDocError(e);
    }
  }
  throw new DocError('E_EXISTS', 'No free file name was found.');
}
