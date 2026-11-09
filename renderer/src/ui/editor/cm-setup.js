import { keyHook } from '../../services/editor-hooks.js';
import { spellSkip } from './spell-skip.js';
// Builds per-document EditorStates. Setting-driven parts live in compartments so they can be reconfigured live.
const indentOf = (v) => (v === 'tab' ? '\t' : ' '.repeat(parseInt(v, 10) || 2));

export function createSetup(CM, onUpdate) {
  const { EditorState, EditorView, Compartment, keymap, tags } = CM;
  const C = Object.fromEntries(['wrap', 'gutter', 'ws', 'indent', 'lang', 'attrs'].map((k) => [k, new Compartment()]));
  const t = (tag, c) => ({ tag, class: c });
  const style = CM.HighlightStyle.define([
    t(tags.heading, 'tok-h'), t(tags.strong, 'tok-b'), t(tags.emphasis, 'tok-i'), t([tags.link, tags.url], 'tok-l'),
    t(tags.monospace, 'tok-c'), t(tags.quote, 'tok-q'), t(tags.strikethrough, 'tok-s'),
    t([tags.processingInstruction, tags.contentSeparator, tags.keyword, tags.operator, tags.modifier], 'tok-k'),
    t([tags.string, tags.regexp], 'tok-c'), t([tags.number, tags.bool, tags.atom], 'tok-l'), t(tags.comment, 'tok-q'),
    t([tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.variableName), tags.className, tags.typeName, tags.tagName], 'tok-l'),
    t([tags.propertyName, tags.attributeName, tags.labelName, tags.standard(tags.variableName)], 'tok-k'),
  ]);
  // Fully covered lines get a full-width band (same extent as the active-line highlight); CM's own rects stop at the text end.
  const selLines = !CM.Decoration || !CM.ViewPlugin ? [] : CM.ViewPlugin.fromClass(class {
    constructor(v) { this.decorations = this.build(v); }
    update(u) { if (u.selectionSet || u.docChanged || u.viewportChanged) this.decorations = this.build(u.view); }
    build(v) {
      const d = v.state.doc, mark = CM.Decoration.line({ class: 'cm-selLine' }), at = new Set();
      for (const r of v.state.selection.ranges) {
        if (r.empty) continue;
        for (let n = d.lineAt(Math.max(r.from, v.viewport.from)); n.from <= Math.min(r.to, v.viewport.to); n = d.line(n.number + 1)) {
          if (r.from <= n.from && r.to >= n.to && r.to > n.from) at.add(n.from);
          if (n.number >= d.lines) break;
        }
      }
      return CM.Decoration.set([...at].sort((a, b) => a - b).map((f) => mark.range(f)));
    }
  }, { decorations: (p) => p.decorations });
  const fixed = [
    selLines,
    EditorView.domEventHandlers({ keydown: (e, v) => keyHook(e, v) }),
    CM.history(), CM.drawSelection(), CM.dropCursor(), CM.highlightActiveLine(), CM.bracketMatching(),
    EditorState.allowMultipleSelections.of(true), CM.rectangularSelection(), CM.crosshairCursor(),
    CM.syntaxHighlighting(style),
    keymap.of([{ key: 'Mod-d', run: CM.selectNextOccurrence, preventDefault: true }, ...CM.historyKeymap, ...CM.defaultKeymap, CM.indentWithTab]),
    EditorView.updateListener.of(onUpdate),
    spellSkip(CM),
  ];
  const parts = (p, heavy) => ({
    wrap: p.wordWrap ? EditorView.lineWrapping : [],
    gutter: p.lineNumbers ? [CM.lineNumbers(), CM.highlightActiveLineGutter()] : [],
    ws: p.showWhitespace && !heavy ? CM.highlightWhitespace() : [],
    indent: [EditorState.tabSize.of(p.tabSize), CM.indentUnit.of(indentOf(p.indentUnit))],
    lang: heavy ? [] : CM.markdown({ base: CM.markdownLanguage, codeLanguages: CM.languages }),
    attrs: EditorView.contentAttributes.of({ spellcheck: p.spellcheck ? 'true' : 'false', 'aria-label': 'Markdown source editor' }),
  });
  return {
    create: (text, p, heavy) => EditorState.create({ doc: text, extensions: [fixed, ...Object.entries(parts(p, heavy)).map(([k, v]) => C[k].of(v))] }),
    effects: (p, heavy) => Object.entries(parts(p, heavy)).map(([k, v]) => C[k].reconfigure(v)),
  };
}
