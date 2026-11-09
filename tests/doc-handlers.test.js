import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { importStubbed, tmpDir } from './helpers/stubbed.js';

const L = (globalThis.__loto = {});
beforeEach(() => {
  Object.assign(L, { root: null, snaps: [], relinks: [], log: [], opened: [], batch: new Set(), shellErr: '', picks: null, saveTarget: null });
  L.history = { snapshot: async (p) => { L.snaps.push(p); }, relink: async (a, b) => { L.relinks.push([a, b]); } };
  L.recents = { add: (p) => L.log.push(['add', p]), rename: (a, b) => L.log.push(['rename', a, b]) };
  L.pickSave = async () => L.saveTarget;
  L.pickOpen = async () => L.picks ?? [];
  L.shell = { openPath: async (p) => { L.opened.push(p); return L.shellErr; }, showItem: () => {} };
  L.dialog = {};
});
const ev = { sender: { id: 1 } };
const H = await importStubbed('../../main/ipc/handlers/doc.js');
const err = (r, code) => { assert.equal(r.ok, false); assert.equal(r.error.code, code, r.error.message); };
const quiet = (t) => { const o = console.error; console.error = () => {}; t.after(() => { console.error = o; }); };
const file = async (dir, name, text = 'x') => { const p = path.join(dir, name); await fsp.writeFile(p, text); return p; };

test('save writes the file, returns metadata, and records a "Saved" history version', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'a.md');
  const r = await H.save({ path: f, text: '# t\n' });
  assert.equal(r.ok, true);
  assert.equal(r.size, 4);
  assert.equal(await fsp.readFile(f, 'utf8'), '# t\n');
  assert.deepEqual(L.snaps, [{ path: f, text: '# t\n', label: 'Saved' }]);
});

test('autosave is labelled "Autosave" in history; CRLF formatting is preserved on disk', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'a.md');
  await H.save({ path: f, text: 'a\nb', eol: 'crlf', dominantEol: 'crlf', autosave: true });
  assert.equal(await fsp.readFile(f, 'utf8'), 'a\r\nb');
  assert.equal(L.snaps[0].label, 'Autosave');
  await H.save({ path: f, text: 'a\nbc', autosave: 'true' });
  assert.equal(L.snaps[1].label, 'Saved', 'only autosave === true counts');
});

test('save with a stale expectedHash fails with E_CONFLICT, keeps the disk copy and records no history', async (t) => {
  const dir = await tmpDir(t), f = await file(dir, 'a.md', 'disk');
  const { doc } = await H.open({ path: f });
  await fsp.writeFile(f, 'changed elsewhere');
  err(await H.save({ path: f, text: 'mine', expectedHash: doc.hash }), 'E_CONFLICT');
  assert.equal(await fsp.readFile(f, 'utf8'), 'changed elsewhere');
  assert.deepEqual(L.snaps, []);
});

test('save maps failures to stable error codes and never leaks internal messages', async (t) => {
  quiet(t);
  const dir = await tmpDir(t);
  err(await H.save({ path: 'rel.md', text: 'x' }), 'E_PATH');
  err(await H.save({ path: path.join(dir, 'gone', 'a.md'), text: 'x' }), 'E_NOENT');
  const r = await H.save({ path: path.join(dir, 'a.md'), text: 123 });
  err(r, 'E_IO');
  assert.equal(r.error.message, 'The operation failed.');
  assert.deepEqual(L.snaps, []);
});

test('saveAs: cancel writes nothing; extensionless names get .md; existing .md is never silently replaced', async (t) => {
  const dir = await tmpDir(t);
  L.saveTarget = null;
  assert.deepEqual(await H.saveAs({ text: 'x' }, ev), { ok: true, canceled: true });
  assert.deepEqual(await fsp.readdir(dir), []);

  L.saveTarget = path.join(dir, 'note');
  const r = await H.saveAs({ text: 'body' }, ev);
  assert.equal(r.canceled, false);
  assert.equal(r.path, path.join(dir, 'note.md'));
  assert.equal(await fsp.readFile(path.join(dir, 'note.md'), 'utf8'), 'body');

  err(await H.saveAs({ text: 'other' }, ev), 'E_EXISTS');
  assert.equal(await fsp.readFile(path.join(dir, 'note.md'), 'utf8'), 'body');
});

test('saveAs adds the new path to recents and history; saveCopy does neither', async (t) => {
  const dir = await tmpDir(t);
  L.saveTarget = path.join(dir, 'a.txt');
  const r = await H.saveAs({ text: 'A', eol: 'crlf' }, ev);
  assert.equal(await fsp.readFile(r.path, 'utf8'), 'A');
  assert.deepEqual(L.log, [['add', r.path]]);
  assert.deepEqual(L.snaps, [{ path: r.path, text: 'A', label: 'Saved' }]);

  L.log.length = 0; L.snaps.length = 0;
  L.saveTarget = path.join(dir, 'copy.md');
  const c = await H.saveCopy({ text: 'C' }, ev);
  assert.equal(c.ok, true);
  assert.equal(await fsp.readFile(c.path, 'utf8'), 'C');
  assert.deepEqual([L.log, L.snaps], [[], []]);
});

