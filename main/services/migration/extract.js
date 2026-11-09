import { promises as fsp } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const ZIP_LIMITS = Object.freeze({ entries: 20000, total: 1_000_000_000, file: 200_000_000, archive: 2_000_000_000, ratio: 200 });
const JUNK = /(^|\/)(__MACOSX|\.DS_Store)(\/|$)/;

// Archive entry name -> clean relative POSIX path, or null for absolute paths, drive letters, NUL and any ".." (zip-slip).
export function safeEntryName(name) {
  const n = String(name).replace(/\\/g, '/');
  if (!n || n.includes('\0') || n.startsWith('/') || /^[a-zA-Z]:/.test(n)) return null;
  const parts = n.split('/').filter((s) => s && s !== '.');
  return parts.length && !parts.includes('..') ? parts.join('/') : null;
}

const readAt = async (fh, pos, len) => {
  const buf = Buffer.alloc(len), { bytesRead } = await fh.read(buf, 0, len, pos);
  return bytesRead === len ? buf : buf.subarray(0, bytesRead);
};

// Extracts a ZIP into the empty folder dest, one entry at a time. Skips (with a reason) unsafe, encrypted, linked, oversized and duplicate entries; the archive is only read.
export async function extractZip(file, dest, limits = ZIP_LIMITS) {
  const fh = await fsp.open(file, 'r'), skipped = [];
  try {
    const size = (await fh.stat()).size;
    if (size > limits.archive) throw new Error('The ZIP file is too large.');
    const tailLen = Math.min(size, 65557), tail = await readAt(fh, size - tailLen, tailLen);
    let e = tail.length - 22;
    while (e >= 0 && tail.readUInt32LE(e) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Not a ZIP file.');
    const count = tail.readUInt16LE(e + 10), cdSize = tail.readUInt32LE(e + 12), cdOff = tail.readUInt32LE(e + 16);
    if (count === 0xFFFF || cdOff === 0xFFFFFFFF || cdSize === 0xFFFFFFFF) throw new Error('ZIP64 archives are not supported.');
    if (count > limits.entries) throw new Error('The ZIP file has too many entries.');
    if (cdSize > 64_000_000 || cdOff + cdSize > size) throw new Error('The ZIP directory is damaged.');
    const cd = await readAt(fh, cdOff, cdSize), list = [];
    let p = 0, declared = 0;
    for (let i = 0; i < count; i++) {
      if (p + 46 > cd.length || cd.readUInt32LE(p) !== 0x02014b50) throw new Error('The ZIP directory is damaged.');
      const nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
      list.push({ flags: cd.readUInt16LE(p + 8), method: cd.readUInt16LE(p + 10), csize: cd.readUInt32LE(p + 20), usize: cd.readUInt32LE(p + 24), attr: cd.readUInt32LE(p + 38), off: cd.readUInt32LE(p + 42), raw: cd.toString('utf8', p + 46, p + 46 + nl) });
      declared += list[i].usize;
      p += 46 + nl + el + cl;
    }
    if (declared > limits.total) throw new Error('The ZIP file expands to more than the allowed size.');

    const seen = new Set();
    let files = 0, bytes = 0;
    for (const en of list) {
      if (en.raw.endsWith('/') || JUNK.test(en.raw)) continue;
      const rel = safeEntryName(en.raw), skip = (reason) => skipped.push({ path: en.raw.slice(0, 200), reason });
      if (!rel) { skip('unsafe path'); continue; }
      if (en.flags & 1) { skip('encrypted'); continue; }
      if (((en.attr >>> 16) & 0o170000) === 0o120000) { skip('symbolic link'); continue; }
      if (en.method !== 0 && en.method !== 8) { skip('unsupported compression'); continue; }
      if (en.usize > limits.file) { skip('file too large'); continue; }
      if (en.usize > 1_000_000 && en.csize > 0 && en.usize / en.csize > limits.ratio) { skip('suspicious compression ratio'); continue; }
      if (seen.has(rel.toLowerCase())) { skip('duplicate name'); continue; }
      seen.add(rel.toLowerCase());
      const out = path.join(dest, ...rel.split('/')), back = path.relative(dest, out);
      if (!back || back.startsWith('..') || path.isAbsolute(back)) { skip('unsafe path'); continue; }
      try {
        const head = await readAt(fh, en.off, 30);
        if (head.length < 30 || head.readUInt32LE(0) !== 0x04034b50) { skip('damaged entry'); continue; }
        const raw = await readAt(fh, en.off + 30 + head.readUInt16LE(26) + head.readUInt16LE(28), en.csize);
        const data = en.method === 0 ? raw : zlib.inflateRawSync(raw, { maxOutputLength: limits.file });
        bytes += data.length;
        if (bytes > limits.total) throw new Error('The ZIP file expands to more than the allowed size.');
        await fsp.mkdir(path.dirname(out), { recursive: true });
        await fsp.writeFile(out, data, { flag: 'wx' });
        files++;
      } catch (err) {
        if (/allowed size/.test(String(err.message))) throw err;
        skip('could not be extracted');
      }
    }
    return { files, bytes, skipped };
  } finally {
    await fh.close();
  }
}

// A single wrapping folder (usual for downloaded archives) is treated as the root of the source.
export async function unwrap(dir) {
  const ents = (await fsp.readdir(dir, { withFileTypes: true })).filter((d) => !JUNK.test(d.name));
  return ents.length === 1 && ents[0].isDirectory() ? path.join(dir, ents[0].name) : dir;
}
