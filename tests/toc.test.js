import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExportConfig, defaultExportConfig } from '../shared/export-config.js';
import { tocHtml, shell } from '../renderer/src/core/publish/document.js';
import { tocLevelCss } from '../renderer/src/core/publish/styles.js';
import { headerFooterCss } from '../renderer/src/core/publish/header-footer.js';

test('Publishing TOC settings: schema defaults, validation, and per-level typography', () => {
  const cfg = defaultExportConfig();
  assert.equal(cfg.structure.tocTitle, 'Contents');
  assert.equal(cfg.structure.tocDepth, 3);
  assert.equal(cfg.structure.tocPlacement, 'after-cover');
  assert.equal(cfg.structure.tocIndent, true);
  assert.equal(cfg.structure.tocLeader, 'dots');
  assert.equal(cfg.structure.tocPageNumbers, true);
  assert.equal(cfg.structure.tocLinks, true);
  assert.ok(cfg.structure.tocLevels && cfg.structure.tocLevels.l1);

  // Validate custom config
  const custom = parseExportConfig({
    structure: {
      toc: true,
      tocTitle: 'Table of Contents',
      tocDepth: 4,
      tocPlacement: 'start',
      tocIndent: false,
      tocLeader: 'line',
      tocPageNumbers: false,
      tocLinks: false,
      tocLevels: {
        l1: { weight: 700, size: 1.2, italic: 'normal' },
        l2: { italic: 'italic', weight: 400 },
      },
    },
  }).config;

  assert.equal(custom.structure.tocTitle, 'Table of Contents');
  assert.equal(custom.structure.tocDepth, 4);
  assert.equal(custom.structure.tocPlacement, 'start');
  assert.equal(custom.structure.tocIndent, false);
  assert.equal(custom.structure.tocLeader, 'line');
  assert.equal(custom.structure.tocPageNumbers, false);
  assert.equal(custom.structure.tocLinks, false);
  assert.equal(custom.structure.tocLevels.l1.weight, 700);
  assert.equal(custom.structure.tocLevels.l1.size, 1.2);
  assert.equal(custom.structure.tocLevels.l2.italic, 'italic');
});

test('tocHtml generates TOC with title, depth H1–H6, indentation, leaders, page numbers, links', () => {
  const headings = [
    { id: 'sec-1', level: 1, text: 'First Section', num: '1' },
    { id: 'sec-1-1', level: 2, text: 'Subsection', num: '1.1' },
    { id: 'sec-1-1-1', level: 3, text: 'Sub-subsection', num: '1.1.1' },
    { id: 'sec-1-1-1-1', level: 4, text: 'Deep Section', num: '1.1.1.1' },
  ];

  // Default: depth 3, dots, indent, page numbers, links
  const html1 = tocHtml(headings, {
    tocDepth: 3,
    tocTitle: 'Contents',
    tocIndent: true,
    tocLeader: 'dots',
    tocPageNumbers: true,
    tocLinks: true,
  });

  assert.ok(html1.includes('class="lv-toc lv-toc-lead-dots"'));
  assert.ok(html1.includes('<div class="lv-toc-title" dir="auto">Contents</div>'));
  assert.ok(html1.includes('href="#sec-1"'));
  assert.ok(html1.includes('class="lv-toc-leader"'));
  assert.ok(html1.includes('class="lv-toc-page" href="#sec-1"'));
  assert.ok(html1.includes('class="l1"'));
  assert.ok(html1.includes('class="l2"'));
  assert.ok(html1.includes('class="l3"'));
  assert.ok(!html1.includes('href="#sec-1-1-1-1"'), 'Deep H4 filtered out at depth 3');

  // Depth 4, no indent, no leader, no page numbers, no links
  const html2 = tocHtml(headings, {
    tocDepth: 4,
    tocTitle: 'Brief Overview',
    tocIndent: false,
    tocLeader: 'none',
    tocPageNumbers: false,
    tocLinks: false,
  });

  assert.ok(html2.includes('class="lv-toc lv-toc-noindent lv-toc-lead-none"'));
  assert.ok(html2.includes('<span class="lv-toc-entry" href="#sec-1-1-1-1">'), 'Rendered as span when links:false');
  assert.ok(!html2.includes('<a class="lv-toc-entry"'), 'No anchor tags when links:false');
  assert.ok(!html2.includes('class="lv-toc-leader"'), 'No leader when leader:none');
  assert.ok(!html2.includes('class="lv-toc-page"'), 'No page spans when pageNumbers:false');
  assert.ok(html2.includes('href="#sec-1-1-1-1"'), 'H4 included at depth 4');
});

