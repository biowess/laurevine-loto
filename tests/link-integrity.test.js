import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDocumentIntegrity,
  replaceLinkInText,
  removeLinkInText,
  isAssetFile,
  isAttachmentDir,
} from '../renderer/src/core/links/integrity.js';

test('isAssetFile detects asset file extensions', () => {
  assert.equal(isAssetFile('image.png'), true);
  assert.equal(isAssetFile('video.mp4'), true);
  assert.equal(isAssetFile('doc.pdf'), true);
  assert.equal(isAssetFile('note.md'), false);
  assert.equal(isAssetFile('script.js'), false);
});

test('isAttachmentDir identifies attachment directory structures', () => {
  assert.equal(isAttachmentDir('assets/image.png'), true);
  assert.equal(isAttachmentDir('docs/attachments/file.pdf'), true);
  assert.equal(isAttachmentDir('guide.assets/diagram.svg'), true);
  assert.equal(isAttachmentDir('docs/notes/page.md'), false);
});

test('checkDocumentIntegrity finds broken links, missing media, and external links', () => {
  const doc = `
# Title

Here is a [good link](existing.md) and a [broken link](missing.md).
Here is a [missing anchor](existing.md#nonexistent-heading).
Here is a same doc [broken anchor](#missing-local-heading).
Here is an image ![alt](assets/missing-photo.png) and HTML <img src="assets/missing-logo.svg">.
Here is an external link to [Google](https://google.com) and another [Google](https://google.com).
Wiki link [[MissingNote]] and [[ExistingNote#missing-sec]].
`;

  const workspaceFiles = new Set(['existing.md', 'ExistingNote.md', 'doc.md']);
  const headingsByFile = new Map([
    ['existing.md', [{ text: 'Introduction', line: 1 }]],
    ['ExistingNote.md', [{ text: 'Summary', line: 1 }]],
    ['doc.md', [{ text: 'Title', line: 2 }]],
  ]);

  const res = checkDocumentIntegrity(doc, 'doc.md', {
    workspaceFiles,
    headingsByFile,
    strategy: 'github',
  });

  // Broken links should include missing.md, existing.md#nonexistent-heading, #missing-local-heading, MissingNote, ExistingNote#missing-sec
  assert.equal(res.brokenLinks.length >= 5, true);
  assert.ok(res.brokenLinks.some((l) => l.target === 'missing.md' && l.reason === 'missing-file'));
  assert.ok(res.brokenLinks.some((l) => l.anchor === 'nonexistent-heading' && l.reason === 'missing-anchor'));
  assert.ok(res.brokenLinks.some((l) => l.anchor === 'missing-local-heading' && l.reason === 'missing-anchor'));
  assert.ok(res.brokenLinks.some((l) => l.target === 'MissingNote' && l.reason === 'missing-file'));
  assert.ok(res.brokenLinks.some((l) => l.target === 'ExistingNote' && l.reason === 'missing-anchor'));

  // Missing media: assets/missing-photo.png and assets/missing-logo.svg
  assert.equal(res.missingFiles.length, 2);
  assert.ok(res.missingFiles.some((m) => m.path.includes('missing-photo.png')));
  assert.ok(res.missingFiles.some((m) => m.path.includes('missing-logo.svg')));

  // External links
  assert.equal(res.externalLinks.length, 1);
  assert.equal(res.externalLinks[0].url, 'https://google.com');
  assert.equal(res.externalLinks[0].count, 2);
});

test('replaceLinkInText replaces a broken link target at line', () => {
  const doc = 'Line 1\nSee [my guide](broken.md) for details.\nLine 3';
  const updated = replaceLinkInText(doc, { line: 2, target: 'broken.md' }, 'fixed.md');
  assert.equal(updated, 'Line 1\nSee [my guide](fixed.md) for details.\nLine 3');
});

test('removeLinkInText unwraps a link to label and removes media', () => {
  const doc = 'Check [important guide](broken.md) now.';
  const unwrapped = removeLinkInText(doc, { line: 1, target: 'broken.md', kind: 'file' });
  assert.equal(unwrapped, 'Check important guide now.');

  const docImg = 'Photo: ![alt](missing.png) here.';
  const removedImg = removeLinkInText(docImg, { line: 1, target: 'missing.png', kind: 'media' });
  assert.equal(removedImg, 'Photo:  here.');
});
