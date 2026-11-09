import test from 'node:test';
import assert from 'node:assert/strict';
import { actions, describe, initConflict, reduce, saveGate } from '../renderer/src/core/documents/conflict.js';

const S = (o = {}) => ({ ...initConflict('/w/a.md', 'h0'), ...o });
const fx = (r) => r.effects.map((e) => e.do);

test('initial state is ok with no actions', () => {
  assert.deepEqual(initConflict('/p', 'h'), { phase: 'ok', path: '/p', diskHash: 'h', prev: 'ok', attempt: 0 });
  assert.deepEqual(actions(S()), []);
  assert.equal(describe(S()).label, '');
});

test('disk change matching our last save is our own write: back to ok, no banner', () => {
  const r = reduce(S({ phase: 'external' }), { type: 'modified', hash: 'h1' }, { savedHash: 'h1', dirty: true });
  assert.equal(r.state.phase, 'ok');
  assert.equal(r.state.diskHash, 'h1');
  assert.deepEqual(fx(r), ['clear']);
});

test('external change: dirty editor => conflict; clean + autoReload => reload; clean => banner', () => {
  const ev = { type: 'modified', hash: 'h2' };
  const dirty = reduce(S(), ev, { savedHash: 'h0', dirty: true });
  assert.equal(dirty.state.phase, 'conflict');
  assert.deepEqual(fx(dirty), ['conflict']);
  const auto = reduce(S(), ev, { savedHash: 'h0', dirty: false, autoReload: true });
  assert.equal(auto.state.phase, 'ok');
  assert.deepEqual(fx(auto), ['reload', 'clear']);
  const clean = reduce(S(), ev, { savedHash: 'h0', dirty: false });
  assert.equal(clean.state.phase, 'external');
  assert.deepEqual(clean.effects, [{ do: 'banner', kind: 'modified' }]);
  assert.deepEqual(actions(clean.state), ['reload', 'compare', 'dismiss']);
});

test('editing while an external change is pending escalates to conflict; otherwise nothing changes', () => {
  const ext = S({ phase: 'external' });
  assert.equal(reduce(ext, { type: 'edited', dirty: true }).state.phase, 'conflict');
  assert.equal(reduce(ext, { type: 'edited', dirty: false }).state.phase, 'external');
  assert.equal(reduce(S(), { type: 'edited', dirty: true }).state.phase, 'ok');
  assert.deepEqual(actions(S({ phase: 'conflict' })), ['reload', 'compare', 'merge', 'keepMine', 'saveAs', 'overwrite']);
});

test('deletion forces Save As and recreation with our content recovers', () => {
  const d = reduce(S(), { type: 'deleted' });
  assert.equal(d.state.phase, 'deleted');
  assert.deepEqual(fx(d), ['markDeleted']);
  assert.equal(saveGate(d.state, { savedHash: 'h0' }), 'saveAs');
  assert.deepEqual(actions(d.state), ['saveAs', 'restoreFromHistory']);
  const back = reduce(d.state, { type: 'modified', hash: 'h0' }, { savedHash: 'h0', dirty: true });
  assert.equal(back.state.phase, 'ok');
});

test('unreadable keeps the phase to return to, counts attempts, and restores correctly', () => {
  let r = reduce(S({ phase: 'conflict', prev: 'conflict' }), { type: 'unreadable' });
  assert.deepEqual([r.state.phase, r.state.prev, r.state.attempt], ['unreadable', 'conflict', 1]);
  assert.deepEqual(r.effects, [{ do: 'retry', attempt: 1 }]);
  r = reduce(r.state, { type: 'unreadable' });
  assert.deepEqual([r.state.prev, r.state.attempt], ['conflict', 2], 'prev must not become "unreadable"');
  assert.deepEqual(actions(r.state), ['retry']);
  assert.equal(describe(r.state).retrying, true);
  const back = reduce(r.state, { type: 'restored' });
  assert.deepEqual([back.state.phase, back.state.attempt], ['conflict', 0]);
  assert.deepEqual(fx(back), ['retryDone']);
  const okBack = reduce(reduce(S(), { type: 'unreadable' }).state, { type: 'restored' });
  assert.equal(okBack.state.phase, 'ok');
  assert.deepEqual(fx(okBack), ['clear']);
});

test('renamed follows the new path; synced resets to ok and adopts the new disk hash', () => {
  const r = reduce(S(), { type: 'renamed', to: '/w/b.md' });
  assert.equal(r.state.path, '/w/b.md');
  assert.deepEqual(r.effects, [{ do: 'follow', from: '/w/a.md', path: '/w/b.md' }]);
  const s = reduce(S({ phase: 'conflict', diskHash: 'old' }), { type: 'synced', hash: 'new' });
  assert.deepEqual([s.state.phase, s.state.diskHash, fx(s)], ['ok', 'new', ['clear']]);
  assert.equal(reduce(S({ phase: 'external', diskHash: 'keep' }), { type: 'synced' }).state.diskHash, 'keep');
});

test('reduce is pure and ignores unknown events', () => {
  const s = Object.freeze(S());
  const r = reduce(s, { type: 'bogus' });
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.effects, []);
  assert.doesNotThrow(() => reduce(s, { type: 'modified', hash: 'x' }, { savedHash: 'y', dirty: true }));
});

test('saveGate writes only when the disk still matches what we last saved or read', () => {
  assert.equal(saveGate(S({ diskHash: 'h0' }), { savedHash: 'h0' }), 'write');
  assert.equal(saveGate(S({ diskHash: 'h9' }), { savedHash: 'h0' }), 'conflict');
  assert.equal(saveGate(S({ diskHash: null }), { savedHash: 'h0' }), 'write');
  assert.equal(saveGate(S({ diskHash: 'h9' }), { savedHash: null }), 'write');
});
