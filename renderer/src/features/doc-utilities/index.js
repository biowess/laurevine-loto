// Tools > Document Utilities: Formatter, Line Endings, Trailing Space, Indentation, Empty Headings (one undoable editor transaction each, optional before/after preview) and Inspect Dialect.
import { formatMarkdown, normalizeLineEndings, removeTrailingWhitespace, normalizeIndentation, cleanEmptyHeadings, inspectDialect, scopeRange } from '../../core/format/index.js';
import { delta } from '../comparison/entry.js';
import { openDialectDialog } from './dialect-dialog.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const NO_DOC = 'No document is open';
const CUT = 'The selection cuts through a block. Select whole paragraphs, lists, tables or code blocks, or clear the selection to use the whole document.';
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const IDS = ['tool.formatter', 'tool.line-endings', 'tool.trailing-space', 'tool.indentation', 'tool.empty-headings', 'tool.dialect'];

export function register(ctx) {
  const { commands, store, settings, services: { documents: D }, ui } = ctx, { toast } = ui;
  const activeId = () => store.get().documents.activeId;
  const view = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent && store.get().ui.mode !== 'preview' ? v : null; };
  const ready = () => !!activeId() && !!view();

  const TEXT = [
    { id: 'tool.formatter', title: 'Format Markdown', icon: 'wand-sparkles', aliases: ['formatter', 'format document', 'tidy markdown'], none: 'The Markdown is already tidy: consistent lists, spacing, tables and code fences.',
      done: () => 'Formatted the Markdown (lists, spacing, tables and code fences)', fn: (t) => formatMarkdown(t) },
    { id: 'tool.trailing-space', title: 'Trailing Space', icon: 'eraser', aliases: ['remove trailing whitespace'], none: 'No trailing whitespace found.',
      done: (r) => `Removed trailing whitespace from ${plural(r.count, 'line')}`, fn: (t) => removeTrailingWhitespace(t) },
    { id: 'tool.indentation', title: 'Indentation', icon: 'indent', aliases: ['normalize indentation', 'tabs to spaces'], none: 'Indentation already matches your editor settings.',
      done: (r) => `Normalized indentation on ${plural(r.count, 'line')}`,
      fn: (t) => normalizeIndentation(t, { style: settings.get('editor.indentUnit') === 'tab' ? 'tabs' : 'spaces', size: settings.get('editor.tabSize') }) },
    { id: 'tool.empty-headings', title: 'Empty Headings', icon: 'heading', aliases: ['clean empty headings', 'remove empty headings'], none: 'No empty headings found.',
      done: (r) => `Removed ${plural(r.count, 'empty heading')}`, fn: (t) => cleanEmptyHeadings(t) },
  ];

  const commit = (id, base, next, summary) => {
    if (!D.getEntry(id)) { toast('That document is closed. Nothing was applied.'); return false; }
    const v = activeId() === id ? view() : null;
    if (!v) { toast('Return to the document in Source or Split mode to apply the change.', { timeout: 5000 }); return false; }
    if (v.state.doc.toString() !== base) { toast('The document changed after it was inspected. Nothing was applied.', { timeout: 5000 }); return false; }
    v.dispatch({ changes: delta(base, next), userEvent: 'input.format' });
    D.editorRun('flush');
    v.focus();
    if (summary) toast(summary);
    return true;
  };

  const preview = (t, id, base, next, summary) => ctx.services.compare({
    title: `Preview — ${t.title}`, oldText: base, newText: next, oldLabel: 'Before', newLabel: 'After', mode: 'inline',
    buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: () => { commit(id, base, next, summary); } }],
  });

  const runText = (t) => (arg) => {
    const v = view(), id = activeId();
    if (!v || !id) return;
    const base = v.state.doc.toString(), sel = v.state.selection.main, scoped = !sel.empty;
    const range = scoped ? scopeRange(base, sel.from, sel.to) : { from: 0, to: base.length };
    if (!range) { toast(CUT, { timeout: 5000 }); return; }
    const part = base.slice(range.from, range.to), r = t.fn(part);
    let out = r.text;
    if (scoped && out.endsWith('\n') && !part.endsWith('\n')) out = out.slice(0, -1);
    const next = base.slice(0, range.from) + out + base.slice(range.to), where = scoped ? ' in the selection' : '';
    if (next === base) { toast(`Nothing to change${where}. ${t.none}`); return; }
    const summary = `${t.done(r)}${where}.`;
    const want = arg && typeof arg === 'object' && 'preview' in arg ? !!arg.preview : settings.get('tools.preview') === true;
    if (want && ctx.services.compare) preview(t, id, base, next, summary);
    else commit(id, base, next, summary);
  };

  const setEol = (id, target) => {
    const e = D.getEntry(id), v = view();
    if (!e) return;
    const base = v && activeId() === id ? v.state.doc.toString() : null, r = base === null ? { changed: false } : normalizeLineEndings(base, 'lf');
    if (e.doc.eol === target && !r.changed) { toast(`Nothing to change. Line endings are already ${target.toUpperCase()}.`); return; }
    if (r.changed && !commit(id, base, r.text)) return;
    D.updateDoc(id, { eol: target, dirty: true });
    toast(`Line endings set to ${target === 'crlf' ? 'CRLF (Windows style)' : 'LF (Unix style)'}. The file is written this way when you save.`, { timeout: 4000 });
  };

  const runEol = (arg) => {
    const id = activeId(), e = id && D.getEntry(id);
    if (!e) return;
    if (arg === 'lf' || arg === 'crlf') { setEol(id, arg); return; }
    ui.openMenu(document.querySelector('[data-cmd="tool.line-endings"]') || { x: 40, y: 80 }, [
      { label: 'LF — Unix style (macOS, Linux; recommended for Git)', checked: e.doc.eol === 'lf', onSelect: () => setEol(id, 'lf') },
      { label: 'CRLF — Windows style (Notepad, older Windows tools)', checked: e.doc.eol === 'crlf', onSelect: () => setEol(id, 'crlf') },
    ]);
  };

  const jump = (id, from) => {
    const v = activeId() === id ? view() : null;
    if (!v) { toast(NO_EDITOR); return; }
    const pos = Math.min(from, v.state.doc.length);
    v.dispatch({ selection: { anchor: pos }, effects: v.constructor.scrollIntoView(pos, { x: 'center', y: 'center' }), userEvent: 'select.jump' });
    v.focus();
  };

  const runDialect = () => {
    const id = activeId();
    D.editorRun('flush');
    const e = id && D.getEntry(id);
    if (!e) return;
    const result = inspectDialect(e.doc.text, { html: settings.get('markdown.htmlPassthrough') === true, wiki: settings.get('markdown.wikiLinks') === true });
    openDialectDialog(ctx, { result, name: e.doc.name, jump: (from) => jump(id, from) });
  };

  const def = (id, title, icon, run, extra) => commands.register({ id, title, icon, group: 'Document Utilities', run, ...extra });
  const edit = { enabled: ready, reason: NO_EDITOR };
  for (const t of TEXT) def(t.id, t.title, t.icon, runText(t), { aliases: t.aliases, ...edit });
  def('tool.line-endings', 'Line Endings', 'corner-down-left', runEol, { aliases: ['lf', 'crlf', 'normalize line endings'], enabled: () => !!activeId(), reason: NO_DOC });
  def('tool.dialect', 'Inspect Dialect', 'scan-search', runDialect, { aliases: ['inspect markdown dialect', 'markdown profile'], enabled: () => !!activeId(), reason: NO_DOC });

  const sync = () => IDS.forEach((id) => commands.invalidate(id));
  store.subscribe((s) => s.documents.activeId, sync);
  store.subscribe((s) => s.ui.mode, sync);
}
