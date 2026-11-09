import test from 'node:test';
import assert from 'node:assert/strict';
import { CH, HISTORY_LABELS, INVOKE_CHANNELS } from '../shared/channels.js';
import { APP_ORIGIN } from '../shared/constants.js';
import { isTrustedSender, validatePayload } from '../main/ipc/validate.js';

const check = (ch, payload) => validatePayload(INVOKE_CHANNELS[ch], payload);
const ok = (ch, payload, msg) => assert.equal(check(ch, payload).ok, true, msg ?? `${ch} should accept ${JSON.stringify(payload)?.slice(0, 80)}`);
const bad = (ch, payload, msg) => assert.equal(check(ch, payload).ok, false, msg ?? `${ch} should reject ${JSON.stringify(payload)?.slice(0, 80)}`);
const ABS = process.platform === 'win32' ? 'C:\\w\\a.md' : '/w/a.md';
const HASH = 'a'.repeat(64);

test('every invoke channel is a declared CH value with an input validator', () => {
  const declared = new Set(Object.values(CH));
  for (const [name, def] of Object.entries(INVOKE_CHANNELS)) {
    assert.ok(declared.has(name), `${name} not in CH`);
    assert.equal(typeof def.input, 'function', name);
  }
});

test('no validator throws on hostile payloads; failures always carry a message', () => {
  const cyc = {};
  cyc.self = cyc;
  const hostile = [undefined, null, 0, -1, NaN, 'str', true, [], [[]], {}, { path: {} }, { path: null }, cyc, Object.create(null), () => {}, { toString: 1 }, { path: '\0' }];
  for (const name of Object.keys(INVOKE_CHANNELS)) {
    for (const p of hostile) {
      const r = validatePayload(INVOKE_CHANNELS[name], p);
      assert.equal(typeof r.ok, 'boolean', name);
      if (!r.ok) assert.ok(r.message.length > 0, name);
    }
  }
});

test('validatePayload: null passes, a message fails, a throwing validator fails safely', () => {
  assert.deepEqual(validatePayload({ input: () => null }, 1), { ok: true });
  assert.deepEqual(validatePayload({ input: () => undefined }, 1), { ok: true });
  assert.deepEqual(validatePayload({ input: () => 'nope' }, 1), { ok: false, message: 'nope' });
  assert.deepEqual(validatePayload({ input: () => { throw new Error('x'); } }, 1), { ok: false, message: 'payload could not be validated' });
});

test('only frames served from the app origin are trusted', () => {
  const t = (url) => isTrustedSender({ senderFrame: { url } });
  assert.equal(t(`${APP_ORIGIN}index.html`), true);
  for (const u of ['https://evil.example/', 'file:///etc/passwd', `https://evil.example/?${APP_ORIGIN}`, 'loto://other/', '', undefined, null]) assert.equal(t(u), false, String(u));
  assert.equal(isTrustedSender({}), false);
  assert.equal(isTrustedSender(null), false);
  assert.equal(isTrustedSender(undefined), false);
});

test('doc:save requires an absolute path, string text and a sha256 expectedHash', () => {
  ok(CH.DOC_SAVE, { path: ABS, text: '' });
  ok(CH.DOC_SAVE, { path: ABS, text: 'x', encoding: 'utf-16be', bom: true, eol: 'mixed', dominantEol: 'crlf', expectedHash: HASH });
  ok(CH.DOC_SAVE, { path: ABS, text: 'x', expectedHash: null });
  for (const p of [
    { text: 'x' }, { path: ABS }, { path: 'rel.md', text: 'x' }, { path: '', text: 'x' }, { path: `${ABS}\0`, text: 'x' },
    { path: ABS, text: 5 }, { path: ABS, text: 'x', encoding: 'latin1' }, { path: ABS, text: 'x', bom: 'yes' },
    { path: ABS, text: 'x', eol: 'unix' }, { path: ABS, text: 'x', dominantEol: 'mixed' },
    { path: ABS, text: 'x', expectedHash: 'abc' }, { path: ABS, text: 'x', expectedHash: 'A'.repeat(64) },
    { path: `/${'a'.repeat(4096)}`, text: 'x' }, [ABS, 'x'], null,
  ]) bad(CH.DOC_SAVE, p);
});

