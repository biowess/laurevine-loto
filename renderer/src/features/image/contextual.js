// Contextual Image ribbon tab (shown while the caret is on an image in the source): alt text, width, replace, open, copy path, reveal.
import { imageAt, resolveUrl, rebuild } from '../../core/text/attach.js';
import { writeText } from '../../services/clipboard-client.js';
import { reveal, openExternal } from '../../services/doc-client.js';
import { onEditorActivity } from '../../ui/editor/editor-pane.js';
import { contextual } from '../../ui/ribbon/ribbon.js';

const NO_IMG = 'Needs the caret on an image in the Source or Split editor';
const IDS = ['img.alt', 'img.width', 'img.replace', 'img.open', 'img.copy-path', 'img.reveal'];
const TAB = [['Image', 'image', 0, '*img.alt', 'img.width', 'img.replace', 'img.open', 'img.copy-path', 'img.reveal']];
const dirOf = (p) => p.replace(/[\\/][^\\/]*$/, '');

export function mountImageTab(ctx, { view, ready, docPath }) {
  const { commands, store, ui: { h, openDialog, toast } } = ctx;
  let ms = null, mi = null;
  const cur = () => {
    const v = ready() && view();
    if (!v) return null;
    if (ms !== v.state) { ms = v.state; mi = imageAt(v.state.doc.toString(), v.state.selection.main.head); if (mi) mi.raw = v.state.sliceDoc(mi.from, mi.to); }
    return mi;
  };
  const abs = () => {
    const r = cur(), d = docPath();
    if (!r) return null;
    if (!d && !/^(file:|\/|[a-zA-Z]:)/.test(r.url)) { toast('Save the document first so the relative path can be resolved.'); return null; }
    return resolveUrl(d ? dirOf(d) : '', r.url);
  };
  const patch = (r, p) => {
    const v = view();
    if (!v || v.state.sliceDoc(r.from, r.to) !== r.raw) return toast('The image changed meanwhile; try again.');
    const md = rebuild(r, p);
    v.dispatch({ changes: { from: r.from, to: r.to, insert: md }, selection: { anchor: r.from + md.length }, userEvent: 'input.image', scrollIntoView: true });
    v.focus();
  };
  const ask = (title, input, apply) => openDialog({ title, icon: 'image', width: 420, body: h('div', { class: 'img-row' }, input), focus: 'input', buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: apply }] });
  const def = (id, title, icon, run) => commands.register({ id, title, icon, group: 'Image', enabled: () => !!cur(), reason: NO_IMG, run });
  const fail = (m) => (e) => toast((e && e.message) || m);

  def('img.alt', 'Edit Alt Text', 'text-cursor-input', () => {
    const r = cur(), input = h('input', { type: 'text', class: 'img-alt', 'aria-label': 'Alt text', value: r.alt, placeholder: 'Describe the image' });
    ask('Edit Alt Text', input, () => patch(r, { alt: input.value }));
  });
  def('img.width', 'Width', 'ruler', () => {
    const r = cur(), input = h('input', { type: 'number', class: 'img-width', 'aria-label': 'Width in pixels', min: 1, max: 10000, placeholder: 'Auto', value: r.width || '' });
    ask('Image Width (pixels, empty = auto)', input, () => patch(r, { width: Math.max(0, Math.min(10000, parseInt(input.value, 10) || 0)) }));
  });
  def('img.replace', 'Replace Image', 'replace', () => {
    const r = cur(), v = view();
    v.dispatch({ selection: { anchor: r.from, head: r.to } });
    return commands.execute('ins.image-file', { alt: r.alt });
  });
  def('img.open', 'Open Original', 'external-link', () => { const p = abs(); if (p) return openExternal(p).catch(fail('Could not open the file.')); });
  def('img.copy-path', 'Copy Path', 'copy', async () => { const p = abs(); if (p) { await writeText(p); toast('Path copied'); } });
  def('img.reveal', 'Show in Folder', 'folder-open', () => { const p = abs(); if (p) return reveal(p).catch(fail('Could not reveal the file.')); });

  let shown = false;
  const sync = () => {
    const b = !!cur();
    if (b === shown) return;
    shown = b;
    try { if (b) contextual.show('img', { label: 'Image', groups: TAB }); else contextual.hide('img'); } catch (e) { console.error('[image]', e.message); }
    IDS.forEach((id) => commands.invalidate(id));
  };
  onEditorActivity(sync);
  store.subscribe((s) => s.ui.mode, sync);
}
