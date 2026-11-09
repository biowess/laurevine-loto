import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DiagnosticRegistry,
  createRegistry,
  runDiagnostics,
  registerRule,
  getRule,
  listRules,
  markdownSyntaxRule,
  headingStructureRule,
  linksRule,
  imagesRule,
  frontmatterRule,
  tableStructureRule,
  extensionCompatibilityRule,
  markerIntegrityRule,
} from '../renderer/src/core/diagnostics/index.js';
import { indexFiles } from '../renderer/src/core/links/resolve.js';

test('DiagnosticRegistry manages rules and executes them', () => {
  const reg = createRegistry();
  assert.equal(reg.rules().length >= 8, true);
  assert.equal(reg.has('markdown-syntax'), true);

  const customRule = {
    id: 'custom-rule',
    title: 'Custom',
    description: 'Custom test rule',
    run(text) {
      if (text.includes('TODO')) {
        return [{ id: 'custom.todo', severity: 'info', message: 'Contains TODO', range: { from: 0, to: 4 } }];
      }
      return [];
    },
  };
  reg.register(customRule);
  assert.equal(reg.has('custom-rule'), true);
  const found = reg.run('TODO: fix this', { rules: ['custom-rule'] });
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'custom.todo');

  reg.unregister('custom-rule');
  assert.equal(reg.has('custom-rule'), false);
});

test('Markdown syntax rule detects unclosed fences, emphasis, links, and malformed tables', () => {
  // 1. Unclosed fence
  const docFence = '# Note\n\n```js\nconsole.log(1);\n';
  const dFence = markdownSyntaxRule.run(docFence);
  assert.equal(dFence.some((d) => d.id === 'syntax.unclosed-fence'), true);
  const fenceDiag = dFence.find((d) => d.id === 'syntax.unclosed-fence');
  assert.equal(fenceDiag.severity, 'error');
  assert.equal(Boolean(fenceDiag.fix), true);
  assert.equal(fenceDiag.fix.insert.includes('```'), true);

  // 2. Unclosed emphasis
  const docEm = 'This is **bold text without closing';
  const dEm = markdownSyntaxRule.run(docEm);
  assert.equal(dEm.some((d) => d.id === 'syntax.unclosed-emphasis'), true);

  // 3. Unclosed links
  const docLink1 = 'Check this [link text](http://example.com and more';
  const dLink1 = markdownSyntaxRule.run(docLink1);
  assert.equal(dLink1.some((d) => d.id === 'syntax.unclosed-link'), true);

  const docLink2 = 'Check this [unclosed link label without closing bracket';
  const dLink2 = markdownSyntaxRule.run(docLink2);
  assert.equal(dLink2.some((d) => d.id === 'syntax.unclosed-link'), true);

  // 4. Malformed table
  const docTable = '| Col 1 | Col 2 |\n| not-valid-delim | --- |\n| a | b |';
  const dTable = markdownSyntaxRule.run(docTable);
  assert.equal(dTable.some((d) => d.id === 'syntax.malformed-table'), true);
});

test('Heading structure rule detects skipped levels, duplicate top-level, and empty headings', () => {
  const doc = `
# First Title

### Skipped Level Heading

# Duplicate Top Level

##

## Valid H2
`;

  const diags = headingStructureRule.run(doc);

  // Skipped level (h1 to h3)
  const skipped = diags.find((d) => d.id === 'headings.skipped-level');
  assert.equal(Boolean(skipped), true);
  assert.match(skipped.message, /skipped/i);

  // Duplicate top-level (h1)
  const dup = diags.find((d) => d.id === 'headings.duplicate-top-level');
  assert.equal(Boolean(dup), true);
  assert.match(dup.message, /Duplicate top-level heading/);

  // Empty heading
  const empty = diags.find((d) => d.id === 'headings.empty');
  assert.equal(Boolean(empty), true);
  assert.equal(empty.message, 'Empty heading');
});

