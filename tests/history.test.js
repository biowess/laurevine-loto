import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createHistory } from '../main/services/history/service.js';
import { DocError } from '../main/services/fs/safe-path.js';
import { fileId, historyKey, normPath, prune, relinkKey, wantSnapshot } from '../main/core/history/retention.js';
import { tmpDir } from './helpers/stubbed.js';

const DAY = 864e5;
const LIM = { maxVersions: 50, maxAge: 30 * DAY, keepLatest: 2, maxBytes: 1e9, autosaveInterval: 60_000, autosaveDelta: 100 };
const P = '/work/notes/a.md';

async function mk(t, over = {}, dir) {
  dir ??= await tmpDir(t);
  const clock = { t: 1_000_000 };
  const h = createHistory({ dir, limits: () => ({ ...LIM, ...over }), now: () => clock.t });
  await h.init();
  return { h, dir, clock };
}
const texts = async (h, ref) => Promise.all((await h.list(ref)).versions.map(async (v) => (await h.read({ ...ref, id: v.id })).text));
const blobs = async (dir) => (await fsp.readdir(path.join(dir, fileId(historyKey({ path: P }))))).filter((n) => n.endsWith('.md'));

test('historyKey/normPath/relinkKey: keys, platform casing, folder moves without prefix collisions', () => {
  assert.equal(historyKey({ path: 'C:\\Docs\\A.md' }, 'win32'), 'p:c:/docs/a.md');
  assert.equal(historyKey({ path: '/a//b/' }, 'linux'), 'p:/a/b');
  assert.equal(historyKey({ docId: 'u1' }), 'd:u1');
  assert.equal(normPath('/A/B', 'linux'), '/A/B');
  assert.equal(relinkKey('p:/a/b.md', '/a/b.md', '/a/c.md', 'linux'), 'p:/a/c.md');
  assert.equal(relinkKey('p:/a/dir/x.md', '/a/dir', '/z/dir2', 'linux'), 'p:/z/dir2/x.md');
  assert.equal(relinkKey('p:/a/dirty/x.md', '/a/dir', '/z', 'linux'), null);
  assert.equal(relinkKey('d:untitled', '/a', '/b', 'linux'), null);
});

test('wantSnapshot: first always, identical never, autosave throttled by time or size', () => {
  const last = { hash: 'h1', size: 1000, at: 0 };
  assert.equal(wantSnapshot('Autosave', null, { hash: 'x', size: 1, at: 0 }, LIM), true);
  assert.equal(wantSnapshot('Saved', last, { hash: 'h1', size: 1000, at: 1e9 }, LIM), false);
  assert.equal(wantSnapshot('Saved', last, { hash: 'h2', size: 1000, at: 1 }, LIM), true);
  assert.equal(wantSnapshot('Autosave', last, { hash: 'h2', size: 1010, at: 59_999 }, LIM), false);
  assert.equal(wantSnapshot('Autosave', last, { hash: 'h2', size: 1010, at: 60_000 }, LIM), true);
  assert.equal(wantSnapshot('Autosave', last, { hash: 'h2', size: 1100, at: 1 }, LIM), true);
  assert.equal(wantSnapshot('Autosave', last, { hash: 'h2', size: 900, at: 1 }, LIM), true);
});

test('prune: age, count and byte limits never remove pinned or the latest versions', () => {
  const now = 100 * DAY, mkI = (f, at, size = 10, pinned = false) => ({ f, at, size, pinned });
  const old = mkI('a', 1 * DAY), pin = mkI('a', 2 * DAY, 10, true), mid = mkI('a', 90 * DAY), l1 = mkI('a', 98 * DAY), l2 = mkI('a', 99 * DAY);
  const r = prune([l2, old, pin, l1, mid], { now, ...LIM });
  assert.deepEqual(r, [old]);

  const many = Array.from({ length: 6 }, (_, i) => mkI('a', now - (6 - i) * 1000));
  const byCount = prune(many, { now, ...LIM, maxVersions: 3 });
  assert.deepEqual(byCount, many.slice(0, 3));

  const big = Array.from({ length: 4 }, (_, i) => mkI('a', now - (4 - i) * 1000, 100));
  assert.deepEqual(prune(big, { now, ...LIM, maxBytes: 250 }), big.slice(0, 2));
  assert.deepEqual(prune(big, { now, ...LIM, maxBytes: 1, keepLatest: 2 }), big.slice(0, 2));
});

