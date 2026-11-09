import test from 'node:test';
import assert from 'node:assert/strict';

// Test the pure, non-DOM parts of preflight by importing only the helpers we can stub.
// DOMParser-based tableFindings and fontFindings are exercised in integration; tested here via the main entry with mocked html=''.

// Stub DOMParser (used by tableFindings when html is provided).
if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = class { parseFromString() { return { querySelectorAll: () => [] }; } };
}

const { runPreflight, preflightSummary } = await import('../renderer/src/core/publish/preflight.js');

test('runPreflight: empty input returns no findings', () => {
  const result = runPreflight({});
  assert.equal(result.findings.length, 0);
  assert.equal(result.blockingCount, 0);
  assert.equal(preflightSummary(result), '✓ Preflight passed');
});

test('runPreflight: asset error from buildWarnings', () => {
  const result = runPreflight({ buildWarnings: [{ kind: 'asset', message: 'Image not found: foo.png', line: 5, docId: 'd1', path: 'doc.md' }] });
  const f = result.findings.find((x) => x.kind === 'asset');
  assert.ok(f, 'asset finding present');
  assert.equal(f.severity, 'error');
  assert.equal(f.line, 5);
  assert.equal(result.blockingCount, 1);
  assert.ok(preflightSummary(result).includes('1 error'));
});

test('runPreflight: remote image is warning, not error', () => {
  const result = runPreflight({ buildWarnings: [{ kind: 'remote', message: 'Remote image: http://x.com/a.png', line: 2, docId: 'd1', path: 'doc.md' }] });
  const f = result.findings.find((x) => x.kind === 'asset');
  assert.ok(f);
  assert.equal(f.severity, 'warning');
  assert.equal(result.blockingCount, 0);
});

test('runPreflight: mermaid failure is blocking error', () => {
  const result = runPreflight({ buildWarnings: [{ kind: 'mermaid', message: 'Parse error', line: 10, docId: 'd1' }] });
  assert.equal(result.blockingCount, 1);
  assert.equal(result.errors[0].kind, 'mermaid');
});

test('runPreflight: empty section raises warning', () => {
  const result = runPreflight({ docs: [{ id: 'x', name: 'Empty Doc', text: '---\ntitle: t\n---\n' }] });
  const f = result.findings.find((x) => x.kind === 'empty');
  assert.ok(f, 'empty section warning present');
  assert.equal(f.severity, 'warning');
  assert.equal(result.blockingCount, 0);
});

test('runPreflight: missing metadata returns info findings', () => {
  const result = runPreflight({ config: { metadata: { title: '', author: '' } } });
  const kinds = result.findings.filter((f) => f.kind === 'metadata').map((f) => f.severity);
  assert.ok(kinds.length >= 2, '2 metadata info findings');
  assert.ok(kinds.every((s) => s === 'info'));
});

test('runPreflight: findings sorted error > warning > info', () => {
  const result = runPreflight({
    buildWarnings: [
      { kind: 'mermaid', message: 'err', line: 1, docId: 'd1' },
      { kind: 'remote', message: 'warn', line: 2, docId: 'd1' },
    ],
    config: { metadata: { title: '', author: '' } },
  });
  const sevs = result.findings.map((f) => f.severity);
  const order = { error: 0, warning: 1, info: 2 };
  for (let i = 1; i < sevs.length; i++) assert.ok(order[sevs[i]] >= order[sevs[i - 1]], `out of order at ${i}`);
});

test('preflightSummary: multi error and warning', () => {
  const summary = preflightSummary({ findings: [
    { severity: 'error' }, { severity: 'error' }, { severity: 'warning' },
  ] });
  assert.ok(summary.includes('2 errors'));
  assert.ok(summary.includes('1 warning'));
});
