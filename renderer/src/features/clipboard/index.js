// Clipboard: Cut/Copy/Paste, Paste as Plain Text/Markdown, Copy as Markdown/HTML/Rich Text. Ctrl+V follows editor.pasteMode.
import { render } from '../../core/markdown/renderer.js';
import { htmlToMarkdown } from '../../core/clipboard/to-markdown.js';
import { isUrl, asLink, normalize, sliceLines } from '../../core/clipboard/text.js';
import * as clip from '../../services/clipboard-client.js';
import { getSetting } from '../../services/settings-client.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';

const NO_SRC = 'Needs an open document in Source or Split mode';
const NO_SEL = 'Select some text first';
const NO_TXT = 'The clipboard has no text';
const IDS = ['edit.cut', 'edit.copy', 'edit.copy-md', 'edit.copy-html', 'edit.copy-rich', 'edit.paste', 'edit.paste-plain', 'edit.paste-md'];

export function register(ctx) {
  const { commands, store, services: { documents }, ui } = ctx;
  const src = document.getElementById('src');
  const view = () => documents.editorRun('view') || null;
  const srcReady = () => !!view() && store.get().ui.mode !== 'preview';
  const srcHas = () => srcReady() && view().state.selection.ranges.some((r) => !r.empty);
  const pvSel = () => {
    const s = window.getSelection(), p = document.getElementById('prev');
    return s && !s.isCollapsed && p && p.contains(s.anchorNode) && p.contains(s.focusNode) ? s : null;
  };
  const hasSel = () => !!pvSel() || srcHas();
  const entry = () => documents.getEntry(store.get().documents.activeId);

  // Current selection as { md: Markdown source, text: plain text }; from the preview, the source lines of the touched blocks.
  function pick() {
    const s = pvSel();
    if (s) {
      const e = entry(), r = s.getRangeAt(0);
      const bs = [...document.getElementById('prev').querySelectorAll('[data-src-line]')].filter((b) => !b.parentElement.closest('[data-src-line]') && r.intersectsNode(b));
      if (!bs.length || !e) return null;
      return { md: sliceLines(e.doc.text, Math.min(...bs.map((b) => +b.dataset.srcLine)), Math.max(...bs.map((b) => +b.dataset.srcEnd))), text: s.toString() };
    }
    if (!srcHas()) return null;
    const v = view(), t = v.state.selection.ranges.filter((r) => !r.empty).map((r) => v.state.sliceDoc(r.from, r.to)).join('\n');
    return { md: t, text: t };
  }
  const htmlOf = (md) => {
    const e = entry();
    return render(md, { profile: (e && e.profile) || getSetting('markdown.defaultProfile') }).html.replace(/ data-src-(?:line|end)="\d+"/g, '');
  };

  function plan(v, kind, text, html) {
    text = normalize(text);
    const link = kind === 'auto' && getSetting('editor.pasteUrlAsLink') !== false && isUrl(text) && v.state.selection.ranges.some((r) => !r.empty);
    const conv = !link && !!html && (kind === 'md' || (kind === 'auto' && getSetting('editor.pasteMode') === 'smart'));
    const out = link ? text.trim() : (conv && htmlToMarkdown(html)) || text;
    return out ? { out, link, conv } : null;
  }
  function insert(v, text, link) {
    const spec = v.state.changeByRange((r) => {
      const s = (link && !r.empty && asLink(v.state.sliceDoc(r.from, r.to), text)) || text;
      return { changes: { from: r.from, to: r.to, insert: s }, range: v.state.selection.constructor.cursor(r.from + s.length) };
    });
    v.dispatch({ ...spec, userEvent: 'input.paste', scrollIntoView: true });
    v.focus();
  }
  const paste = (kind) => async () => {
    const v = view();
    if (!v) return;
    const [text, html] = await Promise.all([clip.readText(), kind === 'plain' ? '' : clip.readHtml()]);
    const p = plan(v, kind, text, html);
    if (p) insert(v, p.out, p.link); else ui.toast(NO_TXT);
  };
  const copy = (fn, msg) => async () => {
    const p = pick();
    if (!p) return;
    await fn(p);
    if (msg) ui.toast(msg);
  };

  const def = (id, title, icon, shortcut, enabled, reason, run) => commands.register({ id, title, icon, group: 'Clipboard', shortcut, enabled, reason, run });
  def('edit.cut', 'Cut', 'scissors', 'Ctrl+X', srcHas, NO_SEL, async () => {
    const v = view(), p = pick(), doc = v && v.state.doc;
    if (!p || !srcHas()) return;
    await clip.writeText(p.text);
    if (v.state.doc !== doc) return;
    v.dispatch({ ...v.state.replaceSelection(''), userEvent: 'delete.cut', scrollIntoView: true });
    v.focus();
  });
  def('edit.copy', 'Copy', 'copy', 'Ctrl+C', hasSel, NO_SEL, copy((p) => clip.writeText(p.text)));
  def('edit.copy-md', 'Copy as Markdown', 'copy', '', hasSel, NO_SEL, copy((p) => clip.writeText(p.md), 'Copied as Markdown'));
  def('edit.copy-html', 'Copy as HTML', 'code', '', hasSel, NO_SEL, copy((p) => clip.writeText(htmlOf(p.md)), 'Copied as HTML'));
  def('edit.copy-rich', 'Copy as Rich Text', 'type', '', hasSel, NO_SEL, copy((p) => clip.writeRich(htmlOf(p.md), p.text), 'Copied as Rich Text'));
  def('edit.paste', 'Paste', 'clipboard-paste', 'Ctrl+V', srcReady, NO_SRC, paste('auto'));
  def('edit.paste-plain', 'Paste as Plain Text', 'clipboard-type', 'Ctrl+Shift+V', srcReady, NO_SRC, paste('plain'));
  def('edit.paste-md', 'Paste as Markdown', 'clipboard-paste', '', srcReady, NO_SRC, paste('md'));

  if (src) {
    // Ctrl+V: native plain paste unless smart conversion or URL-over-selection applies.
    src.addEventListener('paste', (e) => {
      const v = view(), cd = e.clipboardData;
      if (!v || !cd) return;
      const p = plan(v, 'auto', cd.getData('text/plain'), cd.getData('text/html'));
      if (!p || !(p.link || p.conv)) return;
      e.preventDefault();
      e.stopPropagation();
      insert(v, p.out, p.link);
    }, true);
    src.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'v' && commands.canRun('edit.paste-plain')) {
        e.preventDefault();
        e.stopPropagation();
        commands.execute('edit.paste-plain');
      }
    }, true);
  }

  let prev = {}, q = 0;
  const sync = () => {
    q = 0;
    for (const id of IDS) {
      const s = String(commands.canRun(id));
      if (s !== prev[id]) { prev[id] = s; commands.invalidate(id); }
    }
  };
  const queue = () => { if (!q) q = requestAnimationFrame(sync); };
  onEditorActivity(queue);
  document.addEventListener('selectionchange', queue);
  store.subscribe((s) => s.ui.mode, queue);
}
