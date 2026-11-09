// Paste Image from Clipboard and drag-and-drop of images into the editor or preview.
import * as I from '../../services/image-client.js';
import { readImage } from '../../services/clipboard-client.js';
import { IMAGE_EXT, relPath, encodePath, fileUrl, imageMd } from '../../core/text/image-link.js';
import { openImageDialog } from './dialog.js';

const dirOf = (p) => p.replace(/[\\/][^\\/]*$/, '');
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp', 'image/avif': 'avif' };
const altOf = (it) => (it.path ? it.name.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ') : '');
const b64 = async (blob) => {
  const u = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const bytes = (name, ext, data) => ({ name, path: '', ext, data, image: true, preview: data.length < 7e6 ? `data:image/${ext};base64,${data}` : '' });

async function fromFile(f) {
  const p = window.loto?.pathForFile ? window.loto.pathForFile(f) : '';
  if (p) return I.pickImage({ kind: 'image', path: p });
  const ext = EXT[f.type];
  if (!ext) throw new Error('That image format is not supported.');
  return bytes(f.name || `image.${ext}`, ext, await b64(f));
}

export function mountPaste(ctx, { view, docPath, ready }) {
  const { commands, store, settings, ui } = ctx;
  const key = () => store.get().workspace.root || '-';
  const mem = () => { try { return JSON.parse(settings.get('images.wsStrategies') || '{}'); } catch { return {}; } };
  const fail = (e) => ui.toast((e && e.message) || 'The image could not be inserted.');
  const guard = () => ready() || (ui.toast('Needs an open document in Source or Split mode'), false);

  const remember = (st) => {
    const m = mem(), k = key();
    delete m[k];
    m[k] = { s: st.strategy, d: st.assetDir, a: st.attachDir };
    const ks = Object.keys(m);
    while (ks.length > 1 && JSON.stringify(m).length > 3800) delete m[ks.shift()];
    settings.set('images.wsStrategies', JSON.stringify(m));
    settings.set('images.strategy', st.strategy);
    if (st.strategy === 'assets') settings.set('images.assetDir', st.assetDir);
    if (st.strategy === 'custom') settings.set('images.attachDir', st.attachDir);
    if (st.ask !== undefined) settings.set('images.alwaysAsk', st.ask);
  };

  async function place(it, st, doc) {
    const s = st.strategy === 'original' && !it.path ? 'assets' : st.strategy;
    let target = it.path;
    if (s !== 'original') {
      const o = { docPath: doc, dir: st.assetDir, ...(s === 'custom' ? { destDir: st.attachDir } : {}) };
      target = (it.path ? await I.copyIn({ src: it.path, kind: 'image', ...o }) : await I.saveData({ data: it.data, ext: it.ext, ...o })).path;
    }
    const rel = relPath(dirOf(doc), target);
    if (!rel) ui.toast('Inserted an absolute file reference; it will not work on other computers or if the file moves.', { timeout: 6000 });
    return rel ? encodePath(rel) : fileUrl(target);
  }

  async function run(items, at) {
    const go = async (st) => {
      let doc = docPath();
      if (!doc) { await commands.execute('file.save'); doc = docPath(); if (!doc) return false; }
      const parts = [];
      for (const [i, it] of items.entries()) {
        parts.push(imageMd({ alt: i ? altOf(it) : st.alt ?? altOf(it), url: await place(it, st, doc), title: i ? '' : st.title || '', width: i ? 0 : st.width || 0 }));
      }
      const v = view();
      if (!v) return false;
      const ins = parts.join('\n\n'), n = v.state.doc.length, sel = v.state.selection.main;
      const from = Math.min(at ? at.from : sel.from, n), to = Math.min(at ? at.to : sel.to, n);
      v.dispatch({ changes: { from, to, insert: ins }, selection: { anchor: from + ins.length }, userEvent: 'input.image', scrollIntoView: true });
      v.focus();
      remember(st);
    };
    const m = mem()[key()];
    if (!settings.get('images.alwaysAsk') && m && !(m.s === 'custom' && !m.a)) {
      go({ strategy: m.s, assetDir: m.d || 'assets', attachDir: m.a || '' }).catch(fail);
      return;
    }
    openImageDialog(ctx, { kind: 'image', file: items[0], alt: altOf(items[0]), saved: !!docPath(), paste: true, onInsert: go });
  }

  commands.register({
    id: 'ins.image-paste', title: 'Paste Image', icon: 'clipboard-paste', group: 'Insert', enabled: ready, reason: 'Needs an open document in Source or Split mode',
    run: async () => {
      const data = await readImage();
      if (!data) return ui.toast('The clipboard has no image.');
      run([bytes('Clipboard image.png', 'png', data)]);
    },
  });

  const src = document.getElementById('src'), prev = document.getElementById('prev');
  if (src) {
    src.addEventListener('paste', (e) => {
      const cd = e.clipboardData, f = cd && Array.from(cd.files).find((x) => EXT[x.type]);
      if (!f || cd.getData('text/plain')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (guard()) fromFile(f).then((it) => run([it]), fail);
    }, true);
  }
  const drop = (e) => {
    const fs = Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter((f) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name));
    if (!fs.length) return;
    e.preventDefault();
    e.stopPropagation();
    if (!guard()) return;
    const v = view(), pos = v && e.currentTarget === src ? v.posAtCoords({ x: e.clientX, y: e.clientY }) : null;
    Promise.all(fs.map(fromFile)).then((items) => run(items, pos == null ? null : { from: pos, to: pos }), fail);
  };
  if (src) src.addEventListener('drop', drop, true);
  if (prev) prev.addEventListener('drop', drop, true);
}
