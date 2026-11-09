import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assetMime } from '../../app/asset-path.js';
import { authorizeRoot } from '../../app/asset-protocol.js';

const CAP = 300, THUMB = 20 * 1024 * 1024;

async function info(file, ok) {
  const abs = path.resolve(file), st = await fsp.stat(abs).catch(() => null), name = path.basename(abs), mime = assetMime(abs) || '';
  const exists = !!(st && st.isFile()), kind = mime.split('/')[0];
  const o = { path: abs, name, exists, size: exists ? st.size : 0, mtime: exists ? st.mtimeMs : 0, type: kind === 'application' ? 'pdf' : kind || path.extname(name).slice(1).toLowerCase() || 'file', thumb: '' };
  if (exists && kind === 'image' && o.size <= THUMB) {
    const d = path.dirname(abs), id = 'att-' + createHash('sha1').update(d).digest('hex').slice(0, 12);
    if (!ok.has(d)) ok.set(d, await authorizeRoot(id, d));
    if (ok.get(d)) o.thumb = `loto-asset://${id}/${encodeURIComponent(name)}`;
  }
  return o;
}

// Stats the given files and lists the plain files of the given folders (no recursion, no dotfiles) with thumbnail URLs.
export async function listAssets({ paths = [], dirs = [] }) {
  const files = new Set(paths.map((p) => path.resolve(p)));
  for (const d of dirs) {
    const es = await fsp.readdir(path.resolve(d), { withFileTypes: true }).catch(() => []);
    es.filter((e) => e.isFile() && !e.name.startsWith('.')).slice(0, CAP).forEach((e) => files.add(path.join(path.resolve(d), e.name)));
  }
  const ok = new Map();
  return { items: await Promise.all([...files].map((f) => info(f, ok))) };
}