test('doc:save accepts text exactly at the 64 MB limit and rejects one char more', () => {
  ok(CH.DOC_SAVE, { path: ABS, text: 'a'.repeat(64_000_000) });
  bad(CH.DOC_SAVE, { path: ABS, text: 'a'.repeat(64_000_001) });
});

test('doc:saveAs / saveCopy: text required, defaultPath optional but absolute', () => {
  for (const ch of [CH.DOC_SAVE_AS, CH.DOC_SAVE_COPY]) {
    ok(ch, { text: 'x' });
    ok(ch, { text: 'x', defaultPath: ABS });
    bad(ch, {});
    bad(ch, { text: 'x', defaultPath: 'rel' });
  }
});

test('doc:open and doc:rename validate path and name boundaries', () => {
  ok(CH.DOC_OPEN, { path: ABS });
  ok(CH.DOC_OPEN, { path: ABS, recent: false });
  bad(CH.DOC_OPEN, { path: ABS, recent: 'no' });
  bad(CH.DOC_OPEN, { path: 'rel.md' });
  ok(CH.DOC_RENAME, { path: ABS, name: 'x'.repeat(255) });
  bad(CH.DOC_RENAME, { path: ABS, name: 'x'.repeat(256) });
  bad(CH.DOC_RENAME, { path: ABS, name: '' });
  bad(CH.DOC_RENAME, { path: ABS });
});

test('history channels need exactly one document reference and well-formed ids/labels', () => {
  const sel = { path: ABS, id: 'k3j9z' };
  ok(CH.HISTORY_LIST, { path: ABS });
  ok(CH.HISTORY_LIST, { docId: 'untitled-1' });
  bad(CH.HISTORY_LIST, {});
  bad(CH.HISTORY_LIST, { path: ABS, docId: 'u1' }, 'path and docId together are ambiguous');
  bad(CH.HISTORY_LIST, { docId: '../x' });
  bad(CH.HISTORY_LIST, { docId: '' });
  bad(CH.HISTORY_LIST, { path: 'rel' });
  ok(CH.HISTORY_READ, sel);
  for (const id of ['', 'UPPER', 'a'.repeat(13), '../x', 5, undefined]) bad(CH.HISTORY_READ, { path: ABS, id });
  ok(CH.HISTORY_RESTORE, { ...sel, current: 'text' });
  bad(CH.HISTORY_RESTORE, { ...sel, current: 5 });
  bad(CH.HISTORY_RESTORE, { ...sel, current: 'a'.repeat(8_000_001) });
  ok(CH.HISTORY_PIN, { ...sel, pinned: false });
  bad(CH.HISTORY_PIN, { ...sel, pinned: 'yes' });
  ok(CH.HISTORY_DELETE, { path: ABS });
  ok(CH.HISTORY_DELETE, sel);
  bad(CH.HISTORY_DELETE, { path: ABS, id: 'BAD ID' });
  ok(CH.HISTORY_STATS, undefined);
  ok(CH.HISTORY_STATS, { docId: 'd' });
  bad(CH.HISTORY_STATS, { foo: 1 });
  for (const label of HISTORY_LABELS) ok(CH.HISTORY_SNAPSHOT, { path: ABS, text: 't', label });
  bad(CH.HISTORY_SNAPSHOT, { path: ABS, text: 't', label: 'Hacked' });
  bad(CH.HISTORY_SNAPSHOT, { path: ABS, text: 't' });
  bad(CH.HISTORY_SNAPSHOT, { path: ABS, text: 'a'.repeat(8_000_001), label: 'Saved' });
});

