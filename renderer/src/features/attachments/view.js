// Attachments panel and Manage Attachments dialog: assets the document references plus the files of its asset folders.
import { refs, usage, resolveUrl, pathKey, urlFor, humanSize } from '../../core/text/attach.js';
import { imageMd } from '../../core/text/image-link.js';
import * as I from '../../services/image-client.js';
import * as W from '../../services/workspace-client.js';
import { reveal } from '../../services/doc-client.js';

const dirOf = (p) => p.replace(/[\\/][^\\/]*$/, '');
const posix = (p) => p.replace(/\\/g, '/');
const ICONS = { image: 'image', audio: 'music', video: 'video', pdf: 'file-text' };
const NO_DOC = 'Save the document first so attachments have a place next to it.';
const live = new Set();
const kickAll = () => live.forEach((f) => f());

export function docInfo({ store, services: { documents: D } }) {
  D.editorRun('flush');
  const s = store.get(), t = s.documents.tabs.find((x) => x.id === s.documents.activeId), e = t && D.getEntry(t.id);
  return { path: (t && t.path) || '', text: e ? e.doc.text : '' };
}

function folders(settings, doc) {
  const name = doc.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '').replace(/[<>:"/\\|?*]/g, '_'), base = posix(dirOf(doc));
  const rel = (p) => { const r = String(p || '').replace(/\{doc\}/g, name).replace(/\\/g, '/').replace(/\/+$/, ''); return r && !r.startsWith('/') && !/^[a-zA-Z]:/.test(r) && !r.split('/').includes('..') ? `${base}/${r}` : ''; };
  return [...new Set([rel(settings.get('images.assetDir') || 'assets'), rel(settings.get('attachments.folder') || 'assets'), settings.get('images.attachDir')].filter(Boolean))];
}

export function createAttachments(ctx) {
  const { store, settings, commands, ui: { h, icon, kit, runCommand, openDialog, toast } } = ctx;
  const view = () => ctx.services.documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';

  function create() {
    let seq = 0, stale = true, timer = 0;
    const body = h('div', { class: 'att__b' }), el = h('div', { class: 'att' }, body);
    const msg = (t) => h('div', { class: 'att__m' }, t);
    const btn = (id, ic, label, it, off) => h('button', { type: 'button', class: 'tbtn', title: off || label, 'aria-label': label, disabled: !!off, onclick: () => runCommand(id, { path: it.path }) }, icon(ic));
    const broken = (t = 'File not found') => h('span', { class: 'att__th att__ic att__bad', title: t }, icon('triangle-alert'));
    const thumb = (it) => {
      if (!it.exists) return broken();
      if (!it.thumb) return h('span', { class: 'att__th att__ic' }, icon(ICONS[it.type] || 'file-text'));
      const img = h('img', { class: 'att__th', src: it.thumb, alt: '', loading: 'lazy' });
      img.addEventListener('error', () => img.replaceWith(broken('Image could not be loaded')));
      return img;
    };
    const row = (it) => {
      const gone = it.exists ? '' : 'The file is missing', rn = commands.get('attachments.rename');
      return h('div', { class: 'att__r' + (it.exists ? '' : ' is-bad'), title: it.path },
        thumb(it),
        h('div', { class: 'att__i' }, h('b', { class: 'att__n' }, it.name),
          h('small', {}, it.exists ? `${it.type} · ${humanSize(it.size)} · ${it.count ? `used ${it.count}×` : 'not used'}` : `Missing · referenced ${it.count}×`)),
        it.exists && !it.count ? h('span', { class: 'att__f' }, 'Unused') : it.exists ? null : h('span', { class: 'att__f att__f--bad' }, 'Missing'),
        h('div', { class: 'att__a' },
          btn('attachments.insert', 'plus', 'Insert at Caret', it, gone || (ready() ? '' : 'Needs an open document in Source or Split mode')),
          btn('attachments.reveal', 'folder-open', 'Show in Folder', it, gone),
          btn('attachments.rename', 'pencil', 'Rename', it, (rn && rn.reason) || 'Not available yet'),
          btn('attachments.delete', 'trash-2', 'Delete', it, gone)));
    };
    function paint(items) {
      const unused = items.filter((i) => i.exists && !i.count).length, miss = items.filter((i) => !i.exists).length;
      body.replaceChildren(kit.lbl(`${items.length} files · ${unused} unused · ${miss} missing`), ...(items.length ? items.map(row) : [msg('No attachments yet. Use Add Attachment or paste an image.')]));
    }
    async function refresh() {
      stale = false;
      const my = ++seq, d = docInfo(ctx);
      if (!d.path) return body.replaceChildren(msg('Save the document to see its attachments.'));
      const dir = dirOf(d.path), u = usage(d.text, dir);
      try {
        const r = await I.listAssets({ paths: [...new Set(refs(d.text).map((x) => resolveUrl(dir, x.url)))].slice(0, 500), dirs: folders(settings, d.path) });
        if (my !== seq) return;
        paint(r.items.map((i) => ({ ...i, count: u.get(pathKey(i.path)) || 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)));
      } catch (e) { if (my === seq) body.replaceChildren(msg((e && e.message) || 'Attachments could not be loaded.')); }
    }
    const kick = (ms = 0) => { stale = true; clearTimeout(timer); timer = setTimeout(() => { if (el.isConnected) refresh(); else if (!el.isConnected && el.dataset.seen) live.delete(kick); }, ms); };
    store.subscribe((s) => s.documents.activeId, () => kick());
    store.subscribe((s) => s.documents.tabs.map((t) => (t.dirty ? 1 : 0) + (t.path || '')).join(''), () => kick(700));
    store.subscribe((s) => s.ui.mode, () => kick(100));
    live.add(kick);
    return { el, render: () => { el.dataset.seen = '1'; live.add(kick); if (stale) refresh(); return el; }, kick };
  }

  const panel = create();
  const need = () => { const d = docInfo(ctx); if (!d.path) toast(NO_DOC); return d.path ? d : null; };
  const def = (id, title, icon2, extra) => commands.register({ id, title, icon: icon2, group: 'Attachments', ...extra });

  def('attachments.add', 'Add Attachment', 'upload', {
    run: async () => {
      const d = need();
      if (!d) return;
      const f = await I.pickImage({ kind: 'asset' }).catch((e) => toast((e && e.message) || 'That file cannot be used.'));
      if (!f || f.canceled) return;
      try { const r = await I.copyIn({ src: f.path, kind: 'asset', docPath: d.path, dir: settings.get('attachments.folder') || 'assets' }); toast(`Added ${r.name}`); } catch (e) { toast((e && e.message) || 'Could not add the file.'); }
      kickAll();
    },
  });
  def('attachments.refresh', 'Refresh Attachments', 'refresh-cw', { run: () => kickAll() });
  def('attachments.manage', 'Manage Attachments', 'paperclip', {
    run: () => {
      const m = create(), dlg = openDialog({ title: 'Manage Attachments', icon: 'paperclip', width: 640, cls: 'att-dlg', body: m.render(), buttons: [{ label: 'Add Attachment', onClick: () => { runCommand('attachments.add'); return false; } }, { label: 'Close', primary: true }] });
      return dlg;
    },
  });
  def('attachments.insert', 'Insert Attachment at Caret', 'plus', {
    enabled: ready, reason: 'Needs an open document in Source or Split mode',
    run: ({ path }) => {
      const d = need(), v = view();
      if (!d || !v) return;
      const url = urlFor(dirOf(posix(d.path)), posix(path)), name = path.replace(/^.*[\\/]/, '');
      if (!url) return toast('That file is on another drive, so no relative path exists.');
      const img = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(name), { from, to } = v.state.selection.main;
      const md = imageMd({ alt: img ? name.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ') : name, url, kind: img ? 'image' : 'link' });
      v.dispatch({ changes: { from, to, insert: md }, selection: { anchor: from + md.length }, userEvent: 'input.image', scrollIntoView: true });
      v.focus();
    },
  });
  def('attachments.rename', 'Rename Attachment', 'pencil', {
    run: async ({ path }) => {
      const oldName = path.replace(/^.*[\\/]/, '');
      const input = h('input', { type: 'text', class: 'input', value: oldName, spellcheck: 'false', 'aria-label': 'New attachment name' });
      let dlg;
      const go = async () => {
        const newName = input.value.trim();
        if (!newName || newName === oldName) return dlg.close();
        dlg.close();
        try {
          const r = await W.rename(path, newName);
          ctx.services.bus?.emit('fs:willRenameOrMove', [{ from: path, to: r.path }]);
          kickAll();
        } catch (e) {
          toast((e && e.message) || 'The attachment could not be renamed.');
        }
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      dlg = openDialog({
        title: 'Rename Attachment', icon: 'pencil', width: 440, focus: 'input',
        body: h('div', { class: 'lv-files' }, h('div', { style: { marginBottom: '8px' } }, `Rename “${oldName}”:`), input),
        buttons: [{ label: 'Cancel' }, { label: 'Rename', primary: true, onClick: () => { go(); return false; } }],
      });
      input.setSelectionRange(0, oldName.lastIndexOf('.') > 0 ? oldName.lastIndexOf('.') : oldName.length);
    },
  });
  def('attachments.delete', 'Delete Attachment', 'trash-2', {
    run: async ({ path }) => {
      const d = docInfo(ctx), n = d.path ? usage(d.text, dirOf(d.path)).get(pathKey(path)) || 0 : 0;
      if (n) {
        const ok = await new Promise((res) => openDialog({ title: 'Attachment In Use', icon: 'triangle-alert', width: 440, body: `“${path.replace(/^.*[\\/]/, '')}” is referenced ${n}× in this document. Deleting it moves the file to the trash and leaves those references broken.`, buttons: [{ label: 'Cancel' }, { label: 'Move to Trash', primary: true }], onClose: (r) => res(r === 'Move to Trash') }));
        if (!ok) return;
      }
      try {
        const r = await W.del([path]);
        const bad = r.results && r.results.find((x) => x.error);
        if (bad) toast(bad.error.message || bad.error);
      } catch (e) { toast((e && e.message) || 'Could not delete the file.'); }
      kickAll();
    },
  });
  return panel;
}