test('snapshot stores versions newest-first and skips identical content', async (t) => {
  const { h, clock } = await mk(t);
  const ref = { path: P };
  assert.deepEqual(await h.snapshot({ ...ref, text: 'one', label: 'Saved' }), { skipped: false, id: clock.t.toString(36) });
  assert.deepEqual(await h.snapshot({ ...ref, text: 'one', label: 'Saved' }), { skipped: true });
  clock.t += 10;
  await h.snapshot({ ...ref, text: 'two', label: 'Saved' });
  const { versions } = await h.list(ref);
  assert.deepEqual(versions.map((v) => [v.size, v.label, v.pinned]), [[3, 'Saved', false], [3, 'Saved', false]]);
  assert.deepEqual(await texts(h, ref), ['two', 'one']);
});

test('snapshot validates the label and skips oversized documents', async (t) => {
  const { h } = await mk(t);
  await assert.rejects(h.snapshot({ path: P, text: 'x', label: 'Bogus' }), (e) => e instanceof DocError && e.code === 'E_ARG');
  assert.deepEqual(await h.snapshot({ path: P, text: 'a'.repeat(8e6 + 1), label: 'Saved' }), { skipped: true });
  assert.deepEqual((await h.list({ path: P })).versions, []);
});

test('autosaves are throttled but explicit saves are always kept', async (t) => {
  const { h, clock } = await mk(t);
  const ref = { path: P };
  await h.snapshot({ ...ref, text: 'a', label: 'Autosave' });
  clock.t += 1000;
  assert.equal((await h.snapshot({ ...ref, text: 'ab', label: 'Autosave' })).skipped, true);
  assert.equal((await h.snapshot({ ...ref, text: 'ab', label: 'Saved' })).skipped, false);
  clock.t += 60_000;
  assert.equal((await h.snapshot({ ...ref, text: 'abc', label: 'Autosave' })).skipped, false);
  assert.equal((await h.list(ref)).versions.length, 3);
});

test('versions created in the same millisecond still get unique, ordered ids', async (t) => {
  const { h } = await mk(t);
  for (const s of ['a', 'b', 'c']) await h.snapshot({ path: P, text: s, label: 'Saved' });
  const ids = (await h.list({ path: P })).versions.map((v) => v.id);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(await texts(h, { path: P }), ['c', 'b', 'a']);
});

test('restore returns the old text and keeps the current text as "Before restore"', async (t) => {
  const { h, clock } = await mk(t);
  const ref = { path: P };
  const { id } = await h.snapshot({ ...ref, text: 'old', label: 'Saved' });
  clock.t += 10;
  const r = await h.restore({ ...ref, id, current: 'unsaved work' });
  assert.equal(r.text, 'old');
  const { versions } = await h.list(ref);
  assert.equal(versions[0].label, 'Before restore');
  assert.equal((await h.read({ ...ref, id: versions[0].id })).text, 'unsaved work');
  await assert.rejects(h.restore({ ...ref, id: 'zzzz', current: 'x' }), (e) => e.code === 'E_NOENT');
  assert.equal((await h.list(ref)).versions.length, 2, 'failed restore must not add a snapshot');
});

test('restore without current text adds no snapshot', async (t) => {
  const { h } = await mk(t);
  const { id } = await h.snapshot({ path: P, text: 'v', label: 'Saved' });
  await h.restore({ path: P, id });
  assert.equal((await h.list({ path: P })).versions.length, 1);
});

test('pin protects versions from retention pruning', async (t) => {
  const { h, dir, clock } = await mk(t, { keepLatest: 1, maxAge: DAY });
  const ref = { path: P };
  const a = await h.snapshot({ ...ref, text: 'a', label: 'Saved' });
  clock.t += 1;
  await h.snapshot({ ...ref, text: 'b', label: 'Saved' });
  assert.equal((await h.pin({ ...ref, id: a.id })).version.pinned, true);
  clock.t += 2 * DAY;
  await h.snapshot({ ...ref, text: 'c', label: 'Saved' });
  assert.deepEqual(await texts(h, ref), ['c', 'a']);
  const reopened = await mk(t, { keepLatest: 1, maxAge: DAY }, dir);
  assert.deepEqual(await texts(reopened.h, ref), ['c', 'a']);
  await h.pin({ ...ref, id: a.id, pinned: false });
  assert.equal((await h.list(ref)).versions.at(-1).pinned, false);
});

