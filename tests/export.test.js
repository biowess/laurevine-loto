import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { readZip, writeZip, crc32 } from '../main/core/zip.js';
import { importStubbed, tmpDir } from './helpers/stubbed.js';

const L = (globalThis.__loto = {});
beforeEach(() => { Object.assign(L, { batch: new Set(), dialog: {}, shell: {} }); });
const ev = { sender: { id: 1 } };
const { stem, inDir, writeExport } = await importStubbed('../../main/services/export/write.js');
const { writeTree, existingIn } = await importStubbed('../../main/services/export/tree.js');
const code = (c) => (e) => e?.code === c;
const ls = async (d) => (await fsp.readdir(d, { recursive: true })).sort();
const b64 = (s) => Buffer.from(s).toString('base64');

test('zip: write/read round-trip preserves names, bytes (incl. binary and unicode) and rejects garbage', () => {
  const bin = Buffer.from([0, 1, 2, 255, 254]);
  const out = readZip(writeZip([['a/é.md', Buffer.from('héllo')], ['b.bin', bin], ['empty.txt', Buffer.alloc(0)]]));
  assert.deepEqual(out.map(([n]) => n), ['a/é.md', 'b.bin', 'empty.txt']);
  assert.equal(out[0][1].toString(), 'héllo');
  assert.deepEqual(out[1][1], bin);
  assert.equal(out[2][1].length, 0);
  assert.equal(crc32(Buffer.from('123456789')), 0xCBF43926);
  assert.throws(() => readZip(Buffer.from('not a zip at all, definitely not')), /Not a ZIP/);
  assert.throws(() => readZip(writeZip([['a', Buffer.from('x')], ['b', Buffer.from('y')]]), { maxEntries: 1 }), /too many/);
  assert.throws(() => readZip(writeZip([['a', Buffer.alloc(100)]]), { maxBytes: 10 }), /too large/);
});

test('stem and inDir sanitise names and ignore relative dirs', () => {
  assert.equal(stem('a/b:c*d?.md'), 'a b c d .md');
  assert.equal(stem('   '), 'Document');
  assert.equal(stem('x'.repeat(300)).length, 100);
  assert.equal(inDir('/out', 'a.md'), path.join('/out', 'a.md'));
  assert.equal(inDir('rel', 'a.md'), 'a.md');
  assert.equal(inDir('', 'a.md'), 'a.md');
});

test('writeTree requires a folder authorised by the picker', async (t) => {
  const dir = await tmpDir(t);
  await assert.rejects(writeTree(ev, { dir, entries: [{ name: 'a.md', text: 'x' }], overwrite: [] }), code('E_PATH'));
  assert.deepEqual(await ls(dir), []);
});

test('writeTree writes text and base64 entries into nested folders without leaving temp files', async (t) => {
  const dir = await tmpDir(t);
  L.batch.add(dir);
  const r = await writeTree(ev, { dir, overwrite: [], entries: [{ name: 'a.md', text: 'héllo' }, { name: 'img\\p.png', data: b64('PNG') }] });
  assert.deepEqual(r, { path: dir, files: 2, size: Buffer.byteLength('héllo') + 3 });
  assert.equal(await fsp.readFile(path.join(dir, 'a.md'), 'utf8'), 'héllo');
  assert.equal(await fsp.readFile(path.join(dir, 'img', 'p.png'), 'utf8'), 'PNG');
  assert.deepEqual(await ls(dir), ['a.md', 'img', path.join('img', 'p.png')]);
});

test('writeTree rejects traversal names and writes nothing', async (t) => {
  const root = await tmpDir(t), dir = path.join(root, 'out');
  await fsp.mkdir(dir);
  L.batch.add(dir);
  await assert.rejects(writeTree(ev, { dir, overwrite: [], entries: [{ name: 'ok.md', text: 'x' }, { name: '../evil.md', text: 'x' }] }), code('E_PATH'));
  assert.deepEqual(await ls(root), ['out']);
});

test('writeTree never replaces an unconfirmed existing file and is all-or-nothing', async (t) => {
  const dir = await tmpDir(t);
  L.batch.add(dir);
  await fsp.writeFile(path.join(dir, 'keep.md'), 'ORIGINAL');
  const entries = [{ name: 'new.md', text: 'N' }, { name: 'keep.md', text: 'REPLACED' }];
  await assert.rejects(writeTree(ev, { dir, entries, overwrite: [] }), code('E_EXISTS'));
  assert.equal(await fsp.readFile(path.join(dir, 'keep.md'), 'utf8'), 'ORIGINAL');
  assert.deepEqual(await ls(dir), ['keep.md']);
  await writeTree(ev, { dir, entries, overwrite: ['keep.md'] });
  assert.equal(await fsp.readFile(path.join(dir, 'keep.md'), 'utf8'), 'REPLACED');
  assert.equal(await fsp.readFile(path.join(dir, 'new.md'), 'utf8'), 'N');
});

