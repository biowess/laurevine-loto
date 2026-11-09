import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createRecovery, KEY } from '../main/services/recovery/service.js';
import { tmpDir } from './helpers/stubbed.js';

const snap = (key, text = 'body', extra = {}) => ({ key, name: `${key}.md`, path: null, text, caret: 3, mode: 'edit', ...extra });
const files = async (d) => (await fsp.readdir(d)).sort();

test('clean start reports no crash; shutdown removes snapshots and the lock', async (t) => {
  const dir = await tmpDir(t), r = createRecovery({ dir });
  assert.deepEqual(await r.init(), { crashed: false });
  assert.deepEqual(await r.put(snap('a')), { skipped: false });
  assert.deepEqual(await files(dir), ['a.json', 'running.lock']);
  await r.shutdown();
  assert.deepEqual(await files(dir), []);
  assert.equal((await createRecovery({ dir }).init()).crashed, false);
});

test('unclean exit: snapshots are offered newest first with full text readable', async (t) => {
  const dir = await tmpDir(t), r1 = createRecovery({ dir });
  await r1.init();
  await r1.put(snap('old', 'old text', { path: '/w/x.md' }));
  await r1.put(snap('new', 'new text'));
  const j = path.join(dir, 'old.json');
  await fsp.writeFile(j, JSON.stringify({ ...JSON.parse(await fsp.readFile(j, 'utf8')), savedAt: 1 }));

  const r2 = createRecovery({ dir });
  assert.deepEqual(await r2.init(), { crashed: true });
  assert.deepEqual(r2.list().map((s) => s.key), ['new', 'old']);
  assert.equal(r2.list()[1].path, '/w/x.md');
  assert.equal('text' in r2.list()[0], false, 'list returns metadata only');
  assert.equal((await r2.read('old')).text, 'old text');
  assert.equal(await r2.read('missing'), null);
});

test('after a clean restart, leftover snapshot files are discarded rather than offered', async (t) => {
  const dir = await tmpDir(t);
  await fsp.writeFile(path.join(dir, 'stale.json'), JSON.stringify({ ...snap('stale'), savedAt: 1 }));
  const r = createRecovery({ dir });
  assert.deepEqual(await r.init(), { crashed: false });
  assert.deepEqual(r.list(), []);
  assert.deepEqual(await files(dir), ['running.lock']);
});

test('crash recovery drops corrupt, mismatched, text-less and badly named snapshots', async (t) => {
  const dir = await tmpDir(t);
  await fsp.writeFile(path.join(dir, 'running.lock'), '1');
  await fsp.writeFile(path.join(dir, 'good.json'), JSON.stringify(snap('good')));
  await fsp.writeFile(path.join(dir, 'corrupt.json'), '{nope');
  await fsp.writeFile(path.join(dir, 'mismatch.json'), JSON.stringify(snap('other')));
  await fsp.writeFile(path.join(dir, 'notext.json'), JSON.stringify({ key: 'notext', name: 'x' }));
  await fsp.writeFile(path.join(dir, 'bad key.json'), JSON.stringify(snap('bad key')));
  const r = createRecovery({ dir });
  await r.init();
  assert.deepEqual(r.list().map((s) => s.key), ['good']);
  assert.deepEqual(await files(dir), ['good.json', 'running.lock']);
});

test('put overwrites per key, skips oversized documents, and evicts the oldest beyond limits', async (t) => {
  const dir = await tmpDir(t), r = createRecovery({ dir, limits: { files: 2, bytes: 1e6, doc: 10 } });
  await r.init();
  assert.deepEqual(await r.put(snap('big', 'x'.repeat(11))), { skipped: true });
  assert.deepEqual(await files(dir), ['running.lock']);
  await r.put(snap('a', 'v1'));
  await r.put(snap('a', 'v2'));
  assert.equal(JSON.parse(await fsp.readFile(path.join(dir, 'a.json'), 'utf8')).text, 'v2');
  await r.put(snap('b'));
  await r.put(snap('c'));
  const left = (await files(dir)).filter((n) => n.endsWith('.json'));
  assert.equal(left.length, 2);
  assert.ok(left.includes('c.json'), 'the newest snapshot is never evicted');
});

test('byte cap evicts older snapshots but keeps the one just written', async (t) => {
  const dir = await tmpDir(t), r = createRecovery({ dir, limits: { files: 100, bytes: 10, doc: 100 } });
  await r.init();
  await r.put(snap('a', 'aaaaaa'));
  await r.put(snap('b', 'bbbbbb'));
  assert.deepEqual((await files(dir)).filter((n) => n.endsWith('.json')), ['b.json']);
});

test('drop/read ignore invalid keys and never touch files outside the folder', async (t) => {
  const root = await tmpDir(t), dir = path.join(root, 'rec');
  await fsp.mkdir(dir);
  await fsp.writeFile(path.join(root, 'outside.json'), '{}');
  const r = createRecovery({ dir });
  await r.init();
  await r.put(snap('keep'));
  await r.drop(['../outside', 'a/b', '', 'missing']);
  assert.equal(await r.read('../outside'), null);
  assert.ok((await files(root)).includes('outside.json'));
  assert.ok((await files(dir)).includes('keep.json'));
  await r.drop(['keep']);
  assert.ok(!(await files(dir)).includes('keep.json'));
  await r.put(snap('x'));
  await r.put(snap('y'));
  await r.dropAll();
  assert.deepEqual(await files(dir), ['running.lock']);
});

test('KEY accepts safe identifiers only', () => {
  for (const ok of ['a', 'A_b-9', 'x'.repeat(80)]) assert.ok(KEY.test(ok), ok);
  for (const bad of ['', 'x'.repeat(81), '../a', 'a/b', 'a b', 'a.json', 'a\0']) assert.ok(!KEY.test(bad), bad);
});