test('remove deletes one version or the whole history and cleans up blobs', async (t) => {
  const { h, dir } = await mk(t);
  const ref = { path: P }, id = {};
  for (const s of ['A', 'B', 'A']) id[s + (id.A ? '2' : '')] = (await h.snapshot({ ...ref, text: s, label: 'Saved' })).id;
  assert.equal((await blobs(dir)).length, 2, 'identical content shares one blob');
  assert.deepEqual(await h.remove({ ...ref, id: id.A }), { removed: 1 });
  assert.deepEqual(await texts(h, ref), ['A', 'B'], 'shared blob survives while another version uses it');
  await assert.rejects(h.remove({ ...ref, id: 'nope' }), (e) => e.code === 'E_NOENT');
  assert.deepEqual(await h.remove(ref), { removed: 2 });
  assert.deepEqual((await h.list(ref)).versions, []);
  await assert.rejects(fsp.access(path.join(dir, fileId(historyKey(ref)))));
  assert.deepEqual(await h.remove({ path: '/never/seen.md' }), { removed: 0 });
});

test('history survives restarts; unreadable or foreign entries are ignored', async (t) => {
  const { h, dir } = await mk(t);
  await h.snapshot({ path: P, text: 'kept', label: 'Saved' });
  await h.snapshot({ docId: 'untitled-1', text: 'draft', label: 'Autosave' });
  const bad = path.join(dir, 'a'.repeat(32));
  await fsp.mkdir(bad);
  await fsp.writeFile(path.join(bad, 'index.json'), '{broken');
  await fsp.mkdir(path.join(dir, 'not-a-history'));
  const again = await mk(t, {}, dir);
  assert.deepEqual(await texts(again.h, { path: P }), ['kept']);
  assert.deepEqual(await texts(again.h, { docId: 'untitled-1' }), ['draft']);
  assert.deepEqual((await again.h.files()).files.map((f) => f.path), [P]);
  assert.equal((await again.h.stats()).versions, 2);
});

test('init enforces retention limits on existing history', async (t) => {
  const { h, dir, clock } = await mk(t);
  for (const s of ['1', '2', '3', '4']) { await h.snapshot({ path: P, text: s, label: 'Saved' }); clock.t += 5; }
  const again = await mk(t, { maxVersions: 2, keepLatest: 1 }, dir);
  assert.deepEqual(await texts(again.h, { path: P }), ['4', '3']);
  assert.equal((await blobs(dir)).length, 2);
});

test('relink moves history with a renamed file or folder', async (t) => {
  const { h, dir } = await mk(t);
  await h.snapshot({ path: '/w/a.md', text: 'A', label: 'Saved' });
  await h.snapshot({ path: '/w/dir/b.md', text: 'B', label: 'Saved' });
  await h.relink('/w/a.md', '/w/renamed.md');
  assert.deepEqual(await texts(h, { path: '/w/renamed.md' }), ['A']);
  assert.deepEqual((await h.list({ path: '/w/a.md' })).versions, []);
  await h.relink('/w/dir', '/w/moved');
  assert.deepEqual(await texts(h, { path: '/w/moved/b.md' }), ['B']);
  const again = await mk(t, {}, dir);
  assert.deepEqual((await again.h.files()).files.map((f) => f.path).sort(), ['/w/moved/b.md', '/w/renamed.md']);
});

test('relink merges into an existing destination history without losing versions', async (t) => {
  const { h, clock } = await mk(t);
  await h.snapshot({ path: '/w/dest.md', text: 'D1', label: 'Saved' });
  await h.snapshot({ path: '/w/src.md', text: 'S1', label: 'Saved' });
  clock.t += 10;
  await h.snapshot({ path: '/w/src.md', text: 'S2', label: 'Saved' });
  await h.relink('/w/src.md', '/w/dest.md');
  assert.deepEqual(await texts(h, { path: '/w/dest.md' }), ['S2', 'S1', 'D1']);
  const ids = (await h.list({ path: '/w/dest.md' })).versions.map((v) => v.id);
  assert.equal(new Set(ids).size, 3);
});

test('stats and clear', async (t) => {
  const { h } = await mk(t);
  const a = await h.snapshot({ path: P, text: 'abc', label: 'Saved' });
  await h.snapshot({ docId: 'u', text: 'zz', label: 'Saved' });
  await h.pin({ path: P, id: a.id });
  assert.deepEqual(await h.stats(), { files: 2, versions: 2, pinned: 1, bytes: 5, oldest: Number.parseInt(a.id, 36) });
  assert.equal((await h.stats({ docId: 'u' })).versions, 1);
  assert.deepEqual(await h.clear(), { cleared: 2 });
  assert.equal((await h.stats()).versions, 0);
});
