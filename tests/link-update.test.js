import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRelative,
  normPath,
  scanDocumentLinks,
  computeReferenceEdits,
} from '../renderer/src/core/links/update.js';
import { applyEdits } from '../renderer/src/core/diff/edits.js';

test('computeRelative computes relative posix paths', () => {
  assert.equal(computeRelative('archive', 'notes/c.md'), '../notes/c.md');
  assert.equal(computeRelative('archive', 'archive/b.md'), 'b.md');
  assert.equal(computeRelative('', 'archive/a.md'), 'archive/a.md');
  assert.equal(computeRelative('notes/sub', 'archive/a.md'), '../../archive/a.md');
  assert.equal(computeRelative('notes', 'notes/sub/doc.md'), 'sub/doc.md');
});

test('normPath cleans up . and .. segments', () => {
  assert.equal(normPath('notes/../archive/a.md'), 'archive/a.md');
  assert.equal(normPath('./notes/./a.md'), 'notes/a.md');
  assert.equal(normPath('a/b/c/../../d.md'), 'a/d.md');
});

test('scanDocumentLinks ignores links inside code and finds all link varieties', () => {
  const text = `
# Title
[Normal link](notes/a.md)
\`[Inline code link](notes/a.md)\`

\`\`\`markdown
[Fenced code link](notes/a.md)
\`\`\`

Angle: [Angle bracket link](<notes/my file.md>)
[ref1]: notes/a.md "Optional Title"
[ref2]: <notes/a.md>
Wiki: [[notes/a#sec|My Note]]
HTML: <img src="assets/image.png" alt="test">
`;

  const links = scanDocumentLinks(text);
  assert.equal(links.length, 6);
  assert.equal(links[0].raw, 'notes/a.md');
  assert.equal(links[1].raw, 'notes/my file.md');
  assert.equal(links[1].hasAngle, true);
  assert.equal(links[2].raw, 'notes/a.md');
  assert.equal(links[2].kind, 'ref');
  assert.equal(links[3].raw, 'notes/a.md');
  assert.equal(links[3].hasAngle, true);
  assert.equal(links[4].raw, 'notes/a');
  assert.equal(links[4].kind, 'wiki');
  assert.equal(links[5].raw, 'assets/image.png');
  assert.equal(links[5].kind, 'html');
});

test('notes/a.md -> archive/a.md updates inbound links and outbound links', () => {
  const renames = [{ from: 'notes/a.md', to: 'archive/a.md' }];

  // Inbound 1: index.md at root
  const indexText = `
Welcome.
See [Note A](notes/a.md).
See [Note A Section](notes/a.md#intro).
See Wiki [[notes/a]].
Inside code: \`[Code](notes/a.md)\`
`;
  const indexEdits = computeReferenceEdits(indexText, 'index.md', renames);
  const updatedIndex = applyEdits(indexText, indexEdits);
  assert.ok(updatedIndex.includes('[Note A](archive/a.md)'));
  assert.ok(updatedIndex.includes('[Note A Section](archive/a.md#intro)'));
  assert.ok(updatedIndex.includes('[[archive/a]]'));
  assert.ok(updatedIndex.includes('`[Code](notes/a.md)`'));

  // Inbound 2: notes/b.md in notes/
  const bText = `
Link to a: [my link](a.md).
With dot-slash: [my link](./a.md).
Ref link:
[ref1]: <./a.md> "Note A"
`;
  const bEdits = computeReferenceEdits(bText, 'notes/b.md', renames);
  const updatedB = applyEdits(bText, bEdits);
  assert.ok(updatedB.includes('[my link](../archive/a.md)'));
  assert.ok(updatedB.includes('[my link](./../archive/a.md') || updatedB.includes('[my link](../archive/a.md)'));
  assert.ok(updatedB.includes('[ref1]: <../archive/a.md> "Note A"'));

  // Outbound: notes/a.md moved to archive/a.md
  const aText = `
# Intro
Link to sibling: [Note C](c.md).
Link to sibling with ./: [Note C](./c.md).
Link to root: [Home](../index.md).
Image: ![Pic](../images/pic.png).
Local anchor: [Back to top](#intro).
Inside code: \`[Not A Link](c.md)\`
`;
  const aEdits = computeReferenceEdits(aText, 'notes/a.md', renames);
  const updatedA = applyEdits(aText, aEdits);
  // Sibling in notes/ was c.md, now from archive/ to notes/c.md is ../notes/c.md
  assert.ok(updatedA.includes('[Note C](../notes/c.md)'));
  // Relative to root index.md from archive/ is still ../index.md
  assert.ok(updatedA.includes('[Home](../index.md)'));
  // Relative to images/pic.png from archive/ is still ../images/pic.png
  assert.ok(updatedA.includes('![Pic](../images/pic.png)'));
  // Local anchor stays #intro
  assert.ok(updatedA.includes('[Back to top](#intro)'));
  // Inside code ignored
  assert.ok(updatedA.includes('`[Not A Link](c.md)`'));
});

test('handles encoded spaces and angle brackets', () => {
  const renames = [{ from: 'notes/my old note.md', to: 'archive/my new note.md' }];
  const doc = `
See [Encoded](notes/my%20old%20note.md).
See [Angle](<notes/my old note.md>).
`;
  const edits = computeReferenceEdits(doc, 'index.md', renames);
  const res = applyEdits(doc, edits);
  assert.ok(res.includes('[Encoded](archive/my%20new%20note.md)'));
  assert.ok(res.includes('[Angle](<archive/my new note.md>)'));
});
