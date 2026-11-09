// Insert > Code & Mathematics commands and the contextual Code ribbon tab (shown while the caret is inside a fenced block).
import { insertFence, insertMathBlock, insertMathInline, fenceAt, setLang } from '../../core/text/code.js';
import { LANGS, langFromPath } from '../../core/text/code-langs.js';
import { writeText } from '../../services/clipboard-client.js';
import { pickText } from '../../services/doc-client.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';
import { contextual } from '../../ui/ribbon/ribbon.js';
import { openPopover, closePopover } from '../../ui/kit/popover.js';
import { openEquationDialog } from './equation-dialog.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const NO_BLOCK = 'Needs the caret inside a fenced code block in the Source or Split editor';
const MAX = 1024 * 1024;
const TAB = [['Code', 'code', 0, '*ins.code-lang', 'ins.code-copy', 'code.select-block', 'code.line-numbers']];
const BLOCK_IDS = ['ins.code-lang', 'ins.code-copy', 'code.select-block'];

export function register(ctx) {
  const { commands, store, settings, services: { documents }, ui: { h, toast, openDialog } } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  const snap = (v) => ({ text: v.state.doc.toString(), selections: v.state.selection.ranges.map((r) => ({ anchor: r.anchor, head: r.head })) });
  const commit = (v, r) => {
    const S = v.state.selection.constructor;
    v.dispatch({ changes: r.changes, selection: S.create(r.selections.map((s) => S.range(s.anchor, s.head))), userEvent: 'input.format', scrollIntoView: true });
    v.focus();
  };

  let ms = null, mb = null;
  const block = () => {
    const v = ready() && view();
    if (!v) return null;
    if (ms !== v.state) { ms = v.state; mb = fenceAt(v.state.doc.toString(), v.state.selection.main.head); }
    return mb;
  };

  const recents = () => String(settings.get('code.recentLangs') || '').split(',').filter(Boolean);
  const remember = (id) => id && settings.set('code.recentLangs', [id, ...recents().filter((x) => x !== id)].slice(0, 6).join(','));

  function pickLang(onPick) {
    const v = view(), a = document.activeElement, c = v.coordsAtPos(v.state.selection.main.head);
    const anchor = a && a.closest('.ribbon, .tabrow') ? a : { x: c ? c.left : 80, y: c ? c.bottom : 80, restore: v.contentDOM };
    const input = h('input', { class: 'ct-q', type: 'search', placeholder: 'Search languages', 'aria-label': 'Search languages' });
    const list = h('div', { class: 'ct-list', role: 'listbox' });
    const pick = (id) => { closePopover(); remember(id); onPick(id); };
    const opt = ([id, label]) => h('button', { type: 'button', class: 'ct-opt', role: 'option', onclick: () => pick(id) }, label);
    const draw = () => {
      const q = input.value.trim().toLowerCase(), rec = recents().map((id) => LANGS.find((l) => l[0] === id)).filter(Boolean);
      const all = LANGS.filter(([id, t]) => !q || id.includes(q) || t.toLowerCase().includes(q));
      list.replaceChildren(...(q || !rec.length ? [] : [h('div', { class: 'ct-head' }, 'Recent'), ...rec.map(opt), h('div', { class: 'ct-head' }, 'All languages')]), ...all.map(opt));
    };
    input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => {
      const first = list.querySelector('.ct-opt');
      if (e.key === 'Enter' && first) { e.preventDefault(); first.click(); } else if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
    });
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const b = [...list.querySelectorAll('.ct-opt')], i = b.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
      (b[i] || (i < 0 ? input : null))?.focus();
    });
    draw();
    if (openPopover(anchor, h('div', { class: 'ct-pop popover--list' }, input, list))) input.focus();
  }

  const def = (id, title, icon, extra) => commands.register({ id, title, icon, group: 'Code', enabled: ready, reason: NO_EDITOR, ...extra });
  const inBlock = { enabled: () => !!block(), reason: NO_BLOCK };
  const code = (v, b) => v.state.sliceDoc(b.innerFrom, b.innerTo);

  def('ins.code-block', 'Fenced Code Block', 'square-code', { run: () => pickLang((id) => { const v = view(); if (v) commit(v, insertFence(snap(v), id)); }) });
  def('ins.code-lang', 'Select Programming Language', 'languages', { ...inBlock, run: () => pickLang((id) => { const v = view(), r = v && setLang(snap(v), id); if (r) commit(v, r); }) });
  def('ins.code-copy', 'Copy Code', 'copy', { ...inBlock, run: async () => { const v = view(), b = block(); if (v && b) { await writeText(code(v, b)); toast('Code copied'); } } });
  def('code.select-block', 'Select Block', 'text-select', { ...inBlock, run: () => { const v = view(), b = block(); if (v && b) { v.dispatch({ selection: { anchor: b.innerFrom, head: b.innerTo }, scrollIntoView: true }); v.focus(); } } });
  def('code.line-numbers', 'Toggle Line Numbers', 'list-ordered', { enabled: () => true, checked: () => settings.get('preview.codeLineNumbers') === true, run: () => settings.set('preview.codeLineNumbers', !settings.get('preview.codeLineNumbers')) });
  def('ins.code-file', 'Insert Code from File', 'file-code', {
    run: async () => {
      let r;
      try { r = await pickText(); } catch (e) { return toast(e.message); }
      if (r.canceled) return;
      const d = r.docs[0], v = view();
      if (!d) return toast(r.errors[0]?.message || 'Could not read the file');
      if (d.size > MAX) return toast('That file is larger than 1 MB, so it was not inserted');
      if (v) commit(v, insertFence(snap(v), langFromPath(d.path), d.text.replace(/\n$/, '')));
    },
  });
  def('ins.math-inline', 'Inline Math', 'function-square', { run: () => { const v = view(); if (v) commit(v, insertMathInline(snap(v))); } });
  def('ins.math-block', 'Display Math', 'sigma', { run: () => { const v = view(); if (v) commit(v, insertMathBlock(snap(v))); } });
  def('ins.equation-editor', 'Equation Editor', 'pencil-line', { run: () => {
    const v = view(); if (!v) return;
    const r = v.state.selection.main, text = v.state.sliceDoc(r.from, r.to).trim().replace(/^\$+|\$+$/g, '').trim();
    openEquationDialog({ openDialog, toast }, { text, onInsert: (mode, tex) => { const w = view(); if (w) commit(w, mode === 'inline' ? insertMathInline(snap(w), tex) : insertMathBlock(snap(w), tex)); setTimeout(() => { const x = view(); if (x) x.focus(); }, 0); } });
  } });

  let shown = false, prev = null;
  const sync = () => {
    const b = !!block();
    if (b !== shown) {
      shown = b;
      try { if (b) contextual.show('code', { label: 'Code', groups: TAB }); else contextual.hide('code'); } catch (e) { console.error('[code-tools]', e.message); }
    }
    if (b !== prev) { prev = b; BLOCK_IDS.forEach((id) => commands.invalidate(id)); }
  };
  onEditorActivity(sync);
  store.subscribe((s) => s.ui.mode, sync);
}
