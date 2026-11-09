import { randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { hashBuffer } from './read-document.js';
import { DocError, safePath, toDocError } from './safe-path.js';

const EOLS = { lf: '\n', crlf: '\r\n', cr: '\r' };
const TRANSIENT = new Set(process.platform === 'win32' ? ['EBUSY', 'EPERM', 'EACCES'] : ['EBUSY', 'EAGAIN']);
const DELAYS = [25, 50, 100, 200, 400, 800];

export function encode(text, { encoding = 'utf-8', bom = false, eol = 'lf', dominantEol = 'lf' } = {}) {
  let out = text.replace(/\r\n?/g, '\n');
  const nl = EOLS[eol === 'mixed' ? dominantEol : eol];
  if (nl !== '\n') out = out.replaceAll('\n', nl);
  if (encoding === 'utf-8') return Buffer.concat([bom ? Buffer.from([0xEF, 0xBB, 0xBF]) : Buffer.alloc(0), Buffer.from(out, 'utf8')]);
  const le = Buffer.from(out, 'utf16le');
  return encoding === 'utf-16be' ? Buffer.concat([Buffer.from([0xFE, 0xFF]), le.swap16()]) : Buffer.concat([Buffer.from([0xFF, 0xFE]), le]);
}

async function retry(fn) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (err) {
      if (!TRANSIENT.has(err.code) || i >= DELAYS.length) throw err;
      await new Promise((r) => setTimeout(r, DELAYS[i]));
    }
  }
}

// temp file in the same folder -> fsync -> rename. expectedHash (from readDocument) guards against on-disk changes.
export async function writeDocument(input, text, opts = {}) {
  const { path: file, stat } = await safePath(input, { mustExist: false });
  const target = stat ? await fsp.realpath(file) : file;
  if (stat && opts.expectedHash) {
    let cur;
    try { cur = await retry(() => fsp.readFile(target)); } catch (err) { throw toDocError(err); }
    if (hashBuffer(cur) !== opts.expectedHash) throw new DocError('E_CONFLICT', 'The file changed on disk since it was opened.');
  }
  const buf = encode(text, opts);
  const mode = stat ? stat.mode & 0o7777 : 0o666;
  const tmp = path.join(path.dirname(target), `.${path.basename(target)}.${randomBytes(4).toString('hex')}.tmp`);
  try {
    const fh = await fsp.open(tmp, 'wx', mode);
    try {
      await fh.writeFile(buf);
      await fh.sync();
    } finally {
      await fh.close();
    }
    if (stat) await fsp.chmod(tmp, mode).catch(() => {});
    await retry(() => fsp.rename(tmp, target));
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {});
    throw toDocError(err);
  }
  const done = await fsp.stat(target);
  return { path: file, mtimeMs: done.mtimeMs, size: buf.length, hash: hashBuffer(buf) };
}
