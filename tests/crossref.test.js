import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scanCrossReferences,
  formatCrossReference,
} from '../renderer/src/core/crossref/numbering.js';
import {
  parseBibTeX,
  searchBibliography,
} from '../renderer/src/core/bibliography/index.js';

test('200-entry BibTeX file parses and is searchable by key, author, title, and year', () => {
  // Generate 200 unique BibTeX entries
  const entries = [];
  for (let i = 1; i <= 200; i++) {
    const year = 1980 + (i % 45);
    entries.push(`@article{entry${i},
  author = {Author${i}, Test and Colleague${i}, Other},
  title = {Title of Publication Number ${i} on Quantum Informatics},
  journal = {Journal of Modern Computing},
  year = {${year}},
  volume = {${i}},
  pages = {100--150}
}`);
  }

  const bibtexContent = entries.join('\n\n');
  const parsed = parseBibTeX(bibtexContent);

  assert.equal(parsed.entries.length, 200, 'All 200 entries parsed');
  assert.equal(parsed.errors.length, 0, 'No parse errors');

  // 1. Search by key
  const matchKey = searchBibliography(parsed.entries, 'entry123');
  assert.equal(matchKey.length, 1);
  assert.equal(matchKey[0].id, 'entry123');

  // 2. Search by author
  const matchAuthor = searchBibliography(parsed.entries, 'Author42');
  assert.equal(matchAuthor.length, 1);
  assert.equal(matchAuthor[0].id, 'entry42');

  // 3. Search by title
  const matchTitle = searchBibliography(parsed.entries, 'Number 77');
  assert.equal(matchTitle.length, 1);
  assert.equal(matchTitle[0].id, 'entry77');

  // 4. Search by year
  const matchYear = searchBibliography(parsed.entries, '2024');
  assert.ok(matchYear.length > 0);
  assert.ok(matchYear.every((e) => String(e.year) === '2024'));

  // 5. Broad query
  const matchQuantum = searchBibliography(parsed.entries, 'Quantum');
  assert.equal(matchQuantum.length, 200);
});

test('scanCrossReferences extracts figures, tables, equations, sections and computes numbers', () => {
  const doc = `---
title: Scientific Paper
---

# Introduction

Here is our model overview in [Figure 1](#fig-arch).
And results in [Table 1](#tbl-bench).

<a id="fig-arch"></a>
![System Architecture Diagram](images/arch.png)

## Methodology

Equation for cost function is [Equation 1](#eq-loss):

<a id="eq-loss"></a>
$$L(\\theta) = \\frac{1}{N} \\sum_{i=1}^N (y_i - \\hat{y}_i)^2$$

### Benchmark Setup

<a id="tbl-bench"></a>
| Model | Accuracy | Latency |
|-------|----------|---------|
| Loto  | 98.5%    | 12ms    |

<a id="fig-loss"></a>
![Loss Convergence Curve](images/loss.png)

## Evaluation

Discussion continues in [Section 1](#introduction).
`;

  const data = scanCrossReferences(doc, { strategy: 'github' });

  // Figures
  assert.equal(data.figures.length, 2);
  assert.equal(data.figures[0].id, 'fig-arch');
  assert.equal(data.figures[0].num, 1);
  assert.equal(data.figures[0].label, 'Figure 1');
  assert.equal(data.figures[0].title, 'System Architecture Diagram');

  assert.equal(data.figures[1].id, 'fig-loss');
  assert.equal(data.figures[1].num, 2);
  assert.equal(data.figures[1].label, 'Figure 2');
  assert.equal(data.figures[1].title, 'Loss Convergence Curve');

  // Tables
  assert.equal(data.tables.length, 1);
  assert.equal(data.tables[0].id, 'tbl-bench');
  assert.equal(data.tables[0].num, 1);
  assert.equal(data.tables[0].label, 'Table 1');
  assert.ok(data.tables[0].title.includes('Model | Accuracy | Latency'));

  // Equations
  assert.equal(data.equations.length, 1);
  assert.equal(data.equations[0].id, 'eq-loss');
  assert.equal(data.equations[0].num, 1);
  assert.equal(data.equations[0].label, 'Equation 1');
  assert.ok(data.equations[0].title.includes('L(\\theta)'));

  // Sections
  assert.equal(data.sections.length, 4);
  assert.equal(data.sections[0].label, 'Section 1');
  assert.equal(data.sections[0].title, 'Introduction');
  assert.equal(data.sections[0].num, '1');

  assert.equal(data.sections[1].label, 'Section 1.1');
  assert.equal(data.sections[1].title, 'Methodology');
  assert.equal(data.sections[1].num, '1.1');

  assert.equal(data.sections[2].label, 'Section 1.1.1');
  assert.equal(data.sections[2].title, 'Benchmark Setup');
  assert.equal(data.sections[2].num, '1.1.1');

  assert.equal(data.sections[3].label, 'Section 1.2');
  assert.equal(data.sections[3].title, 'Evaluation');
  assert.equal(data.sections[3].num, '1.2');

  // Link formatters
  assert.equal(formatCrossReference(data.figures[0]), '[Figure 1](#fig-arch)');
  assert.equal(formatCrossReference(data.tables[0]), '[Table 1](#tbl-bench)');
  assert.equal(formatCrossReference(data.equations[0]), '[Equation 1](#eq-loss)');
  assert.equal(formatCrossReference(data.sections[1]), '[Section 1.1](#methodology)');
  assert.equal(formatCrossReference(data.figures[0], 'architecture model'), '[architecture model](#fig-arch)');
});

test('scanCrossReferences detects duplicate and missing labels', () => {
  const doc = `
<a id="fig-duplicate"></a>
![Fig A](a.png)

<a id="fig-duplicate"></a>
![Fig B](b.png)

Here is a broken reference [Figure 3](#fig-missing) and another [broken](#sec-missing).
`;

  const data = scanCrossReferences(doc);

  // Duplicate labels
  assert.equal(data.duplicates.length, 1);
  assert.equal(data.duplicates[0].id, 'fig-duplicate');
  assert.equal(data.duplicates[0].count, 2);

  // Missing references
  assert.equal(data.missing.length, 2);
  const missingIds = data.missing.map((m) => m.id);
  assert.ok(missingIds.includes('fig-missing'));
  assert.ok(missingIds.includes('sec-missing'));
});