test('writeTree rejects duplicate names (case-insensitive) before writing', async (t) => {
  const dir = await tmpDir(t);
  L.batch.add(dir);
  await assert.rejects(writeTree(ev, { dir, overwrite: [], entries: [{ name: 'A.md', text: '1' }, { name: 'a.md', text: '2' }] }), code('E_ARGS'));
  assert.deepEqual(await ls(dir), []);
});

test('existingIn reports only files that exist, with normalised names', async (t) => {
  const dir = await tmpDir(t);
  L.batch.add(dir);
  await fsp.mkdir(path.join(dir, 'sub'));
  await fsp.writeFile(path.join(dir, 'sub', 'x.md'), '');
  assert.deepEqual(await existingIn(ev, { dir, names: ['sub\\x.md', 'nope.md'] }), ['sub/x.md']);
  await assert.rejects(existingIn(ev, { dir, names: ['../x'] }), code('E_PATH'));
});

test('writeExport (file): appends the extension, writes atomically, and cancel writes nothing', async (t) => {
  const dir = await tmpDir(t);
  L.dialog.save = async (o) => { L.opts = o; return { canceled: false, filePath: path.join(dir, 'out') }; };
  const r = await writeExport(ev, { kind: 'file', ext: 'md', defaultName: 'My/Doc', dir, entries: [{ name: 'x.md', text: '# hi' }] });
  assert.deepEqual(r, { path: path.join(dir, 'out.md'), size: 4, files: 1 });
  assert.equal(path.basename(L.opts.defaultPath), 'My Doc.md');
  assert.deepEqual(await ls(dir), ['out.md']);

  L.dialog.save = async () => ({ canceled: true });
  assert.deepEqual(await writeExport(ev, { kind: 'file', ext: 'md', defaultName: 'x', entries: [{ name: 'x.md', text: 'x' }] }), { canceled: true });
  assert.deepEqual(await ls(dir), ['out.md']);
});

test('writeExport (zip): produces a readable archive of all entries', async (t) => {
  const dir = await tmpDir(t);
  L.dialog.save = async () => ({ canceled: false, filePath: path.join(dir, 'pkg.ZIP') });
  const r = await writeExport(ev, { kind: 'zip', defaultName: 'pkg', entries: [{ name: 'a.md', text: 'A' }, { name: 'd\\b.png', data: b64('B') }] });
  assert.equal(r.path, path.join(dir, 'pkg.ZIP'));
  assert.deepEqual(readZip(await fsp.readFile(r.path)).map(([n, d]) => [n, d.toString()]), [['a.md', 'A'], ['d/b.png', 'B']]);
  assert.deepEqual(await ls(dir), ['pkg.ZIP']);
});

test('writeExport (folder): picks a free folder name and refuses names that escape the package', async (t) => {
  const dir = await tmpDir(t);
  L.dialog.open = async () => ({ canceled: false, filePaths: [dir] });
  const p = { kind: 'folder', defaultName: 'Pkg', entries: [{ name: 'a/b.md', text: 'A' }] };
  assert.equal((await writeExport(ev, p)).path, path.join(dir, 'Pkg'));
  const second = await writeExport(ev, p);
  assert.equal(second.path, path.join(dir, 'Pkg (1)'));
  assert.equal(await fsp.readFile(path.join(dir, 'Pkg', 'a', 'b.md'), 'utf8'), 'A');
  await assert.rejects(writeExport(ev, { ...p, defaultName: 'Evil', entries: [{ name: '../escape.md', text: 'x' }] }), code('E_PATH'));
  assert.ok(!(await ls(dir)).includes('escape.md'));
  L.dialog.open = async () => ({ canceled: true, filePaths: [] });
  assert.deepEqual(await writeExport(ev, p), { canceled: true });
});

test('writeExport rejects duplicate entry names before showing any dialog', async () => {
  L.dialog.save = async () => { throw new Error('dialog must not open'); };
  await assert.rejects(writeExport(ev, { kind: 'zip', defaultName: 'x', entries: [{ name: 'A', text: '1' }, { name: 'a', text: '2' }] }), code('E_ARGS'));
});
