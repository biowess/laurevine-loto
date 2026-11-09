import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEntry,
  buildCitation,
  extractCitations,
  findBibRegions,
  generateBibliographyMarkdown,
  refreshBibliography,
  planBibliography,
  analyzeBibliography,
} from '../renderer/src/core/bibliography/index.js';
import { render } from '../renderer/src/core/markdown/renderer.js';
import { resolveBibliographyPaths } from '../renderer/src/features/citations/sources.js';

test('buildCitation generates pandoc citation syntax', () => {
  assert.equal(buildCitation('knuth1984'), '[@knuth1984]');
  assert.equal(buildCitation('knuth1984', { locator: 'p. 12' }), '[@knuth1984, p. 12]');
  assert.equal(buildCitation('knuth1984', { suppressAuthor: true }), '[-@knuth1984]');
  assert.equal(buildCitation('knuth1984', { locator: 'p. 12', suppressAuthor: true }), '[-@knuth1984, p. 12]');
  assert.equal(buildCitation('@alreadyClean'), '[@alreadyClean]');
});

test('extractCitations parses bracketed and in-text citations', () => {
  const doc = `---
title: Sample
bibliography: refs.bib
---

# Introduction

As shown in [@knuth1984, p. 12], TeX is powerful.
Further work by @lamport1994 expanded it.
Multiple citations: [see @knuth1984; and -@lamport1994, ch. 2].
Missing citation: [@unknownKey].

\`\`\`
[@codeBlockShouldBeIgnored]
\`\`\`
`;

  const cites = extractCitations(doc);
  assert.equal(cites.length, 5);

  assert.equal(cites[0].key, 'knuth1984');
  assert.equal(cites[0].locator, 'p. 12');
  assert.equal(cites[0].suppressAuthor, false);
  assert.equal(cites[0].line, 8);

  assert.equal(cites[1].key, 'lamport1994');
  assert.equal(cites[1].inText, true);
  assert.equal(cites[1].line, 9);

  assert.equal(cites[2].key, 'knuth1984');
  assert.equal(cites[2].prefix, 'see');

  assert.equal(cites[3].key, 'lamport1994');
  assert.equal(cites[3].suppressAuthor, true);
  assert.equal(cites[3].locator, 'ch. 2');

  assert.equal(cites[4].key, 'unknownKey');
});

test('Bibliography managed regions can be found, planned, and refreshed', () => {
  const e1 = normalizeEntry({
    id: 'knuth1984',
    type: 'book',
    title: 'The TeXbook',
    authors: [{ family: 'Knuth', given: 'Donald E.' }],
    year: '1984',
  });
  const e2 = normalizeEntry({
    id: 'lamport1994',
    type: 'book',
    title: 'LaTeX',
    authors: [{ family: 'Lamport', given: 'Leslie' }],
    year: '1994',
  });

  const initialDoc = '# Chapter\n\nStudy [@knuth1984].\n';
  const plan = planBibliography(initialDoc, { pos: initialDoc.length, entries: [e1, e2] });

  assert.ok(plan.text.includes('<!-- laurevine:bibliography:start'));
  assert.ok(plan.text.includes('<!-- laurevine:bibliography:end -->'));
  assert.ok(plan.text.includes('The TeXbook'));

  const regions = findBibRegions(plan.text);
  assert.equal(regions.regions.length, 1);

  // Now add another citation and refresh
  const updatedDoc = plan.text.replace('Study [@knuth1984].', 'Study [@knuth1984] and [@lamport1994].');
  const refreshed = refreshBibliography(updatedDoc, { entries: [e1, e2] });
  assert.ok(refreshed.changed);
  assert.ok(refreshed.text.includes('The TeXbook'));
  assert.ok(refreshed.text.includes('LaTeX'));
});

test('analyzeBibliography detects entries, duplicates, and missing keys used in document', () => {
  const e1 = normalizeEntry({ id: 'knuth1984', title: 'TeX', year: '1984' });
  const e2 = normalizeEntry({ id: 'knuth1984', title: 'TeX 2', year: '1984' }); // duplicate
  const e3 = normalizeEntry({ id: 'lamport1994', title: 'LaTeX', year: '1994' });

  const doc = 'Citing [@knuth1984] and [@missingRef].';
  const analysis = analyzeBibliography({
    text: doc,
    entries: [e1, e2, e3],
    errors: ['Invalid syntax at line 5'],
  });

  assert.equal(analysis.entries.length, 3);
  assert.deepEqual(analysis.duplicates, ['knuth1984']);
  assert.equal(analysis.errors.length, 1);
  assert.equal(analysis.missingKeys.length, 1);
  assert.equal(analysis.missingKeys[0].key, 'missingRef');
  assert.equal(analysis.missingKeys[0].line, 1);
});

test('Preview renders citations with tooltips, visible warnings for unknown keys, and generated bibliography', () => {
  const e1 = normalizeEntry({
    id: 'knuth1984',
    type: 'book',
    title: 'The TeXbook',
    authors: [{ family: 'Knuth', given: 'Donald E.' }],
    year: '1984',
  });
  const entryMap = new Map([['knuth1984', e1]]);

  const doc = 'Here is [@knuth1984, p. 12] and unknown [@missingKey].';
  const res = render(doc, {
    profile: 'extended',
    bibliography: { entries: entryMap, style: 'author-year' },
  });

  // Known key renders formatted inline reference with tooltip
  assert.ok(res.html.includes('class="lt-citation"'));
  assert.ok(res.html.includes('title="Knuth, D. E. (1984). The TeXbook."'));
  assert.ok(res.html.includes('(Knuth, 1984, p. 12)'));

  // Unknown key renders visible warning
  assert.ok(res.html.includes('lt-citation-warning'));
  assert.ok(res.html.includes('title="Unknown citation key: missingKey"'));
  assert.ok(res.html.includes('[@missingKey]'));

  // Appends generated bibliography since citations were present
  assert.ok(res.html.includes('<section class="lt-bibliography">'));
  assert.ok(res.html.includes('References</h3>'));
  assert.ok(res.html.includes('The TeXbook'));
});

test('resolveBibliographyPaths reads frontmatter key or falls back to workspace default', () => {
  const docWithFm = `---
title: Paper
bibliography: references.bib
---
Body text
`;
  const r1 = resolveBibliographyPaths(docWithFm, '/path/to/doc.md', '/path/to', 'default.bib');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].raw, 'references.bib');
  assert.equal(r1[0].resolved, '/path/to/references.bib');

  const docNoFm = 'Plain text without frontmatter';
  const r2 = resolveBibliographyPaths(docNoFm, '/path/to/doc.md', '/path/to', 'workspace-default.bib');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].raw, 'workspace-default.bib');
  assert.equal(r2[0].resolved, '/path/to/workspace-default.bib');
});