test('saveAs into a missing folder reports E_NOENT', async (t) => {
  const dir = await tmpDir(t);
  L.saveTarget = path.join(dir, 'nope', 'a.md');
  err(await H.saveAs({ text: 'x' }, ev), 'E_NOENT');
});

test('open returns the document and remembers it unless recent is false; bad files report codes', async (t) => {
  const dir = await tmpDir(t), f = await file(dir, 'a.md', 'hi\r\n');
  const r = await H.open({ path: f });
  assert.equal(r.doc.text, 'hi\n');
  assert.deepEqual(L.log, [['add', f]]);
  L.log.length = 0;
  await H.open({ path: f, recent: false });
  assert.deepEqual(L.log, []);
  err(await H.open({ path: path.join(dir, 'missing.md') }), 'E_NOENT');
  const bin = path.join(dir, 'b.bin');
  await fsp.writeFile(bin, Buffer.from([1, 0, 2, 0xFF]));
  err(await H.open({ path: bin }), 'E_BINARY');
  assert.deepEqual(L.log, []);
});

test('openDialog returns readable docs and per-file errors without failing the whole call', async (t) => {
  const dir = await tmpDir(t), good = await file(dir, 'a.md'), bin = path.join(dir, 'b.bin');
  await fsp.writeFile(bin, Buffer.from([0, 0, 0]));
  L.picks = [good, bin];
  const r = await H.openDialog({}, ev);
  assert.equal(r.ok, true);
  assert.equal(r.canceled, false);
  assert.deepEqual(r.docs.map((d) => d.path), [good]);
  assert.deepEqual(r.errors.map((e) => [e.path, e.code]), [[bin, 'E_BINARY']]);
  L.picks = [];
  assert.equal((await H.openDialog(undefined, ev)).canceled, true);
});

test('stat reports existence for files, missing files and missing folders', async (t) => {
  const dir = await tmpDir(t), f = await file(dir, 'a.md', 'abc');
  const r = await H.stat({ path: f });
  assert.deepEqual([r.ok, r.exists, r.size], [true, true, 3]);
  assert.deepEqual(await H.stat({ path: path.join(dir, 'no.md') }), { ok: true, exists: false });
  assert.deepEqual(await H.stat({ path: path.join(dir, 'no', 'no.md') }), { ok: true, exists: false });
  err(await H.stat({ path: 'rel' }), 'E_PATH');
});

test('rename moves history and recents along; no-op and failed renames leave them alone', async (t) => {
  const dir = await tmpDir(t), a = await file(dir, 'a.md'), b = await file(dir, 'b.md');
  err(await H.rename({ path: a, name: 'b.md' }), 'E_EXISTS');
  err(await H.rename({ path: a, name: 'bad/name.md' }), 'E_NAME');
  assert.deepEqual([L.relinks, L.log], [[], []]);
  assert.equal((await H.rename({ path: a, name: 'a.md' })).path, a);
  assert.deepEqual([L.relinks, L.log], [[], []]);
  const r = await H.rename({ path: a, name: 'c.md' });
  const c = path.join(dir, 'c.md');
  assert.equal(r.path, c);
  assert.deepEqual(L.relinks, [[a, c]]);
  assert.deepEqual(L.log, [['rename', a, c]]);
  assert.equal(await fsp.readFile(b, 'utf8'), 'x');
});

test('openExternal only opens non-executable files inside the active workspace', async (t) => {
  quiet(t);
  const root = await tmpDir(t), outside = await tmpDir(t);
  const pdf = await file(root, 'a.pdf'), sh = await file(root, 'run.sh'), exe = await file(root, 'Setup.EXE'), out = await file(outside, 'o.pdf');
  err(await H.openExternal({ path: pdf }, ev), 'E_PATH');
  L.root = root;
  err(await H.openExternal({ path: out }, ev), 'E_PATH');
  err(await H.openExternal({ path: sh }, ev), 'E_PATH');
  err(await H.openExternal({ path: exe }, ev), 'E_PATH');
  err(await H.openExternal({ path: path.join(root, 'missing.pdf') }, ev), 'E_NOENT');
  assert.deepEqual(L.opened, []);
  assert.equal((await H.openExternal({ path: pdf }, ev)).ok, true);
  assert.deepEqual(L.opened, [pdf]);
  L.shellErr = 'no handler';
  err(await H.openExternal({ path: pdf }, ev), 'E_IO');
});

test('export handlers wrap failures as { ok: false, error } and enforce the picked output folder', async (t) => {
  const dir = await tmpDir(t);
  err(await H.exportExists({ dir, names: ['a.md'] }, ev), 'E_PATH');
  L.batch.add(dir);
  await file(dir, 'a.md');
  assert.deepEqual(await H.exportExists({ dir, names: ['a.md', 'b.md'] }, ev), { ok: true, exists: ['a.md'] });
  err(await H.exportWrite({ kind: 'zip', defaultName: 'x', entries: [{ name: 'A', text: '1' }, { name: 'a', text: '2' }] }, ev), 'E_ARGS');
});
