import { getSetting } from '../../services/settings-client.js';
import { baseName } from '../../core/documents/paths.js';
import { checkName, withExt, relPath } from '../../core/explorer/names.js';
import { uiActions } from '../../state/slices/ui.js';
import { openContextMenu } from '../../ui/kit/menu.js';
import * as W from '../../services/workspace-client.js';
import * as clip from '../../services/clipboard-client.js';

export function createOps(ctx, v) {
  const { ui, commands, store } = ctx, { h, icon } = ui;
  let edit = null, clipb = null, busy = false;
  const err = (e) => ui.toast((e && e.message) || 'The operation failed.', { timeout: 5000 });
  const dirOf = (p) => p.slice(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')));
  const baseDir = (p) => { const r = p && v.byPath(p); return r ? (r.dir ? r.path : dirOf(r.path)) : v.ws().root; };
  const targets = (p) => {
    const m = [...v.many()].filter((x) => v.byPath(x));
    if (typeof p === 'string') return m.length > 1 && m.includes(p) ? m : [p];
    const s = v.ws().selected;
    return m.length ? m : s ? [s] : [];
  };
  const refocus = () => { const i = v.nav().findIndex((r) => r.path === v.ws().selected && !r.pin); if (i >= 0) v.select(i, true); };
  const finish = (back) => { edit = null; v.draw(); if (back) refocus(); };

  async function commit(inp, check, show) {
    const e = edit, m = check();
    if (busy) return;
    if (m) return show(m);
    const name = withExt(inp.value, e.mode, getSetting('files.newExtension'));
    if (e.mode === 'rename' && name === baseName(e.path)) return finish(true);
    busy = true;
    try {
      const r = e.mode === 'rename' ? await W.rename(e.path, name) : e.mode === 'file' ? await W.createFile(e.dir, name) : await W.createFolder(e.dir, name);
      edit = null;
      if (e.mode === 'rename') v.moved([[e.path, r.path]]);
      await v.refresh();
      await v.reveal(r.path);
      if (e.mode === 'file') v.openPath(r.path);
    } catch (x) { show((x && x.message) || 'The name was rejected.'); inp.focus(); } finally { busy = false; }
  }

  function field() {
    const e = edit, self = e.mode === 'rename' ? baseName(e.path) : '';
    const msg = h('div', { class: 'ex-err', role: 'alert' });
    msg.hidden = true;
    const inp = h('input', {
      class: 'ex-edit', value: e.value, spellcheck: 'false', 'aria-label': e.mode === 'rename' ? 'New name' : e.mode === 'file' ? 'New file name' : 'New folder name',
      oninput: () => { e.value = inp.value; show(check()); },
      onkeydown: (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') { ev.preventDefault(); commit(inp, check, show); } else if (ev.key === 'Escape') { ev.preventDefault(); finish(true); }
      },
      onblur: () => setTimeout(() => { if (edit === e && !busy && inp.isConnected) finish(false); }),
      onclick: (ev) => ev.stopPropagation(), ondblclick: (ev) => ev.stopPropagation(), oncontextmenu: (ev) => ev.stopPropagation(),
    });
    const check = () => checkName(withExt(inp.value, e.mode, getSetting('files.newExtension')), (v.cache().get(e.dir) || []).map((x) => x.name), self);
    const show = (m) => { msg.textContent = m || ''; msg.hidden = !m; inp.setAttribute('aria-invalid', String(!!m)); };
    return h('span', { class: 'ex-editbox' }, inp, msg);
  }

  const draft = (depth) => h('div', { class: 'md-row ex-draft', style: { paddingLeft: 10 + depth * 14 + 'px' } }, h('span', { class: 'ex-chev' }), icon(edit.mode === 'folder' ? 'folder' : 'file'), field());

  function focus() {
    const i = document.querySelector('.ex-edit');
    if (!i) return;
    i.focus();
    if (edit.fresh) { edit.fresh = false; const d = i.value.lastIndexOf('.'); i.setSelectionRange(0, edit.mode !== 'folder' && d > 0 ? d : i.value.length); }
    i.scrollIntoView({ block: 'nearest' });
  }

  async function create(mode, p) {
    const w = v.ws();
    if (!w.root) return;
    const dir = baseDir(typeof p === 'string' ? p : w.selected);
    store.dispatch(uiActions.panel('left', { open: true, view: 'files' }));
    if (dir !== w.root) { await v.reveal(dir); await v.toggle(dir, true); }
    edit = { mode, dir, value: mode === 'file' ? `untitled.${getSetting('files.newExtension')}` : 'New Folder', fresh: true };
    v.draw();
  }

  async function rename(p) {
    const t = targets(p);
    if (t.length !== 1 || !(await v.reveal(t[0]))) return;
    edit = { mode: 'rename', path: t[0], dir: dirOf(t[0]), value: baseName(t[0]), fresh: true };
    v.draw();
  }

  async function duplicate(p) {
    let last;
    for (const x of targets(p)) try { last = (await W.duplicate(x)).path; } catch (e) { err(e); }
    await v.refresh();
    if (last) v.reveal(last);
  }

  async function del(p) {
    const t = targets(p);
    if (!t.length) return;
    try {
      const r = await W.del(t);
      if (r.canceled) return;
      v.deleted(t.filter((_, i) => r.results[i] && !r.results[i].error));
      const bad = r.results.filter((x) => x.error);
      if (bad.length) err(bad[0].error);
    } catch (e) { err(e); }
    v.clear();
    await v.refresh();
  }

  const stash = (mode, p) => { const t = targets(p); if (t.length) { clipb = { mode, paths: t }; commands.invalidate('explorer.paste'); } };

  async function transfer(mode, paths, dir) {
    let ok = false;
    try {
      const r = await (mode === 'move' ? W.move : W.copy)(paths, dir);
      if (r.canceled) return false;
      ok = true;
      const bad = r.results.filter((x) => x.error);
      if (bad.length) err({ message: bad[0].error.message + (bad.length > 1 ? ` (+${bad.length - 1} more)` : '') });
      if (mode === 'move') v.moved(r.results.map((x, k) => [paths[k], x.path]).filter(([a, b]) => b && b !== a));
    } catch (e) { err(e); }
    await v.refresh();
    return ok;
  }

  async function paste(p) {
    if (!clipb) return;
    const { mode, paths } = clipb, dir = baseDir(typeof p === 'string' ? p : v.ws().selected);
    if (await transfer(mode === 'cut' ? 'move' : 'copy', paths, dir) && mode === 'cut') { clipb = null; commands.invalidate('explorer.paste'); }
  }

  function copyPath(p, rel) {
    const root = v.ws().root, t = targets(p);
    if (t.length) clip.writeText(t.map((x) => (rel ? relPath(root, x) : x)).join('\n')).then(() => ui.toast('Path copied.')).catch(err);
  }

  const findIn = () => store.dispatch(uiActions.panel('left', { open: true, view: 'search' }));

  function key(e) {
    const mod = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
    const id = e.key === 'F2' ? 'explorer.rename' : e.key === 'Delete' ? 'explorer.delete' : mod ? { c: 'explorer.copy', x: 'explorer.cut', v: 'explorer.paste', d: 'explorer.duplicate' }[e.key.toLowerCase()] : null;
    if (!id) return false;
    e.preventDefault();
    ui.runCommand(id);
    return true;
  }

  function menu(e) {
    const w = v.ws(), el = e.target.closest('.ex-row');
    if (!w.root || e.target.closest('input')) return;
    let r = null;
    if (el) { const i = +el.dataset.i; r = v.nav()[i]; if (!v.many().has(r.path)) v.select(i, true); }
    const arg = r ? r.path : w.root, multi = !!r && v.many().size > 1;
    const it = (label, id, x) => ({ label, onSelect: () => ui.runCommand(id, arg), ...x });
    const paste = it('Paste', 'explorer.paste', { disabled: !clipb, hint: 'Ctrl+V' });
    openContextMenu(e, (r ? [
      multi ? null : it(r.dir ? (r.open ? 'Collapse' : 'Expand') : 'Open', 'explorer.open'),
      multi || r.dir ? null : it('Open to the Side', 'explorer.open-side'),
      '-', it('New File', 'explorer.new-file'), it('New Folder', 'explorer.new-folder'), '-',
      multi ? null : it('Rename', 'explorer.rename', { hint: 'F2' }), it('Duplicate', 'explorer.duplicate', { hint: 'Ctrl+D' }), it('Delete', 'explorer.delete', { hint: 'Del' }),
      multi && v.many().size === 2 && v.nav().filter((x) => v.many().has(x.path)).every((x) => !x.dir) ? { label: 'Compare Selected Files', onSelect: () => ui.runCommand('cmp.compare-paths', [...v.many()]) } : null, '-',
      { label: 'Export…', onSelect: () => ui.runCommand('pub.export-paths', multi ? [...v.many()] : [arg]) }, '-',
      it('Cut', 'explorer.cut', { hint: 'Ctrl+X' }), it('Copy', 'explorer.copy', { hint: 'Ctrl+C' }), paste, it('Move to…', 'explorer.move-to'), it('Copy to…', 'explorer.copy-to'), '-',
      it('Copy Path', 'explorer.copy-path'), it('Copy Relative Path', 'explorer.copy-rel-path'), it('Reveal in File Manager', 'explorer.reveal'), '-',
      multi ? null : it(v.pinned(arg) ? 'Unpin' : 'Pin', 'explorer.pin'), r.dir ? it('Find in Folder', 'explorer.find-in-folder') : null, it('Refresh', 'explorer.refresh'),
    ] : [
      it('New File', 'explorer.new-file'), it('New Folder', 'explorer.new-folder'), '-', paste, '-',
      it('Copy Path', 'explorer.copy-path'), it('Copy Relative Path', 'explorer.copy-rel-path'), it('Reveal in File Manager', 'explorer.reveal'), '-',
      { label: 'Export…', onSelect: () => ui.runCommand('pub.export-paths', [w.root]) }, '-',
      it('Find in Folder', 'explorer.find-in-folder'), it('Recover deleted…', 'explorer.recover-deleted'), it('Refresh', 'explorer.refresh'),
    ]).filter(Boolean));
  }

  return {
    get edit() { return edit; }, field, draft, focus, key, menu,
    api: {
      create, rename, duplicate, del, paste, findIn, drop: transfer, moveTo: (mode, p) => transfer(mode, targets(p)), hasClip: () => !!clipb,
      copy: (p) => stash('copy', p), cut: (p) => stash('cut', p), copyPath: (p, rel) => copyPath(p, rel),
    },
  };
}
