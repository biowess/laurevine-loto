import { createHash } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import { DocError, safePath, toDocError } from './safe-path.js';

export const MAX_BYTES = 64 * 1024 * 1024;
export const hashBuffer = (buf) => createHash('sha256').update(buf).digest('hex');

const binary = () => new DocError('E_BINARY', 'This file is binary or not UTF-8/UTF-16 text, so it cannot be opened as a document.');

export function decode(buf) {
  let encoding = 'utf-8', bom = false, body = buf;
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) { bom = true; body = buf.subarray(3); }
  else if (buf[0] === 0xFF && buf[1] === 0xFE) { encoding = 'utf-16le'; bom = true; body = buf.subarray(2); }
  else if (buf[0] === 0xFE && buf[1] === 0xFF) { encoding = 'utf-16be'; bom = true; body = buf.subarray(2); }
  if (encoding !== 'utf-8' && body.length % 2) throw binary();
  if (encoding === 'utf-16be') body = Buffer.from(body).swap16();
  let text;
  try {
    text = new TextDecoder(encoding === 'utf-8' ? 'utf-8' : 'utf-16le', { fatal: true, ignoreBOM: true }).decode(body);
  } catch {
    throw binary();
  }
  if (text.includes('\0')) throw binary();
  return { text, encoding, bom };
}

export function detectEol(text) {
  const n = { lf: 0, crlf: 0, cr: 0 };
  for (const m of text.matchAll(/\r\n|\n|\r/g)) n[m[0] === '\r\n' ? 'crlf' : m[0] === '\n' ? 'lf' : 'cr']++;
  const used = Object.keys(n).filter((k) => n[k]);
  const dominantEol = ['lf', 'crlf', 'cr'].reduce((a, k) => (n[k] > n[a] ? k : a), 'lf');
  return { eol: used.length > 1 ? 'mixed' : used[0] ?? 'lf', dominantEol };
}

export async function readDocument(input) {
  const { path: file, stat } = await safePath(input);
  if (stat.size > MAX_BYTES) throw new DocError('E_TOOBIG', 'The file is larger than 64 MB.');
  let buf;
  try { buf = await fsp.readFile(file); } catch (err) { throw toDocError(err); }
  const { text, encoding, bom } = decode(buf);
  const { eol, dominantEol } = detectEol(text);
  return { path: file, text: text.replace(/\r\n?/g, '\n'), encoding, bom, eol, dominantEol, mtimeMs: stat.mtimeMs, size: buf.length, hash: hashBuffer(buf) };
}
