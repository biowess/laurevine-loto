import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError, safePath } from '../main/services/fs/safe-path.js';
import { decode, detectEol, hashBuffer, readDocument, MAX_BYTES } from '../main/services/fs/read-document.js';
import { encode, writeDocument } from '../main/services/fs/write-document.js';
import { renameDocument } from '../main/services/fs/rename-document.js';
import { tmpDir } from './helpers/stubbed.js';

const code = (c) => (e) => e instanceof DocError && e.code === c;
const left = async (dir) => (await fsp.readdir(dir)).filter((n) => n.endsWith('.tmp'));

test('safePath rejects non-absolute, empty, NUL, oversized and device paths', async () => {
  for (const bad of ['', 'rel/file.md', './a.md', 'a\0b', '/' + 'x'.repeat(4100), 42, null, undefined]) {
    await assert.rejects(safePath(bad), code('E_PATH'), String(bad).slice(0, 20));
  }
  await assert.rejects(safePath('/tmp/CON.txt', { mustExist: false }), code('E_PATH'));
});

test('safePath distinguishes missing, directory and missing-parent cases', async (t) => {
  const dir = await tmpDir(t);
  await assert.rejects(safePath(path.join(dir, 'nope.md')), code('E_NOENT'));
  await assert.rejects(safePath(dir), code('E_NOTFILE'));
  assert.equal((await safePath(dir, { dir: true })).stat.isDirectory(), true);
  assert.equal((await safePath(path.join(dir, 'new.md'), { mustExist: false })).stat, null);
  await assert.rejects(safePath(path.join(dir, 'no-such-dir', 'x.md'), { mustExist: false }), code('E_NOENT'));
});

test('decode/encode round-trip every supported encoding', () => {
  const text = 'héllo — 漢字 😀\nline2';
  for (const opts of [{ encoding: 'utf-8' }, { encoding: 'utf-8', bom: true }, { encoding: 'utf-16le' }, { encoding: 'utf-16be' }]) {
    const out = decode(encode(text, opts));
    assert.equal(out.text, text, JSON.stringify(opts));
    assert.equal(out.encoding, opts.encoding);
    assert.equal(out.bom, opts.encoding !== 'utf-8' || Boolean(opts.bom));
  }
});

test('decode rejects binary, invalid UTF-8 and odd-length UTF-16', () => {
  assert.throws(() => decode(Buffer.from([0x68, 0x00, 0x69])), code('E_BINARY'));
  assert.throws(() => decode(Buffer.from([0xC3, 0x28])), code('E_BINARY'));
  assert.throws(() => decode(Buffer.from([0xFF, 0xFE, 0x41])), code('E_BINARY'));
});

test('detectEol reports lf/crlf/cr, mixed with the dominant style, and defaults to lf', () => {
  assert.deepEqual(detectEol('a\nb'), { eol: 'lf', dominantEol: 'lf' });
  assert.deepEqual(detectEol('a\r\nb\r\n'), { eol: 'crlf', dominantEol: 'crlf' });
  assert.deepEqual(detectEol('a\rb'), { eol: 'cr', dominantEol: 'cr' });
  assert.deepEqual(detectEol('a\r\nb\r\nc\n'), { eol: 'mixed', dominantEol: 'crlf' });
  assert.deepEqual(detectEol('no newline'), { eol: 'lf', dominantEol: 'lf' });
  assert.deepEqual(detectEol(''), { eol: 'lf', dominantEol: 'lf' });
});

test('encode normalises any input newlines to the requested style (mixed uses the dominant one)', () => {
  assert.equal(encode('a\r\nb\rc\nd', { eol: 'crlf' }).toString(), 'a\r\nb\r\nc\r\nd');
  assert.equal(encode('a\nb', { eol: 'cr' }).toString(), 'a\rb');
  assert.equal(encode('a\nb', { eol: 'mixed', dominantEol: 'crlf' }).toString(), 'a\r\nb');
  assert.equal(encode('a\r\nb', { eol: 'lf' }).toString(), 'a\nb');
});

test('readDocument returns LF text with format metadata and a content hash', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'a.md');
  const raw = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('one\r\ntwo\r\n')]);
  await fsp.writeFile(f, raw);
  const d = await readDocument(f);
  assert.equal(d.text, 'one\ntwo\n');
  assert.deepEqual([d.encoding, d.bom, d.eol, d.dominantEol], ['utf-8', true, 'crlf', 'crlf']);
  assert.equal(d.hash, hashBuffer(raw));
  assert.equal(d.size, raw.length);
});

