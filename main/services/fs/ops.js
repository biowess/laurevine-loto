import { createHash } from 'node:crypto';
import { constants, createReadStream, promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError, toDocError } from './safe-path.js';
import { within } from './tree.js';

const WIN_BAD = /[<>:"|?*\x00-\x1f]/;
const WIN_DEV = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;
const OUTSIDE = () => new DocError('E_PATH', 'The path is outside the workspace.');
const taken = () => Object.assign(new Error('exists'), { code: 'EEXIST' });
const exists = (p) => fsp.lstat(p).then(() => true, () => false);

export function validateName(name, platform = process.platform) {
  const win = platform === 'win32';
  if (typeof name !== 'string' || !name || name !== name.trim() || /^\.+$/.test(name) || /[/\\\0]/.test(name)
    || (win ? name.length > 255 || WIN_BAD.test(name) || WIN_DEV.test(name) || /[. ]$/.test(name) : Buffer.byteLength(name) > 255)
    || (platform === 'darwin' && name.includes(':'))) {
    throw new DocError('E_NAME', 'Enter a name without folders, reserved characters or reserved words.');
  }
  return name;
}

async function nearestReal(p) {
  const rest = [];
  for (let cur = p; ; cur = path.dirname(cur)) {
    try { return path.join(await fsp.realpath(cur), ...rest.reverse()); } catch (e) {
      if (e.code !== 'ENOENT' || path.dirname(cur) === cur) throw toDocError(e);
      rest.push(path.basename(cur));
    }
  }
}

// Absolute path whose parent (symlinks resolved) lies inside one of the roots; the leaf is not followed.
async function guard(roots, p) {
  if (typeof p !== 'string' || !path.isAbsolute(p) || p.includes('\0')) throw new DocError('E_PATH', 'The path must be absolute.');
  const abs = path.resolve(p);
  if (!roots.some((r) => within(path.resolve(r), abs))) throw OUTSIDE();
  const real = await Promise.all(roots.map((r) => fsp.realpath(r)));
  const parent = await nearestReal(path.dirname(abs));
  if (!real.some((r) => within(r, parent))) throw OUTSIDE();
  return abs;
}

async function source(root, p) {
  const abs = await guard([root], p);
  if (abs === path.resolve(root)) throw new DocError('E_PATH', 'The workspace folder itself cannot be changed.');
  try { return { abs, st: await fsp.lstat(abs) }; } catch (e) { throw toDocError(e); }
}

async function folder(p) {
  const st = await fsp.stat(p).catch(() => null);
  if (!st?.isDirectory()) throw new DocError('E_NOENT', 'Folder not found.');
}

// Tries name, "name (2)", "name (3)" ... until make(path) succeeds without EEXIST.
async function place(dir, name, isDir, make) {
  const { name: stem, ext } = isDir ? { name, ext: '' } : path.parse(name);
  for (let i = 1; i < 1000; i++) {
    const to = path.join(dir, i === 1 ? name : `${stem} (${i})${ext}`);
    try { await make(to); return to; } catch (e) { if (e.code !== 'EEXIST') throw toDocError(e); }
  }
  throw new DocError('E_EXISTS', 'Could not find a free name.');
}

const hashFile = (p) => new Promise((res, rej) => {
  const h = createHash('sha256');
  createReadStream(p).on('data', (d) => h.update(d)).on('error', rej).on('end', () => res(h.digest('hex')));
});

async function sig(p) {
  const st = await fsp.lstat(p);
  if (st.isSymbolicLink()) return `l:${await fsp.readlink(p)}`;
  if (!st.isDirectory()) return `f:${st.size}:${await hashFile(p)}`;
  const parts = [];
  for (const n of (await fsp.readdir(p)).sort()) parts.push(`${n}=${await sig(path.join(p, n))}`);
  return `d:[${parts.join(',')}]`;
}

async function copyTree(from, to, st) {
  if (st.isSymbolicLink()) await fsp.symlink(await fsp.readlink(from), to);
  else if (st.isDirectory()) await fsp.cp(from, to, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
  else await fsp.copyFile(from, to, constants.COPYFILE_EXCL);
}

async function copyVerified(from, to, st) {
  await copyTree(from, to, st);
  if ((await sig(from)) !== (await sig(to))) {
    await fsp.rm(to, { recursive: true, force: true });
    throw new DocError('E_IO', 'The copy could not be verified; the original was kept.');
  }
}

async function each(list, fn) {
  const results = [];
  for (const from of list) {
    try { results.push({ from, path: await fn(from) }); } catch (err) {
      const e = toDocError(err);
      if (!(e instanceof DocError)) console.error('[fs-ops]', e);
      results.push({ from, error: e instanceof DocError ? { code: e.code, message: e.message } : { code: 'E_IO', message: 'The operation failed.' } });
    }
  }
  return results;
}

async function create(root, dir, name, isDir) {
  validateName(name);
  const to = await guard([root], path.join(dir, name));
  await folder(path.dirname(to));
  return place(path.dirname(to), name, isDir, (p) => (isDir ? fsp.mkdir(p) : fsp.writeFile(p, '', { flag: 'wx' })));
}

export const createFile = (root, dir, name) => create(root, dir, name, false);
export const createFolder = (root, dir, name) => create(root, dir, name, true);

export async function rename(root, from, name) {
  validateName(name);
  const { abs, st } = await source(root, from);
  const dst = await guard([root], path.join(path.dirname(abs), name));
  if (dst === abs) return abs;
  const t = await fsp.lstat(dst).catch(() => null);
  if (t && !(t.ino && t.ino === st.ino && t.dev === st.dev)) throw new DocError('E_EXISTS', 'An item with that name already exists.');
  try { await fsp.rename(abs, dst); } catch (e) { throw toDocError(e); }
  return dst;
}

// extra: a folder outside the workspace the user picked in a native dialog.
async function transfer(root, paths, toDir, extra, move) {
  const roots = extra ? [root, extra] : [root];
  return each(paths, async (from) => {
    const { abs, st } = await source(root, from);
    const first = await guard(roots, path.join(toDir, path.basename(abs)));
    const dir = path.dirname(first);
    await folder(dir);
    if (st.isDirectory() && (within(abs, dir) || within(await fsp.realpath(abs), await fsp.realpath(dir)))) throw new DocError('E_PATH', 'A folder cannot be placed inside itself.');
    if (move && dir === path.dirname(abs)) return abs;
    return place(dir, path.basename(abs), st.isDirectory(), async (to) => {
      if (await exists(to)) throw taken();
      if (!move) return copyTree(abs, to, st);
      try { await fsp.rename(abs, to); } catch (e) {
        if (e.code !== 'EXDEV') throw e;
        await copyVerified(abs, to, st);
        await fsp.rm(abs, { recursive: true, force: true });
      }
    });
  });
}

export const move = (root, paths, toDir, extra) => transfer(root, paths, toDir, extra, true);
export const copy = (root, paths, toDir, extra) => transfer(root, paths, toDir, extra, false);

export async function duplicate(root, from) {
  const { abs, st } = await source(root, from);
  const { name, ext } = st.isDirectory() ? { name: path.basename(abs), ext: '' } : path.parse(abs);
  return place(path.dirname(abs), `${name} copy${ext}`, st.isDirectory(), async (to) => {
    if (await exists(to)) throw taken();
    await copyTree(abs, to, st);
  });
}

// confirm(names) -> boolean is optional; trash(path) is shell.trashItem.
export async function remove(root, paths, { trash, confirm }) {
  const items = [];
  for (const p of paths) items.push((await source(root, p)).abs);
  if (confirm && !(await confirm(items.map((p) => path.basename(p))))) return { canceled: true, results: [] };
  return { canceled: false, results: await each(items, async (abs) => { await trash(abs); return null; }) };
}
