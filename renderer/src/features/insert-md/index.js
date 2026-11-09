// Insert > Document Elements: Callout, Footnote, Definition List, Abbreviation, HTML Block, Page Break; plus the compatibility indicator.
import { CALLOUTS, callout, footnote, deflist, abbr, htmlBlock, pageBreak, MERMAID_KINDS, mermaid } from '../../core/text/insert-md.js';
import { openMenu } from '../../ui/kit/menu.js';
import { openDeflistDialog, openHtmlDialog, openAbbrDialog } from './dialogs.js';
import { mountPortability } from './portability-ui.js';
import { openSymbolsDialog } from './symbols-dialog.js';
import { insertText } from '../../core/text/chars.js';
import { FORMATS, format } from '../../core/text/datetime.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';

export function register(ctx) {
  const { commands, store, settings, services: { documents }, ui: { h, openDialog } } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  const snap = (v) => ({ text: v.state.doc.toString(), selections: v.state.selection.ranges.map((r) => ({ anchor: r.anchor, head: r.head })) });
  const commit = (v, r) => {
    if (!r) return;
    const S = v.state.selection.constructor;
    v.dispatch({ changes: r.changes, selection: S.create(r.selections.map((s) => S.range(s.anchor, s.head))), userEvent: 'input.format', scrollIntoView: true });
    v.focus();
  };
  const apply = (fn) => { const v = view(); if (v) commit(v, fn(snap(v))); };

  const anchorFor = (arg) => {
    if (arg && (arg.nodeType === 1 || typeof arg.x === 'number')) return arg;
    const v = view(), a = document.activeElement, c = v.coordsAtPos(v.state.selection.main.head);
    return a && a.closest('.ribbon, .tabrow') ? a : { x: c ? c.left : 80, y: c ? c.bottom : 80, restore: v.contentDOM };
  };
  const pick = (items, onPick, arg) => openMenu(anchorFor(arg), items.map(([id, label, hint]) => ({ label, hint, onSelect: () => onPick(id) })));
  const sel = () => { const v = view(), r = v.state.selection.main; return v.state.sliceDoc(r.from, r.to).trim(); };
  const lineSel = () => { const t = sel(); return /^[^\n]{1,80}$/.test(t) ? t : ''; };

  const refocus = (fn) => (...a) => { const r = fn(...a); if (r !== false) setTimeout(() => { const v = view(); if (v) v.focus(); }, 0); return r; };
  const def = (id, title, icon, portable, run) => commands.register({ id, title, icon, group: 'Insert', portable, enabled: ready, reason: NO_EDITOR, run });
  def('ins.callout', 'Callout', 'message-square-warning', 'callout', (a) => pick(CALLOUTS, (t) => apply((s) => callout(s, t)), a));
  def('ins.footnote', 'Footnote', 'superscript', 'footnote', () => apply(footnote));
  def('ins.deflist', 'Definition List', 'book-a', 'deflist', () => openDeflistDialog({ openDialog }, { term: lineSel(), onInsert: refocus((t, d) => apply((s) => deflist(s, t, d))) }));
  def('ins.abbr', 'Abbreviation', 'case-sensitive', 'abbr', () => openAbbrDialog({ openDialog }, { term: /^[^\]]{1,40}$/.test(lineSel()) ? lineSel() : '', onInsert: refocus((t, e) => { const r = abbr(snap(view()), t, e); if (!r) return false; commit(view(), r); }) }));
  def('ins.html-block', 'HTML Block', 'code-xml', 'htmlblock', () => openHtmlDialog({ openDialog }, { body: sel(), onInsert: refocus((code) => apply((s) => htmlBlock(s, null, code))) }));
  def('ins.mermaid', 'Mermaid', 'workflow', 'mermaid', (a) => pick(MERMAID_KINDS, (k) => apply((s) => mermaid(s, k)), a));
  def('ins.page-break', 'Page Break', 'file-minus', 'pagebreak', () => apply(pageBreak));
  def('ins.special-char', 'Symbols', 'omega', null, () => openSymbolsDialog({ openDialog }, { onPick: (c) => apply((s) => insertText(s, c)) }));
  def('ins.datetime', 'Date & Time', 'calendar-clock', null, (a) => {
    const loc = navigator.language, now = new Date();
    pick(FORMATS.map(([id, l]) => [id, l, format(id, now, loc)]), (id) => apply((s) => insertText(s, format(id, new Date(), loc))), a);
  });

  mountPortability(ctx);
}
