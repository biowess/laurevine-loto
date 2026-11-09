import { skipRanges } from '../../core/text/spell-skip.js';

// Session-ignored words; bump `ver` and dispatch an empty transaction to repaint.
export const spellIgnore = { words: new Set(), ver: 0 };

// Marks code, URLs, frontmatter and ignored words spellcheck="false" so Chromium skips them. Needs Decoration/ViewPlugin in the vendor bundle (npm run vendor).
export function spellSkip(CM) {
  const { Decoration, ViewPlugin } = CM;
  if (!Decoration || !ViewPlugin) return [];
  const mark = Decoration.mark({ attributes: { spellcheck: 'false' } });
  const build = (v) => Decoration.set(skipRanges(v.state.doc.toString(), spellIgnore.words).map(([a, b]) => mark.range(a, b)), true);
  return ViewPlugin.fromClass(class {
    constructor(v) { this.d = build(v); this.ver = spellIgnore.ver; }
    update(u) { if (u.docChanged || this.ver !== spellIgnore.ver) { this.d = build(u.view); this.ver = spellIgnore.ver; } }
  }, { decorations: (p) => p.d });
}
