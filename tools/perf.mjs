// Pure performance benchmarks: parse, render, diagnostics, index, search against thresholds.
import { performance } from 'node:perf_hooks';
import { parseFrontmatter } from '../renderer/src/core/markdown/frontmatter.js';
import { extractHeadings } from '../renderer/src/core/toc/headings.js';
import { render } from '../renderer/src/core/markdown/renderer.js';
import { plan, finish } from '../renderer/src/core/problems/model.js';
import { scanText } from '../main/services/indexer/scanner.js';
import { scopedMatches } from '../renderer/src/core/search/scoped.js';

export const THRESHOLDS = Object.freeze({
  parse: 50,       // ms for frontmatter + heading scan
  render: 300,     // ms for full markdown pipeline
  diagnostics: 250,// ms for problem rule evaluation
  index: 100,      // ms for line scanner (headings, links, tags)
  search: 50,      // ms for scoped search pass
});

function createBenchmarkSample() {
  const front = '---\ntitle: Performance Benchmark Document\nauthor: Biowess\ntags: [benchmark, perf, markdown]\n---\n\n';
  const sections = [];
  for (let i = 1; i <= 200; i++) {
    sections.push(
      `## Section ${i}\n\n` +
      `This is paragraph text for section ${i} with an [internal link](./note-${i}.md) and some **bold** and *italic* formatting.\n\n` +
      `- Item 1 in section ${i}\n- Item 2 with a [link](https://example.com)\n- Item 3 with inline \`code\`\n\n` +
      `| Key | Value |\n| :-- | ----: |\n| Alpha | ${i * 10} |\n| Beta | ${i * 20} |\n\n` +
      '```js\nfunction test' + i + '() { return ' + i + '; }\n```\n\n'
    );
  }
  return front + sections.join('');
}

export async function runPerf() {
  const text = createBenchmarkSample();
  const results = {};

  // 1. Parse
  const t0 = performance.now();
  parseFrontmatter(text);
  extractHeadings(text);
  results.parse = performance.now() - t0;

  // 2. Render
  const t1 = performance.now();
  render(text);
  results.render = performance.now() - t1;

  // 3. Diagnostics
  const t2 = performance.now();
  const rules = plan(text, { disabled: new Set() });
  const parts = rules.map((fn) => fn());
  finish(text, parts, {});
  results.diagnostics = performance.now() - t2;

  // 4. Index
  const t3 = performance.now();
  scanText(text);
  results.index = performance.now() - t3;

  // 5. Search
  const t4 = performance.now();
  scopedMatches(text, { query: 'paragraph', caseSensitive: false, wholeWord: true, regex: false }, new Set(['content']), 500);
  results.search = performance.now() - t4;

  console.log('\n=== Pure Logic Performance Benchmark Results ===');
  console.log('Metric       | Measured   | Threshold | Status');
  console.log('-------------+------------+-----------+-------');
  let allPass = true;
  for (const [key, limit] of Object.entries(THRESHOLDS)) {
    const val = results[key];
    const pass = val <= limit;
    if (!pass) allPass = false;
    const mStr = `${val.toFixed(1)}ms`.padEnd(10);
    const tStr = `< ${limit}ms`.padEnd(9);
    console.log(`${key.padEnd(12)} | ${mStr} | ${tStr} | ${pass ? 'PASS' : 'FAIL'}`);
  }
  console.log('---------------------------------------------');
  console.log(`Overall: ${allPass ? 'ALL PASSED' : 'THRESHOLDS EXCEEDED'}\n`);

  console.log('=== Manual UI Performance Verification Steps ===');
  console.log('1. Generate fixtures: node tools/gen-fixtures.mjs');
  console.log('2. Open fixtures/perf/doc-5mb.md in Source mode.');
  console.log('3. Verify typing responsiveness: keystrokes reflect without perceptible latency.');
  console.log('4. Switch to Split mode: verify chunked preview loads visible blocks first.');
  console.log('5. Scroll preview: verify smooth 60fps scrolling and lazy images/math/mermaid.');
  console.log('6. Open Outline panel: verify instant interaction with virtualization (> 300 rows).');
  console.log('7. Open Search in workspace-10k: verify cancellation and capped memory.');
  return { allPass, results };
}

if (process.argv[1] && process.argv[1].endsWith('perf.mjs')) {
  runPerf().then(({ allPass }) => {
    if (!allPass) process.exit(1);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
