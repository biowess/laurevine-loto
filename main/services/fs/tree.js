import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from './safe-path.js';

const MAX = 5000;
const IGNORED = new Set(['.git', 'node_modules', '.ds_store', 'thumbs.db', 'desktop.ini', '$recycle.bin', 'system volume information', '.spotlight-v100', '.trashes', '.fseventsd', '.temporaryitems']);
const ICONS = [
  ['markdown', 'md markdown mdown mkd mdx'],
  ['image', 'png jpg jpeg gif webp svg avif bmp ico'],
  ['pdf', 'pdf'],
  ['media', 'mp3 wav ogg flac m4a aac opus mp4 webm mov mkv m4v'],
  ['data', 'json yaml yml toml csv tsv xml'],
];
const EXT = new Map(ICONS.flatMap(([icon, exts]) => exts.split(' ').map((e) => [e, icon])));

export const isIgnored = (name) => IGNORED.has(name.toLowerCase()) || name.startsWith('._') || name.startsWith('.Trash');
export const iconFor = (name, dir) => (dir ? 'folder' : EXT.get(path.extname(name).slice(1).toLowerCase()) ?? 'file');
export const within = (root, p) => {
  const rel = path.relative(root, p);
  return rel.split(path.sep)[0] !== '..' && !path.isAbsolute(rel);
};

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
const SORTS = {
  name: byName,
  modified: (a, b) => b.mtimeMs - a.mtimeMs || byName(a, b),
  type: (a, b) => a.icon.localeCompare(b.icon) || path.extname(a.name).localeCompare(path.extname(b.name)) || byName(a, b),
};
export const sortEntries = (list, sort = 'name', foldersFirst = true) => list.sort((a, b) => (foldersFirst && a.dir !== b.dir ? (a.dir ? -1 : 1) : (SORTS[sort] ?? byName)(a, b)));

// One level of `dir` (inside `root`). Symlinked folders that point outside the root or back to an ancestor are listed but not expandable.
export async function listDir(root, dir, { showHidden = false, sort = 'name', foldersFirst = true } = {}) {
  const base = path.resolve(dir);
  const real = within(root, base) ? await fsp.realpath(base) : null;
  if (!real || !within(root, real)) throw new DocError('E_PATH', 'The folder is outside the workspace.');
  const chainOf = async () => {
    const parts = [root];
    for (const s of path.relative(root, base).split(path.sep).filter(Boolean)) parts.push(path.join(parts.at(-1), s));
    return new Set(await Promise.all(parts.map((p) => fsp.realpath(p))));
  };
  const entries = [];
  let truncated = false, chain = null;
  for (const d of await fsp.readdir(base, { withFileTypes: true })) {
    const name = d.name;
    if (isIgnored(name) || (!showHidden && name.startsWith('.'))) continue;
    if (entries.length >= MAX) { truncated = true; break; }
    const full = path.join(base, name), link = d.isSymbolicLink();
    let st, target = null;
    try {
      st = await fsp.stat(full);
      if (link && st.isDirectory()) target = await fsp.realpath(full);
    } catch { continue; }
    const isDir = st.isDirectory();
    if (!isDir && !st.isFile()) continue;
    let expandable = isDir;
    if (target) {
      chain ??= await chainOf();
      expandable = within(root, target) && !chain.has(target) && !(real + path.sep).startsWith(target + path.sep);
    }
    entries.push({ name, path: full, dir: isDir, icon: iconFor(name, isDir), size: isDir ? 0 : st.size, mtimeMs: st.mtimeMs, hidden: name.startsWith('.'), symlink: link, expandable });
  }
  return { entries: sortEntries(entries, sort, foldersFirst), truncated };
}
