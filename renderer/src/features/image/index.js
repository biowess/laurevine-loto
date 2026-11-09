// Insert > Images & Media: Image dialog, Image from File, Local Asset; reference the original or copy into an asset/attachment folder.
import { relPath, encodePath, fileUrl, imageMd, mediaHtml } from '../../core/text/image-link.js';
import { openImageDialog } from './dialog.js';
import { mountPaste } from './paste.js';
import { mountImageTab } from './contextual.js';
import * as I from '../../services/image-client.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';
const dirOf = (p) => p.replace(/[\\/][^\\/]*$/, '');

export function register(ctx) {
  const { commands, store, settings, services: { documents }, ui } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  const docPath = () => { const d = store.get().documents, t = d.tabs.find((x) => x.id === d.activeId); return (t && t.path) || ''; };

  const unsaved = () => new Promise((res) => {
    ui.openDialog({
      title: 'Document not saved', icon: 'triangle-alert', width: 440,
      body: 'Image links are stored relative to the document. Save it first, or insert an absolute reference to the original file (it breaks when the file or the folder moves).',
      buttons: [{ label: 'Cancel' }, { label: 'Insert absolute reference' }, { label: 'Save first', primary: true }],
      onClose: (r) => res(r === 'Save first' ? 'save' : r === 'Insert absolute reference' ? 'abs' : 'cancel'),
    });
  });

  async function insert(kind, st) {
    let doc = docPath(), abs = false;
    if (!doc) {
      const c = await unsaved();
      if (c === 'cancel') return false;
      if (c === 'save') { await commands.execute('file.save'); doc = docPath(); if (!doc) return false; } else abs = true;
    }
    let target = st.file.path;
    if (!abs && st.strategy !== 'original') {
      const r = await I.copyIn({ src: st.file.path, kind, docPath: doc, dir: st.assetDir, ...(st.strategy === 'custom' ? { destDir: st.attachDir } : {}) });
      target = r.path;
    }
    const rel = !abs && relPath(dirOf(doc), target);
    const url = rel ? encodePath(rel) : fileUrl(target);
    const v = view();
    if (!v) return false;
    const { from, to } = v.state.selection.main, label = st.alt.trim() || (st.file.image ? '' : st.file.name);
    const md = st.media && st.embed === 'html' ? mediaHtml(st.media === 'audio' ? 'audio' : 'video', url, label, st.title) : imageMd({ alt: label, url, title: st.title, width: st.width, kind: st.file.image ? 'image' : 'link' });
    v.dispatch({ changes: { from, to, insert: md }, selection: { anchor: from + md.length }, userEvent: 'input.image', scrollIntoView: true });
    v.focus();
    settings.set('images.strategy', st.strategy);
    if (st.strategy === 'assets') settings.set('images.assetDir', st.assetDir);
    if (st.strategy === 'custom') settings.set('images.attachDir', st.attachDir);
    if (abs || !rel) ui.toast('Inserted an absolute file reference; it will not work on other computers or if the file moves.', { timeout: 6000 });
  }

  const open = async (kind, direct, media, pre) => {
    const v = view();
    if (!v) return;
    let file = null;
    if (direct) {
      const r = await I.pickImage({ kind, media }).catch((e) => ui.toast((e && e.message) || 'That file cannot be used.'));
      if (!r || r.canceled) return;
      file = r;
    }
    const { from, to } = v.state.selection.main;
    openImageDialog(ctx, { kind, file, alt: pre && pre.alt !== undefined ? pre.alt : v.state.sliceDoc(from, to), saved: !!docPath(), media, onInsert: (st) => insert(kind, { ...st, media }) });
  };

  const def = (id, title, icon, kind, direct) => commands.register({ id, title, icon, group: 'Insert', enabled: ready, reason: NO_EDITOR, run: (a) => open(kind, direct, undefined, a) });
  def('ins.image', 'Image', 'image', 'image', false);
  def('ins.image-file', 'From File', 'file-image', 'image', true);
  def('ins.asset', 'Local Asset', 'folder-input', 'asset', true);
  const med = (id, title, icon, media) => commands.register({ id, title, icon, group: 'Insert', enabled: ready, reason: NO_EDITOR, run: () => open('asset', true, media) });
  med('ins.audio', 'Audio', 'music', 'audio');
  med('ins.video', 'Video', 'video', 'video');
  mountPaste(ctx, { view, docPath, ready });
  mountImageTab(ctx, { view, ready, docPath });
}
