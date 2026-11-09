import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createJsonStore, ensureSubdir, writeJsonAtomic } from '../main/services/store/json-store.js';
import { tmpDir } from './helpers/stubbed.js';

const mk = (root, o = {}) => createJsonStore({ root, name: 'settings', delay: 1e6, ...o });
const names = (d) => fsp.readdir(d).then((l) => l.sort());

test('missing file yields defaults without recovery', async (t) => {
  const s = mk(await tmpDir(t), { defaults: { a: 1 } });
  assert.deepEqual(await s.load(), { a: 1 });
  assert.equal(s.status.recovered, false);
});

test('flush persists { version, data } atomically and reload merges over defaults', async (t) => {
  const dir = await tmpDir(t), s = mk(dir, { defaults: { a: 1, b: 2 }, version: 3 });
  await s.load();
  s.update((d) => ({ ...d, a: 9 }));
  await s.flush();
  assert.deepEqual(JSON.parse(await fsp.readFile(s.file, 'utf8')), { version: 3, data: { a: 9, b: 2 } });
  assert.deepEqual(await names(dir), ['settings.json']);
  const again = mk(dir, { defaults: { a: 1, b: 2, c: 3 }, version: 3 });
  assert.deepEqual(await again.load(), { a: 9, b: 2, c: 3 });
});

test('corrupt or wrongly shaped files are moved to .bak and replaced by defaults', async (t) => {
  for (const raw of ['{not json', '[]', '{"version":0,"data":{}}', '{"version":1,"data":[]}', '{"version":1.5,"data":{}}']) {
    const dir = await tmpDir(t), s = mk(dir, { defaults: { ok: true } });
    await fsp.writeFile(s.file, raw);
    assert.deepEqual(await s.load(), { ok: true }, raw);
    assert.equal(s.status.recovered, true);
    assert.equal(await fsp.readFile(`${s.file}.bak`, 'utf8'), raw);
    await assert.rejects(fsp.access(s.file));
  }
});

test('older versions are migrated, backed up, and persisted on flush', async (t) => {
  const dir = await tmpDir(t), s = mk(dir, { version: 2, defaults: {}, migrate: (d, from, to) => ({ ...d, from, to }) });
  await fsp.writeFile(s.file, JSON.stringify({ version: 1, data: { x: 1 } }));
  assert.deepEqual(await s.load(), { x: 1, from: 1, to: 2 });
  assert.ok((await names(dir)).includes('settings.json.bak'));
  await s.flush();
  assert.equal(JSON.parse(await fsp.readFile(s.file, 'utf8')).version, 2);
});

test('a failing migration recovers to defaults and keeps the original as .bak', async (t) => {
  const dir = await tmpDir(t), s = mk(dir, { version: 2, defaults: { d: 1 }, migrate: () => { throw new Error('boom'); } });
  const raw = JSON.stringify({ version: 1, data: { x: 1 } });
  await fsp.writeFile(s.file, raw);
  assert.deepEqual(await s.load(), { d: 1 });
  assert.equal(s.status.recovered, true);
  assert.equal(s.status.error, 'boom');
  assert.equal(await fsp.readFile(`${s.file}.bak`, 'utf8'), raw);
});

test('files from a newer app version are kept as-is (backup copied, no migration)', async (t) => {
  const dir = await tmpDir(t), s = mk(dir, { version: 1, defaults: {}, migrate: () => { throw new Error('must not run'); } });
  await fsp.writeFile(s.file, JSON.stringify({ version: 5, data: { future: true } }));
  assert.deepEqual(await s.load(), { future: true });
  assert.equal(s.status.recovered, false);
  assert.ok((await names(dir)).includes('settings.json.bak'));
});

test('store rejects bad construction and non-object data', async (t) => {
  const dir = await tmpDir(t);
  assert.throws(() => createJsonStore({ root: 'rel', name: 'settings' }), TypeError);
  assert.throws(() => createJsonStore({ root: dir, name: '../evil' }), TypeError);
  const s = mk(dir);
  assert.throws(() => s.set([]), TypeError);
  assert.throws(() => s.set(null), TypeError);
});

test('a failed write keeps the data dirty and leaves no temp file', async (t) => {
  const dir = await tmpDir(t), s = mk(path.join(dir, 'missing-root-is-created'));
  const orig = console.error;
  console.error = () => {};
  t.after(() => { console.error = orig; });
  await fsp.writeFile(path.join(dir, 'blocker'), 'x');
  const bad = mk(path.join(dir, 'blocker'));
  bad.set({ a: 1 });
  await bad.flush();
  assert.ok(bad.status.error);
  s.set({ a: 1 });
  await s.flush();
  assert.equal(s.status.error, null);
  assert.deepEqual(await names(path.dirname(s.file)), ['settings.json']);
});

test('ensureSubdir only creates whitelisted folders', async (t) => {
  const dir = await tmpDir(t);
  assert.equal(await ensureSubdir(dir, 'history'), path.join(dir, 'history'));
  await assert.rejects(ensureSubdir(dir, '../escape'), /unknown folder/);
  await assert.rejects(ensureSubdir(dir, 'random'), /unknown folder/);
});

test('writeJsonAtomic leaves the previous file intact when serialisation fails', async (t) => {
  const dir = await tmpDir(t), f = path.join(dir, 'x.json');
  await writeJsonAtomic(f, { ok: 1 });
  const cyc = {};
  cyc.self = cyc;
  await assert.rejects(writeJsonAtomic(f, cyc));
  assert.deepEqual(JSON.parse(await fsp.readFile(f, 'utf8')), { ok: 1 });
  assert.deepEqual(await names(dir), ['x.json']);
});