test('recovery channels restrict keys, sizes and caret values', () => {
  const put = { key: 'doc_1-a', name: 'a.md', path: null, text: 'x', caret: 0, mode: 'edit' };
  ok(CH.RECOVERY_PUT, put);
  ok(CH.RECOVERY_PUT, { ...put, path: ABS, caret: 99 });
  for (const o of [{ key: '../x' }, { key: '' }, { key: 'a b' }, { key: 'k'.repeat(81) }, { caret: -1 }, { caret: 1.5 }, { caret: '1' }, { path: 'rel.md' }, { path: undefined }, { text: 'a'.repeat(8_000_001) }, { name: 'n'.repeat(261) }, { mode: 'm'.repeat(21) }]) {
    bad(CH.RECOVERY_PUT, { ...put, ...o }, JSON.stringify(o).slice(0, 40));
  }
  ok(CH.RECOVERY_READ, { key: 'abc' });
  bad(CH.RECOVERY_READ, { key: '../abc' });
  ok(CH.RECOVERY_DROP, { all: true });
  ok(CH.RECOVERY_DROP, { keys: ['a', 'b'] });
  bad(CH.RECOVERY_DROP, { all: 'true' });
  bad(CH.RECOVERY_DROP, { keys: ['a', '../b'] });
  bad(CH.RECOVERY_DROP, { keys: Array.from({ length: 201 }, (_, i) => `k${i}`) });
  bad(CH.RECOVERY_DROP, {});
});

test('export:write accepts only safe entry names and consistent kind/ext/entries', () => {
  const e = (name, extra = { text: 'x' }) => ({ name, ...extra });
  const base = { kind: 'zip', defaultName: 'pkg', entries: [e('a.md')] };
  ok(CH.EXPORT_WRITE, base);
  ok(CH.EXPORT_WRITE, { ...base, entries: [e('img/a.png', { data: Buffer.from('x').toString('base64') }), e('sub\\b.md')] });
  ok(CH.EXPORT_WRITE, { kind: 'file', ext: 'svg', defaultName: 'x', entries: [e('x.svg')] });
  for (const name of ['../a', 'a/../b', '/etc/passwd', '\\a', 'C:a', 'a//b', 'a/./b', '', 'a\0b', 'x'.repeat(201)]) bad(CH.EXPORT_WRITE, { ...base, entries: [e(name)] }, name);
  bad(CH.EXPORT_WRITE, { ...base, entries: [{ name: 'a', text: 'x', data: 'eA==' }] }, 'text and data together');
  bad(CH.EXPORT_WRITE, { ...base, entries: [{ name: 'a' }] });
  bad(CH.EXPORT_WRITE, { ...base, entries: [{ name: 'a', data: 'not base64!' }] });
  bad(CH.EXPORT_WRITE, { ...base, entries: [] });
  bad(CH.EXPORT_WRITE, { ...base, entries: Array.from({ length: 501 }, (_, i) => e(`f${i}`)) });
  bad(CH.EXPORT_WRITE, { ...base, kind: 'exe' });
  bad(CH.EXPORT_WRITE, { kind: 'file', ext: 'exe', defaultName: 'x', entries: [e('x')] });
  bad(CH.EXPORT_WRITE, { kind: 'file', defaultName: 'x', entries: [e('x')] }, 'file kind needs ext');
  bad(CH.EXPORT_WRITE, { kind: 'file', ext: 'md', defaultName: 'x', entries: [e('a'), e('b')] }, 'file kind takes one entry');
  bad(CH.EXPORT_WRITE, { ...base, dir: 'rel' });
});

test('export:tree and export:exists require an absolute dir, an overwrite list and safe names', () => {
  const t = { dir: ABS, entries: [{ name: 'a.md', text: 'x' }], overwrite: [] };
  ok(CH.EXPORT_TREE, t);
  bad(CH.EXPORT_TREE, { ...t, overwrite: undefined });
  bad(CH.EXPORT_TREE, { ...t, dir: 'rel' });
  bad(CH.EXPORT_TREE, { ...t, entries: [] });
  bad(CH.EXPORT_TREE, { ...t, entries: [{ name: '../x', text: '' }] });
  bad(CH.EXPORT_TREE, { ...t, overwrite: [5] });
  ok(CH.EXPORT_EXISTS, { dir: ABS, names: ['a.md', 'b/c.md'] });
  bad(CH.EXPORT_EXISTS, { dir: ABS, names: ['..'] });
  bad(CH.EXPORT_EXISTS, { dir: ABS });
});