test('readDocument rejects binary files and files over the size limit', async (t) => {
  const dir = await tmpDir(t), bin = path.join(dir, 'b.md'), big = path.join(dir, 'big.md');
  await fsp.writeFile(bin, Buffer.from([0x41, 0x00, 0x42]));
  await assert.rejects(readDocument(bin), code('E_BINARY'));
  const fh = await fsp.open(big, 'w');
  await fh.truncate(MAX_BYTES + 1);
  await fh.close();
  await assert.rejects(readDocument(big), code('E_TOOBIG'));
});

test('writeDocument creates a new file and leaves no temp files', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'new.md');
  const r = await writeDocument(f, '# hi\n');
  assert.equal(await fsp.readFile(f, 'utf8'), '# hi\n');
  assert.equal(r.size, 5);
  assert.equal(r.hash, (await readDocument(f)).hash);
  assert.deepEqual(await fsp.readdir(dir), ['new.md']);
});

test('writeDocument round-trips CRLF + BOM files byte-for-byte', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'a.md');
  const raw = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('a\r\nb\r\n')]);
  await fsp.writeFile(f, raw);
  const d = await readDocument(f);
  await writeDocument(f, d.text, d);
  assert.deepEqual(await fsp.readFile(f), raw);
});

test('writeDocument with expectedHash refuses to overwrite a file that changed on disk', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'a.md');
  await fsp.writeFile(f, 'v1');
  const { hash } = await readDocument(f);
  await fsp.writeFile(f, 'external edit');
  await assert.rejects(writeDocument(f, 'mine', { expectedHash: hash }), code('E_CONFLICT'));
  assert.equal(await fsp.readFile(f, 'utf8'), 'external edit');
  assert.deepEqual(await left(dir), []);
  const ok = await writeDocument(f, 'mine', { expectedHash: hashBuffer(Buffer.from('external edit')) });
  assert.equal(await fsp.readFile(f, 'utf8'), 'mine');
  assert.equal(ok.hash, hashBuffer(Buffer.from('mine')));
});

test('writeDocument fails cleanly when the folder is missing or the target is a directory', async (t) => {
  const dir = await tmpDir(t);
  await assert.rejects(writeDocument(path.join(dir, 'gone', 'a.md'), 'x'), code('E_NOENT'));
  await fsp.mkdir(path.join(dir, 'sub'));
  await assert.rejects(writeDocument(path.join(dir, 'sub'), 'x'), code('E_NOTFILE'));
  await assert.rejects(writeDocument('relative.md', 'x'), code('E_PATH'));
});

test('writeDocument writes empty documents', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'e.md');
  await writeDocument(f, '');
  assert.equal((await fsp.stat(f)).size, 0);
  assert.equal((await readDocument(f)).text, '');
});

test('writeDocument preserves permissions and writes through symlinks', { skip: process.platform === 'win32' }, async (t) => {
  const dir = await tmpDir(t), real = path.join(dir, 'real.md'), link = path.join(dir, 'link.md');
  await fsp.writeFile(real, 'old');
  await fsp.chmod(real, 0o640);
  await fsp.symlink(real, link);
  await writeDocument(link, 'new');
  assert.equal((await fsp.lstat(link)).isSymbolicLink(), true);
  assert.equal(await fsp.readFile(real, 'utf8'), 'new');
  assert.equal((await fsp.stat(real)).mode & 0o777, 0o640);
});

test('renameDocument renames in place, never overwrites, and validates names', async (t) => {
  const dir = await tmpDir(t), a = path.join(dir, 'a.md'), b = path.join(dir, 'b.md');
  await fsp.writeFile(a, 'A');
  await fsp.writeFile(b, 'B');
  await assert.rejects(renameDocument(a, 'b.md'), code('E_EXISTS'));
  assert.equal(await fsp.readFile(b, 'utf8'), 'B');
  for (const bad of ['', ' x.md', 'x.md ', 'x.', '..', 'a/b.md', 'a\\b.md', 'a:b.md', 'x'.repeat(256), null]) {
    await assert.rejects(renameDocument(a, bad), code('E_NAME'), JSON.stringify(bad)?.slice(0, 20));
  }
  assert.deepEqual(await renameDocument(a, 'a.md'), { from: a, path: a });
  const r = await renameDocument(a, 'c.md');
  assert.equal(r.path, path.join(dir, 'c.md'));
  assert.equal(await fsp.readFile(r.path, 'utf8'), 'A');
  await assert.rejects(fsp.access(a));
  await assert.rejects(renameDocument(a, 'z.md'), code('E_NOENT'));
});
