import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import * as ops from '../main/services/fs/ops.js';
import { within } from '../main/services/fs/tree.js';
import { DocError } from '../main/services/fs/safe-path.js';
import { tmpDir } from './helpers/stubbed.js';

const code = (c) => (e) => e instanceof DocError && e.code === c;
const ls = async (d) => (await fsp.readdir(d, { recursive: true })).sort();
async function ws(t) {
  const root = await fsp.realpath(await tmpDir(t));
  await fsp.mkdir(path.join(root, 'dir'));
  await fsp.writeFile(path.join(root, 'a.md'), 'A');
  return root;
}

test('within is true only for paths inside the root', () => {
  assert.ok(within('/r', '/r/a/b'));
  assert.ok(within('/r', '/r'));
  assert.ok(!within('/r', '/r2/a'));
  assert.ok(!within('/r/x', '/r/a'));
  assert.ok(!within('/r', '/other'));
});

test('validateName rejects folders, reserved characters/words and untrimmed names', () => {
  for (const bad of ['', ' a', 'a ', '.', '..', 'a/b', 'a\\b', 'a\0b', null, 5]) assert.throws(() => ops.validateName(bad, 'linux'), code('E_NAME'), String(bad));
  for (const bad of ['a<b', 'a?b', 'CON', 'nul.txt', 'a.', 'a ', 'x'.repeat(256)]) assert.throws(() => ops.validateName(bad, 'win32'), code('E_NAME'), bad);
  assert.throws(() => ops.validateName('a:b', 'darwin'), code('E_NAME'));
  assert.equal(ops.validateName('notes (1).md', 'linux'), 'notes (1).md');
  assert.equal(ops.validateName('a:b', 'linux'), 'a:b');
});

test('createFile/createFolder never overwrite: collisions get a numeric suffix', async (t) => {
  const root = await ws(t);
  assert.equal(await ops.createFile(root, root, 'a.md'), path.join(root, 'a (2).md'));
  assert.equal(await ops.createFile(root, root, 'a.md'), path.join(root, 'a (3).md'));
  assert.equal(await ops.createFolder(root, root, 'dir'), path.join(root, 'dir (2)'));
  assert.equal(await fsp.readFile(path.join(root, 'a.md'), 'utf8'), 'A');
});

test('operations outside the workspace are refused (path, ../ and symlink escapes)', async (t) => {
  const root = await ws(t), outside = await fsp.realpath(await tmpDir(t));
  await fsp.writeFile(path.join(outside, 'secret.md'), 'S');
  await fsp.symlink(outside, path.join(root, 'link'));
  await assert.rejects(ops.createFile(root, outside, 'x.md'), code('E_PATH'));
  await assert.rejects(ops.createFile(root, path.join(root, '..'), 'x.md'), code('E_PATH'));
  await assert.rejects(ops.createFile(root, path.join(root, 'link'), 'x.md'), code('E_PATH'));
  await assert.rejects(ops.rename(root, path.join(outside, 'secret.md'), 'n.md'), code('E_PATH'));
  await assert.rejects(ops.rename(root, path.join(root, 'link', 'secret.md'), 'n.md'), code('E_PATH'));
  await assert.rejects(ops.rename(root, 'relative.md', 'n.md'), code('E_PATH'));
  assert.deepEqual(await ls(outside), ['secret.md']);
});

test('the workspace root itself cannot be renamed, moved or duplicated', async (t) => {
  const root = await ws(t);
  await assert.rejects(ops.rename(root, root, 'x'), code('E_PATH'));
  await assert.rejects(ops.duplicate(root, root), code('E_PATH'));
  const [r] = await ops.move(root, [root], path.join(root, 'dir'));
  assert.equal(r.error.code, 'E_PATH');
});

test('rename keeps content, refuses collisions, and allows a no-op', async (t) => {
  const root = await ws(t), a = path.join(root, 'a.md');
  await fsp.writeFile(path.join(root, 'b.md'), 'B');
  await assert.rejects(ops.rename(root, a, 'b.md'), code('E_EXISTS'));
  assert.equal(await ops.rename(root, a, 'a.md'), a);
  const to = await ops.rename(root, a, 'c.md');
  assert.equal(await fsp.readFile(to, 'utf8'), 'A');
  assert.equal(await fsp.readFile(path.join(root, 'b.md'), 'utf8'), 'B');
});

