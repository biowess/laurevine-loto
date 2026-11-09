import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultExportConfig, parseExportConfig } from '../shared/export-config.js';
import {
  outlineKeys,
  matchRules,
  assignRules,
  clearRules,
  sectionBreakInfo,
  sectionRulesCss,
} from '../renderer/src/core/publish/section-rules.js';

test('sectionBreakInfo: continuous column switch vs forced new page', () => {
  // Continuous 1-column to 2-column switch
  const r1 = { cols: '1' };
  const r2 = { cols: '2' };
  const infoCont = sectionBreakInfo(r2, r1);
  assert.equal(infoCont.continuous, true);
  assert.equal(infoCont.reason, '');

  // Explicit break before forces new page
  const rBrk = { cols: '2', brBefore: true };
  const infoBrk = sectionBreakInfo(rBrk, r1);
  assert.equal(infoBrk.continuous, false);
  assert.ok(infoBrk.reason.includes('Explicit page break'));

  // Margin override forces new page
  const rMargin = { cols: '2', mOn: true, mt: 10, mr: 10, mb: 10, ml: 10 };
  const infoMargin = sectionBreakInfo(rMargin, r1);
  assert.equal(infoMargin.continuous, false);
  assert.ok(infoMargin.reason.includes('Margin override'));

  // Page style (e.g. cover, abstract) forces new page
  const rCover = { cols: '1', style: 'cover' };
  const infoCover = sectionBreakInfo(rCover, null);
  assert.equal(infoCover.continuous, false);
  assert.ok(infoCover.reason.includes('cover'));

  // Custom header/footer forces new page
  const rHdr = { cols: '2', hdr: 'custom', hdrText: 'Custom Running Head' };
  const infoHdr = sectionBreakInfo(rHdr, r1);
  assert.equal(infoHdr.continuous, false);
  assert.ok(infoHdr.reason.includes('Header/footer override'));

  // Multi-column to different multi-column (2 to 3) forces new page
  const r3 = { cols: '3' };
  const infoMulti = sectionBreakInfo(r3, r2);
  assert.equal(infoMulti.continuous, false);
  assert.ok(infoMulti.reason.includes('2 and 3 columns'));
});

test('sectionRulesCss generates Paged.js named pages and column styles', () => {
  const rules = [
    { id: 'sec-title', cols: '1', style: 'cover', brAfter: true },
    { id: 'sec-intro', cols: '1' },
    { id: 'sec-body', cols: '2', gap: 6, sep: 'line', mOn: true, mt: 25, mr: 20, mb: 25, ml: 20 },
    { id: 'sec-bib', cols: '1', noNum: true, noToc: true },
  ];

  const css = sectionRulesCss(rules, { columns: { count: 1 } });

  // Columns styling
  assert.ok(css.includes('.lv-sec-sec-body{column-count:2;column-gap:6mm;column-rule: 1px solid var(--bd);}'));
  assert.ok(css.includes('.lv-sec-sec-title{column-count:1;column-gap:1.5em;}'));
  assert.ok(css.includes('.lv-sec-sec-bib{column-count:1;column-gap:1.5em;}'));

  // Named pages with margins and cover header suppression
  assert.ok(css.includes('.lv-sec-sec-title{page:lv-page-sec-title}'));
  assert.ok(css.includes('@page lv-page-sec-title{@top-left{content:none}'));
  assert.ok(css.includes('.lv-sec-sec-body{page:lv-page-sec-body}'));
  assert.ok(css.includes('@page lv-page-sec-body{margin:25mm 20mm 25mm 20mm;}'));

  // Base layout classes
  assert.ok(css.includes('.lv-sec{box-sizing:border-box}.lv-sec.lv-pb{break-before:page}'));
  assert.ok(css.includes('.lv-sec-cover{min-height:60vh;'));
});

test('Four-part example (one-column title page, one-column intro, two-column body, one-column bibliography)', () => {
  const docText = `# Title Page
A research paper title and author details.

# Introduction
Background concepts and scope of the study.

# Body
Methodology, findings, analysis and discussion.
Detailed results spread over two columns.

# Bibliography
- Knuth, D. E. (1984). The TeXbook.
- Lamport, L. (1994). LaTeX.
`;

  const hs = outlineKeys(docText);
  assert.equal(hs.length, 4);
  assert.equal(hs[0].text, 'Title Page');
  assert.equal(hs[1].text, 'Introduction');
  assert.equal(hs[2].text, 'Body');
  assert.equal(hs[3].text, 'Bibliography');

  // Build the four-part layout rules
  let rules = [];
  const map = new Map();
  rules = assignRules(rules, hs, map, [0], { cols: '1', style: 'cover', brAfter: true });
  rules = assignRules(rules, hs, map, [1], { cols: '1' });
  rules = assignRules(rules, hs, map, [2], { cols: '2', gap: 5, sep: 'line' });
  rules = assignRules(rules, hs, map, [3], { cols: '1', noNum: true, noToc: true });

  assert.equal(rules.length, 4);

  // Match rules against headings
  const matched = matchRules(rules, hs);
  assert.equal(matched.byHead.size, 4);
  assert.equal(matched.stale.length, 0);

  const rTitle = matched.byHead.get(0);
  const rIntro = matched.byHead.get(1);
  const rBody = matched.byHead.get(2);
  const rBib = matched.byHead.get(3);

  assert.equal(rTitle.cols, '1');
  assert.equal(rTitle.style, 'cover');
  assert.equal(rIntro.cols, '1');
  assert.equal(rBody.cols, '2');
  assert.equal(rBib.cols, '1');
  assert.equal(rBib.noNum, true);
  assert.equal(rBib.noToc, true);

  // Feasibility check: introduction to body continuous switch
  const bodyBreak = sectionBreakInfo(rBody, rIntro);
  assert.equal(bodyBreak.continuous, true, 'Continuous column switch is feasible without page-level overrides');

  // Title page forces separate page due to cover style
  const titleBreak = sectionBreakInfo(rTitle, null);
  assert.equal(titleBreak.continuous, false);
});

test('Stale rules are reported after renaming a heading', () => {
  const originalDoc = `# Introduction
First paragraph.

# Methodology
Details about the methods used in the paper.

# Results
The findings of the study.
`;

  const hs = outlineKeys(originalDoc);
  let rules = [];
  const map = new Map();
  // Assign a rule to Methodology
  rules = assignRules(rules, hs, map, [1], { cols: '2', gap: 5 });
  assert.equal(rules.length, 1);
  assert.equal(rules[0].slug, 'methodology');

  // Heading is renamed from "Methodology" to "Research Approach" and text is altered
  const renamedDoc = `# Introduction
First paragraph.

# Research Approach
Completely new section text with different structure and words.

# Results
The findings of the study.
`;

  const newHs = outlineKeys(renamedDoc);
  const { byHead, stale } = matchRules(rules, newHs);

  // Old rule for Methodology cannot match Research Approach
  assert.equal(stale.length, 1);
  assert.equal(stale[0].slug, 'methodology');
  assert.equal(stale[0].text, 'Methodology');
});
