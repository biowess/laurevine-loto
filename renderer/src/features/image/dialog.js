// Insert Image / Local Asset dialog: file, alt text, title, width, storage strategy and preview.
import * as I from '../../services/image-client.js';
import { selectField } from '../../ui/kit/select.js';
import { mediaKind } from '../../core/text/image-link.js';

const STRATS = [['original', 'Reference the Original File'], ['assets', 'Copy to the Document’s Asset Folder'], ['custom', 'Copy to an Attachment Folder']];
let uid = 0;

export function openImageDialog(ctx, { kind, file, alt, saved, onInsert, paste, media }) {
  const { ui: { h, openDialog }, settings } = ctx, name = `img-st-${++uid}`;
  let cur = null;
  const text = (cls, label, v = '', ph = '') => h('input', { type: 'text', class: cls, 'aria-label': label, placeholder: ph, value: v });
  const row = (label, ...c) => h('div', { class: 'img-row' }, h('span', { class: 'img-lbl' }, label), ...c);
  const err = h('p', { class: 'img-err', role: 'alert' });
  const path = text('img-in', 'File', '', 'Choose a file…'), altIn = text('img-alt', kind === 'asset' ? 'Link text' : 'Alt text', alt || ''), title = text('img-title', 'Title', '', 'Optional');
  const width = h('input', { type: 'text', inputmode: 'numeric', class: 'img-width', 'aria-label': 'Width in pixels', placeholder: 'Auto', autocomplete: 'off' });
  width.addEventListener('input', () => { width.value = width.value.replace(/\D/g, '').slice(0, 5); });
  const dir = text('img-dir', 'Asset folder', settings.get('images.assetDir'), 'assets or {doc}.assets');
  const attach = text('img-attach', 'Attachment folder', settings.get('images.attachDir'), 'Choose a folder…');
  const embed = selectField([['link', 'Markdown link'], ['html', 'HTML player (shown with Allow inline HTML)']], 'link', { label: 'Insert as', cls: 'img-embed' });
  const askChk = h('input', { type: 'checkbox' });
  askChk.checked = !!settings.get('images.alwaysAsk');
  const img = h('img', { class: 'img-prev', alt: '' }), box = h('div', { class: 'img-box', hidden: true }, img);
  const radios = STRATS.map(([v]) => { const r = h('input', { type: 'radio', name, value: v }); r.checked = v === settings.get('images.strategy'); return r; });
  const strat = () => (radios.find((r) => r.checked) || radios[1]).value;
  const sync = () => { dir.disabled = strat() !== 'assets'; attach.disabled = strat() !== 'custom'; choose.disabled = attach.disabled; };
  const fail = (e) => { err.textContent = (e && e.message) || 'That file cannot be used.'; };
  const set = (f) => {
    if (media && mediaKind(f.name) !== media) return fail({ message: `Choose an ${media} file.` });
    cur = f; err.textContent = ''; path.value = f.path; img.src = f.preview || ''; box.hidden = !f.preview;
    if (!altIn.value && f.image) altIn.value = f.name.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ');
  };
  const browse = h('button', { type: 'button', class: 'btn', onclick: () => I.pickImage({ kind, media, defaultPath: cur && cur.path }).then((r) => { if (!r.canceled) set(r); }, fail) }, 'Browse…');
  const choose = h('button', { type: 'button', class: 'btn', onclick: () => I.pickFolder(attach.value || undefined).then((r) => { if (!r.canceled) attach.value = r.path; }, fail) }, 'Choose…');
  path.addEventListener('change', () => { const p = path.value.trim(); if (p && (!cur || cur.path !== p)) I.pickImage({ kind, media, path: p }).then(set, fail); });
  const opt = (i, ...extra) => h('div', { class: 'img-opt' }, h('label', { class: 'img-chk' }, radios[i], STRATS[i][1]), ...extra);
  const body = h('div', { class: 'img-form' },
    row('File', path, browse), box, row(kind === 'asset' ? 'Link text' : 'Alt text', altIn), row('Title', title), ...(media ? [row('Insert as', embed)] : [row('Width', width, h('span', { class: 'img-lbl' }, 'px (adds an HTML <img>)'))]),
    h('div', { class: 'img-lbl' }, 'Storage'), opt(0), opt(1, dir), opt(2, h('span', { class: 'img-pick' }, attach, choose)),
    h('p', { class: 'img-note' }, saved ? 'Links are written relative to this document, with forward slashes, so they keep working when the folder moves.' : 'This document is not saved yet; you will be asked to save it, or an absolute reference is inserted.'),
    ...(paste ? [h('label', { class: 'img-chk' }, askChk, 'Always ask where to store images (otherwise this choice is remembered for the workspace)')] : []),
    err);
  body.addEventListener('change', sync);
  sync();
  if (paste) {
    path.readOnly = true; browse.style.display = 'none';
    if (!(file && file.path)) { radios[0].disabled = true; if (radios[0].checked) radios[1].checked = true; sync(); }
  }
  if (file) set(file);
  const go = async (api) => {
    if (!cur) return fail({ message: 'Choose a file.' });
    const st = { file: cur, alt: altIn.value, title: title.value, width: +width.value || 0, strategy: strat(), assetDir: dir.value.trim() || 'assets', attachDir: attach.value.trim(), embed: embed.value, ...(paste ? { ask: askChk.checked } : {}) };
    if (st.strategy === 'custom' && !st.attachDir) return fail({ message: 'Choose an attachment folder.' });
    try {
      if (await onInsert(st) !== false) api.close();
    } catch (e) { fail(e); }
  };
  openDialog({
    title: media ? `Insert ${media === 'audio' ? 'Audio' : 'Video'}` : paste ? 'Paste Image' : kind === 'asset' ? 'Insert Local Asset' : 'Insert Image', icon: media === 'audio' ? 'music' : media ? 'video' : kind === 'asset' ? 'folder-input' : 'image', width: 560, cls: 'img-dlg', focus: '.img-in',
    body, buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: (api) => { go(api); return false; } }],
  });
}