test('move/copy report per-item results, suffix on collision and keep the source for copy', async (t) => {
  const root = await ws(t), dir = path.join(root, 'dir');
  await fsp.writeFile(path.join(dir, 'a.md'), 'EXISTING');
  const [c] = await ops.copy(root, [path.join(root, 'a.md')], dir);
  assert.equal(c.path, path.join(dir, 'a (2).md'));
  assert.equal(await fsp.readFile(path.join(root, 'a.md'), 'utf8'), 'A');
  assert.equal(await fsp.readFile(path.join(dir, 'a.md'), 'utf8'), 'EXISTING');
  const res = await ops.move(root, [path.join(root, 'a.md'), path.join(root, 'missing.md')], dir);
  assert.equal(res[0].path, path.join(dir, 'a (3).md'));
  assert.equal(res[1].error.code, 'E_NOENT');
  await assert.rejects(fsp.access(path.join(root, 'a.md')));
});

test('a folder cannot be moved or copied into itself or its descendants', async (t) => {
  const root = await ws(t), dir = path.join(root, 'dir'), deep = path.join(dir, 'deep');
  await fsp.mkdir(deep);
  for (const fn of [ops.move, ops.copy]) {
    for (const dest of [dir, deep]) {
      const [r] = await fn(root, [dir], dest);
      assert.equal(r.error?.code, 'E_PATH', `${fn.name} into ${path.basename(dest)}`);
    }
  }
  assert.deepEqual(await ls(deep), []);
});

test('move to the same folder is a no-op; moving outside needs an explicitly allowed folder', async (t) => {
  const root = await ws(t), outside = await fsp.realpath(await tmpDir(t));
  const [same] = await ops.move(root, [path.join(root, 'a.md')], root);
  assert.equal(same.path, path.join(root, 'a.md'));
  const [denied] = await ops.move(root, [path.join(root, 'a.md')], outside);
  assert.equal(denied.error.code, 'E_PATH');
  const [ok] = await ops.move(root, [path.join(root, 'a.md')], outside, outside);
  assert.equal(await fsp.readFile(ok.path, 'utf8'), 'A');
});

test('duplicate creates "<name> copy" and numbered copies; folders are copied recursively', async (t) => {
  const root = await ws(t);
  await fsp.writeFile(path.join(root, 'dir', 'n.md'), 'N');
  assert.equal(await ops.duplicate(root, path.join(root, 'a.md')), path.join(root, 'a copy.md'));
  assert.equal(await ops.duplicate(root, path.join(root, 'a.md')), path.join(root, 'a copy (2).md'));
  const d = await ops.duplicate(root, path.join(root, 'dir'));
  assert.equal(await fsp.readFile(path.join(d, 'n.md'), 'utf8'), 'N');
});

test('remove validates every path first, honours confirmation and reports trash failures per item', async (t) => {
  const root = await ws(t), a = path.join(root, 'a.md'), trashed = [];
  const trash = async (p) => { if (p.endsWith('dir')) throw new Error('locked'); trashed.push(p); };
  await assert.rejects(ops.remove(root, [a, '/etc/passwd'], { trash }), code('E_PATH'));
  assert.deepEqual(trashed, []);
  assert.deepEqual(await ops.remove(root, [a], { trash, confirm: async () => false }), { canceled: true, results: [] });
  assert.deepEqual(trashed, []);
  const orig = console.error;
  console.error = () => {};
  t.after(() => { console.error = orig; });
  const r = await ops.remove(root, [a, path.join(root, 'dir')], { trash, confirm: async (names) => names.length === 2 });
  assert.equal(r.canceled, false);
  assert.deepEqual(trashed, [a]);
  assert.deepEqual(r.results[1].error, { code: 'E_IO', message: 'The operation failed.' });
});