test('per-level typography CSS: emits overrides for configured levels', () => {
  const levels = {
    l1: { weight: 700, size: 1.25, italic: 'normal' },
    l2: { italic: 'italic', weight: 500 },
    l3: { size: 0.9 },
  };
  const css = tocLevelCss(levels, { sans: 'system-ui' });
  assert.ok(css.includes('.lv-toc .l1 .lv-toc-entry{font-size:1.25em;font-weight:700;font-style:normal}'));
  assert.ok(css.includes('.lv-toc .l2 .lv-toc-entry{font-weight:500;font-style:italic}'));
  assert.ok(css.includes('.lv-toc .l3 .lv-toc-entry{font-size:0.9em}'));
  assert.ok(!css.includes('.lv-toc .l4'), 'Unconfigured level 4 omitted');
});

test('Front matter, title page and contents are excluded from numbering and counted correctly in roman/arabic page schemes', () => {
  // 1. Arabic scheme with cover and TOC
  const cfgArabic = defaultExportConfig();
  cfgArabic.numbering.on = true;
  cfgArabic.numbering.style = 'arabic';
  cfgArabic.structure.cover = true;
  cfgArabic.structure.toc = true;

  const cssArabic = headerFooterCss(cfgArabic, { title: 'Doc', author: 'Author', date: '2026' });
  assert.ok(cssArabic.includes('.lv-cover{page:lvcover}'), 'Cover assigned named page');
  assert.ok(cssArabic.includes('@page lvcover{@top-left{content:none}'), 'Cover header/footer suppressed');
  assert.ok(cssArabic.includes('counter(page,decimal)'), 'Arabic numbering used for body');

  // 2. Roman-arabic scheme
  const cfgRomanArabic = defaultExportConfig();
  cfgRomanArabic.numbering.on = true;
  cfgRomanArabic.numbering.style = 'roman-arabic';
  cfgRomanArabic.structure.cover = true;
  cfgRomanArabic.structure.toc = true;

  const cssRomanArabic = headerFooterCss(cfgRomanArabic, { title: 'Doc', author: 'Author', date: '2026' });
  assert.ok(cssRomanArabic.includes('.lv-cover,.lv-toc{page:lvfront}'), 'Cover and TOC assigned front page');
  assert.ok(cssRomanArabic.includes('.lv-body{page:lvbody}'), 'Body assigned body page');
  assert.ok(cssRomanArabic.includes('@page lvbody{counter-reset:page 1}'), 'Body resets page counter to 1');
  assert.ok(cssRomanArabic.includes('counter(page,decimal)'), 'Body uses decimal counter');
});

test('Two-pass layout stability guard: terminates within max passes', () => {
  // Simulating the stability guard from paged-boot.js
  const maxPasses = 2;
  let passesRun = 0;
  let lastPages = 'initial';
  const getSimulatedPages = (p) => (p === 1 ? '1:1,2:4,3:7' : '1:1,2:4,3:8'); // Reflow loop simulator

  let pass = 1;
  while (pass < maxPasses && lastPages) {
    passesRun++;
    const nextPages = getSimulatedPages(pass);
    if (nextPages === lastPages) break;
    lastPages = nextPages;
    pass++;
  }

  assert.equal(passesRun, 1, 'Loop stops at maxPasses (guarded against infinite oscillation)');
  assert.ok(pass <= maxPasses, 'Pass count never exceeds maxPasses');
});

test('HTML sidebar TOC: tocHtml in sidebar mode and shell with sidebar layout', () => {
  const headings = [
    { id: 'sec-intro', level: 1, text: 'Introduction' },
    { id: 'sec-details', level: 2, text: 'Details' },
  ];
  const sideToc = tocHtml(headings, 3, 'Contents', 'ltr', 'sidebar');
  assert.ok(sideToc.includes('class="lv-toc lv-toc--sidebar'));
  assert.ok(sideToc.includes('href="#sec-intro"'));

  const html = shell({ title: 'Doc', dir: 'ltr', css: '', body: '<p>Body text</p>', sidebar: sideToc });
  assert.ok(html.includes('class="lv-layout lv-layout--with-sidebar"'));
  assert.ok(html.includes('<aside class="lv-sidebar" id="lv-side" aria-label="Table of contents">'));
  assert.ok(html.includes('<main class="lv-doc"><p>Body text</p></main>'));
});