test('Links rule detects missing files, missing anchors, and ambiguous wiki-links', () => {
  const doc = `
[Valid Link](guide.md)
[Broken Link](missing.md)
[Broken Anchor](guide.md#no-such-section)
[[AmbiguousDoc]]
`;

  const files = ['guide.md', 'folderA/AmbiguousDoc.md', 'folderB/AmbiguousDoc.md'];
  const index = indexFiles(files);
  const anchors = (path) => (path === 'guide.md' ? ['intro', 'usage'] : []);

  const diags = linksRule.run(doc, { from: 'index.md', index, anchors });

  const missingFile = diags.find((d) => d.id === 'links.missing-file');
  assert.equal(Boolean(missingFile), true);
  assert.match(missingFile.message, /missing\.md/);

  const missingAnchor = diags.find((d) => d.id === 'links.missing-anchor');
  assert.equal(Boolean(missingAnchor), true);
  assert.match(missingAnchor.message, /#no-such-section/);

  const ambiguous = diags.find((d) => d.id === 'links.ambiguous');
  assert.equal(Boolean(ambiguous), true);
  assert.match(ambiguous.message, /AmbiguousDoc/);
});

test('Images rule detects missing image files and empty alt text', () => {
  const doc = `
![Valid Alt](img/present.png)
![](img/no-alt.png)
![Photo](img/missing.png)
<img src="img/missing.jpg">
`;

  const files = ['img/present.png', 'img/no-alt.png'];
  const index = indexFiles(files);

  const diags = imagesRule.run(doc, { from: 'page.md', index });

  // Empty alt
  const emptyAlt = diags.filter((d) => d.id === 'images.empty-alt');
  assert.equal(emptyAlt.length >= 2, true);
  assert.equal(Boolean(emptyAlt[0].fix), true);

  // Missing file
  const missingImg = diags.filter((d) => d.id === 'images.missing-file');
  assert.equal(missingImg.length >= 2, true);
  assert.match(missingImg[0].message, /missing\.png/);
});

test('Frontmatter rule detects unclosed YAML, syntax errors, duplicate keys, and invalid date formats', () => {
  // 1. Unclosed frontmatter
  const unclosed = '---\ntitle: Unclosed\n';
  const dUnclosed = frontmatterRule.run(unclosed);
  assert.equal(dUnclosed.some((d) => d.id === 'frontmatter.unclosed'), true);

  // 2. Syntax errors and duplicate keys
  const invalidYaml = `---
title: "Valid"
title: "Duplicate"
bad line without key colon
date: tomorrow
created: 2026-11-05
---
# Content`;

  const diags = frontmatterRule.run(invalidYaml);

  const dup = diags.find((d) => d.id === 'frontmatter.duplicate-key');
  assert.equal(Boolean(dup), true);
  assert.match(dup.message, /title/);

  const syn = diags.find((d) => d.id === 'frontmatter.yaml-error');
  assert.equal(Boolean(syn), true);

  const badDate = diags.find((d) => d.id === 'frontmatter.unknown-date-format');
  assert.equal(Boolean(badDate), true);
  assert.match(badDate.message, /tomorrow/);
});

test('Table structure rule detects missing delimiters and ragged rows', () => {
  // Missing delimiter
  const missingDelimDoc = `
| Header 1 | Header 2 |
| Value 1  | Value 2  |
`;
  const dDelim = tableStructureRule.run(missingDelimDoc);
  const delimDiag = dDelim.find((d) => d.id === 'tables.missing-delimiter');
  assert.equal(Boolean(delimDiag), true);
  assert.equal(Boolean(delimDiag.fix), true);
  assert.match(delimDiag.fix.insert, /---/);

  // Ragged rows
  const raggedDoc = `
| Col 1 | Col 2 |
| --- | --- |
| A | B |
| A | B | C |
| A |
`;
  const dRagged = tableStructureRule.run(raggedDoc);
  const raggedDiags = dRagged.filter((d) => d.id === 'tables.ragged-row');
  assert.equal(raggedDiags.length, 2);
  assert.match(raggedDiags[0].message, /expected 2 columns, found 3/);
  assert.match(raggedDiags[1].message, /expected 2 columns, found 1/);
});

test('Extension compatibility rule detects constructs beyond selected profile', () => {
  const doc = `
# Title

Here is a footnote[^1].

> [!NOTE]
> This is a callout.

Citation here [@knuth84].
`;

  // Against CommonMark profile: footnotes, callouts, and citations are unsupported
  const diagsCommonMark = extensionCompatibilityRule.run(doc, { profile: 'commonmark' });
  assert.equal(diagsCommonMark.length >= 3, true);
  assert.equal(diagsCommonMark.every((d) => d.id === 'compatibility.unsupported-construct'), true);

  // Against Extended profile: footnotes, callouts, and citations are supported
  const diagsExtended = extensionCompatibilityRule.run(doc, { profile: 'extended' });
  assert.equal(diagsExtended.length, 0);
});

test('TOC/bibliography marker integrity rule detects unclosed and orphan markers', () => {
  const docToc = `
<!-- laurevine:toc:start -->
- [Item](#item)
`;
  const dToc = markerIntegrityRule.run(docToc);
  assert.equal(dToc.some((d) => d.id === 'markers.toc.unclosed'), true);

  const docBib = `
<!-- laurevine:bibliography:end -->
`;
  const dBib = markerIntegrityRule.run(docBib);
  assert.equal(dBib.some((d) => d.id === 'markers.bib.orphan-end'), true);
});

test('runDiagnostics aggregates and sorts diagnostics from all rules by offset', () => {
  const doc = `---
date: invalid
---

# Title 1

# Title 2

Check [missing link](missing.md)
`;

  const files = ['index.md'];
  const index = indexFiles(files);
  const diags = runDiagnostics(doc, { index });

  assert.equal(diags.length >= 3, true);
  // Ensure sorted by range.from ascending
  for (let i = 1; i < diags.length; i++) {
    assert.equal(diags[i].range.from >= diags[i - 1].range.from, true);
  }
  // Verify all have { id, severity, message, range }
  for (const d of diags) {
    assert.equal(typeof d.id, 'string');
    assert.equal(['error', 'warning', 'info'].includes(d.severity), true);
    assert.equal(typeof d.message, 'string');
    assert.equal(typeof d.range.from, 'number');
    assert.equal(typeof d.range.to, 'number');
  }
});
