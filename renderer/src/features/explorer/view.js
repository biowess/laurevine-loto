import { workspaceActions } from '../../state/slices/workspace.js';
import { uiActions } from '../../state/slices/ui.js';
import { buildRows, ancestors, typeAhead, readWs, writeWs } from '../../core/explorer/tree.js';
import { baseName, samePath, isTextName } from '../../core/documents/paths.js';
import * as W from '../../services/workspace-client.js';
import { createOps } from './ops.js';
import { createFollow } from './follow.js';
import { attachDnd } from './dnd.js';
import { remap } from '../../core/explorer/move.js';

const IC = { markdown: 'file-text', image: 'image', pdf: 'file-type', media: 'film', data: 'database', file: 'file' };

export function createExplorer(ctx) {
  const { store, commands, settings, ui } = ctx, { h, icon, kit } = ui;
  const S = (k) => settings.get('explorer.' + k);
  const put = (k, v) => { try { Promise.resolve(settings.set('explorer.' + k, v)).catch(() => {}); } catch {} };
  const ws = () => store.get().workspace;
  let cache = new Map(), notes = new Map(), pins = [], filter = '', rootErr = null, recents = [], nav = [], buf = '', bufT = 0, many = new Set(), anchor = null, ft = 0;
  const RH = 26;
  let renderedRows = [], isVirt = false, virtRaf = 0;
  const sp = h('div', { class: 'ex-sp', style: { position: 'relative', width: '100%' } });

  const save = () => { const w = ws(); if (w.root) put('state', writeWs(S('state'), w.root, { expanded: w.expanded, pinned: pins })); };
  const btn = (label, cmd, arg, primary) => h('button', { type: 'button', class: 'ex-btn' + (primary ? ' is-primary' : ''), onclick: () => ui.runCommand(cmd, arg) }, label);
  const empty = (ic, title, text, ...more) => h('div', { class: 'ex-empty' }, icon(ic), h('b', {}, title), text ? h('p', {}, text) : null, ...more);
  const recentRow = (it, cmd) => h('button', { type: 'button', class: 'md-row ex-recent', title: it.root, onclick: () => cmd(it.root) }, icon('folder'), h('span', { class: 'ex-name' }, it.name), h('small', {}, it.root));

  const input = h('input', {
    class: 'ex-filter', placeholder: 'Filter files', 'aria-label': 'Filter files', spellcheck: 'false',
    oninput: () => { filter = input.value; clearTimeout(ft); ft = setTimeout(draw, 100); }, // typing stays instant; the tree repaints once input pauses
    onkeydown: (e) => {
      if (e.key === 'Escape' && input.value) { e.stopPropagation(); clearTimeout(ft); input.value = filter = ''; draw(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); select(0, true); }
    },
  });
  const filterBox = kit.box(input), head = h('div', { class: 'md-lbl ex-lbl' });
  const list = h('div', { class: 'ex-tree', role: 'tree', 'aria-label': 'Workspace files', onclick: onClick, ondblclick: onDbl, onkeydown: onKey });
  list.addEventListener('scroll', () => {
    if (isVirt) {
      cancelAnimationFrame(virtRaf);
      const sel = nav.findIndex((r) => r.path === ws().selected);
      virtRaf = requestAnimationFrame(() => paintVirtual(sel, sel < 0 ? 0 : sel));
    }
  }, { passive: true });
  const root = h('div', { class: 'ex', oncontextmenu: onMenu }, filterBox, head, list);

  const rowEl = (r, i, on, tab) => h('div', {
    class: 'md-row ex-row' + (on ? ' is-on' : '') + (r.hidden ? ' is-hidden' : ''), role: 'treeitem', title: r.path,
    'aria-level': String(r.pin ? 1 : r.depth + 1), 'aria-selected': String(on),
    'aria-expanded': r.dir && !r.pin && r.expandable !== false ? String(r.open) : null,
    tabindex: tab ? '0' : '-1', draggable: r.pin ? null : 'true', dataset: r.pin ? { path: r.path, i: String(i), pin: '1' } : { path: r.path, i: String(i) },
    style: { paddingLeft: 10 + r.depth * 14 + 'px' },
  }, r.dir && !r.pin && r.expandable !== false ? icon(r.open ? 'chevron-down' : 'chevron-right', 'ex-chev') : h('span', { class: 'ex-chev' }),
  icon(r.pin ? 'pin' : r.dir ? (r.open ? 'folder-open' : 'folder') : IC[r.icon] || 'file'), ops.edit && ops.edit.mode === 'rename' && !r.pin && ops.edit.path === r.path ? ops.field() : h('span', { class: 'ex-name' }, r.name));

  function draw() {
    const w = ws(), ok = !!w.root && !rootErr, top = list.scrollTop, act = document.activeElement;
    const hp = list.contains(act) && act.dataset.path ? [act.dataset.path, act.dataset.pin === '1'] : null;
    filterBox.hidden = head.hidden = !ok;
    nav = [];
    if (!w.root) return void list.replaceChildren(empty('folder-open', 'No folder open', 'Open a folder to browse its Markdown files.', btn('Open Folder', 'file.open-folder', undefined, true), ...(recents.length ? [kit.lbl('Recent'), ...recents.map((it) => recentRow(it, (p) => ui.runCommand('workspace.open', p)))] : [])));
    if (rootErr) return void list.replaceChildren(empty('folder-lock', rootErr.title || 'Folder unavailable', (rootErr.text ? rootErr.text + ' ' : '') + 'Check disk permissions or choose another folder.', btn('Retry', 'explorer.refresh'), btn('Open Folder', 'file.open-folder'), btn('Close Workspace', 'workspace.close')));

    head.replaceChildren(h('span', { title: w.root }, 'Workspace · ' + w.name), h('button', { type: 'button', class: 'tbtn', title: 'Close Workspace', 'aria-label': 'Close Workspace', onclick: () => ui.runCommand('workspace.close') }, icon('x')));
    const by = new Map(), f = filter.trim().toLowerCase();
    for (const l of cache.values()) for (const e of l) by.set(e.path, e);
    const pin = pins.map(([p, d]) => { const e = by.get(p); return { path: p, name: baseName(p), dir: e ? e.dir : !!d, icon: e ? e.icon : 'file', depth: 0, pin: true }; }).filter((r) => !f || r.name.toLowerCase().includes(f));
    const tree = buildRows(w.root, cache, w.expanded, filter, notes);
    const rows = [...(pin.length ? [{ label: 'Pinned' }] : []), ...pin, ...(pin.length ? [{ label: 'Files' }] : []), ...(ops.edit && ops.edit.mode !== 'rename' && ops.edit.dir === w.root ? [{ draft: true }] : []), ...tree];
    nav = rows.filter((r) => r.path);
    const sel = nav.findIndex((r) => r.path === w.selected), tab = sel < 0 ? 0 : sel, els = [];
    let k = 0;
    const makeRow = (r, i) => {
      if (r.label) return [h('div', { class: 'md-lbl' }, r.label)];
      if (r.draft) return [ops.draft(0)];
      if (r.note) return [h('div', { class: 'ex-note', style: { paddingLeft: 26 + r.depth * 14 + 'px' } }, r.note)];
      const on = i === sel || (many.has(r.path) && !r.pin);
      const res = [rowEl(r, i, on, i === tab)];
      if (ops.edit && ops.edit.mode !== 'rename' && !r.pin && ops.edit.dir === r.path) res.push(ops.draft(r.depth + 1));
      return res;
    };
    if (rows.length > 300) {
      renderedRows = rows;
      isVirt = true;
      if (!list.contains(sp)) list.replaceChildren(sp);
      paintVirtual(sel, tab);
    } else {
      renderedRows = [];
      isVirt = false;
      for (const r of rows) {
        els.push(...makeRow(r, k));
        if (!r.label && !r.draft && !r.note) k++;
      }
      if (!tree.length && !rows.some((r) => r.draft)) els.push(!cache.has(w.root) ? empty('loader', 'Loading workspace…', 'Reading folder contents and indexing documents.') : empty('folder', filter ? 'No matching files' : 'This folder is empty.', filter ? 'No files match your filter. Press Escape or clear the filter to view all files.' : 'No Markdown documents found. Create a new file or add notes to this directory.'));
      list.replaceChildren(...els);
    }
    list.scrollTop = top;
    if (hp) { const j = nav.findIndex((r) => r.path === hp[0] && !!r.pin === hp[1]); list.querySelectorAll('.ex-row')[j < 0 ? tab : j]?.focus({ preventScroll: true }); }
    ops.focus();
  }

  function paintVirtual(sel, tab) {
    const n = renderedRows.length, y = list.scrollTop, hgt = list.clientHeight || 500;
    sp.style.height = `${n * RH}px`;
    const a = Math.max(0, Math.floor(y / RH) - 4), b = Math.min(n, Math.ceil((y + hgt) / RH) + 6);
    const nodes = [];
    for (let i = a; i < b; i++) {
      const r = renderedRows[i];
      if (!r) continue;
      const on = i === sel || (many.has(r.path) && !r.pin);
      let el = r.label ? h('div', { class: 'md-lbl' }, r.label) : r.note ? h('div', { class: 'ex-note', style: { paddingLeft: 26 + r.depth * 14 + 'px' } }, r.note) : rowEl(r, i, on, i === tab);
      el.style.position = 'absolute';
      el.style.top = `${i * RH}px`;
      el.style.left = '0';
      el.style.right = '0';
      nodes.push(el);
    }
    sp.replaceChildren(...nodes);
  }

  function select(i, focus, keep) {
    const r = nav[i];
    if (!r) return;
    store.dispatch(workspaceActions.select(r.path));
    if (!keep) { many = new Set([r.path]); anchor = r.path; }
    list.querySelectorAll('.ex-row').forEach((el, j) => {
      const on = j === i || (many.has(nav[j].path) && !nav[j].pin);
      el.classList.toggle('is-on', on); el.setAttribute('aria-selected', String(on)); el.tabIndex = j === i ? 0 : -1;
      if (j === i && focus) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
    });
  }

  async function load(dir) {
    try {
      const r = await W.listDir(dir, { showHidden: !!S('showHidden'), sort: S('sortBy'), foldersFirst: true });
      cache.set(dir, r.entries); notes.delete(dir);
      if (dir === ws().root) rootErr = null;
    } catch (e) {
      const m = (e && e.message) || 'This folder cannot be read.';
      cache.delete(dir); notes.set(dir, m);
      if (dir === ws().root) rootErr = { title: /access|permission/i.test(`${e && e.code} ${m}`) ? 'Access denied' : 'Cannot open folder', text: m };
    }
  }

  async function toggle(path, on) {
    const open = ws().expanded.includes(path);
    if (on === open) return;
    store.dispatch(workspaceActions.toggle(path));
    draw();
    if (!open && !cache.has(path)) { await load(path); draw(); }
    save();
  }

  async function refresh() {
    const w = ws();
    if (!w.root) return;
    await Promise.all([...new Set([w.root, ...cache.keys(), ...w.expanded])].map(load));
    draw();
  }

  const loadRecents = async () => { try { recents = (await W.recent()).items; } catch { recents = []; } };

  async function enter(wk) {
    cache = new Map(); notes = new Map(); filter = input.value = ''; rootErr = null;
    const st = readWs(S('state'), wk.root);
    store.dispatch(workspaceActions.set(wk.root, wk.name));
    store.dispatch(workspaceActions.expanded(st.expanded));
    pins = st.pinned;
    put('lastWorkspace', wk.root);
    draw();
    await Promise.all([wk.root, ...st.expanded].map(load));
    draw();
    loadRecents();
  }

  async function open(path, quiet) {
    let r;
    try { r = await W.open(path); } catch (e) {
      if (quiet) put('lastWorkspace', ''); else ui.toast((e && e.message) || 'The folder could not be opened.', { timeout: 5000 });
      return false;
    }
    if (r.canceled) return false;
    await enter(r.workspace);
    return true;
  }

  async function close() {
    try { await W.close(); } catch {}
    store.dispatch(workspaceActions.close());
    cache = new Map(); notes = new Map(); pins = []; filter = input.value = ''; rootErr = null;
    put('lastWorkspace', '');
    await loadRecents();
    draw();
  }

  async function pick() {
    let items = [];
    try { items = (await W.list()).items; } catch {}
    if (!items.length) return ui.toast('No workspaces yet. Use Open Folder.');
    const d = ui.openDialog({ title: 'Open Workspace', icon: 'folder-open', width: 460, body: h('div', { class: 'ex-pick' }, ...items.map((it) => recentRow(it, (p) => { d.close(); open(p); }))), buttons: [{ label: 'Cancel' }] });
  }

  const activePath = () => { const id = store.get().documents.activeId, e = id && ctx.services.documents.getEntry(id); return e ? e.doc.path : null; };
  const contains = (p) => !!ws().root && !!ancestors(ws().root, p);

  async function reveal(p) {
    const w = ws(), anc = w.root && ancestors(w.root, p);
    if (!anc) return false;
    store.dispatch(uiActions.panel('left', { open: true, view: 'files' }));
    filter = input.value = '';
    store.dispatch(workspaceActions.expanded([...new Set([...w.expanded, ...anc])]));
    await Promise.all(anc.filter((a) => !cache.has(a)).map(load));
    store.dispatch(workspaceActions.select(p));
    draw(); save();
    setTimeout(() => {
      if (!isVirt) return select(nav.findIndex((r) => samePath(r.path, p) && !r.pin), true);
      const k = renderedRows.findIndex((r) => r.path && samePath(r.path, p) && !r.pin);
      if (k >= 0) { list.scrollTop = Math.max(0, k * RH - (list.clientHeight || 500) / 2); const n = nav.findIndex((r) => samePath(r.path, p) && !r.pin); paintVirtual(n, n); }
    });
    return true;
  }

  const confirmExternal = (name) => new Promise((resolve) => {
    let ok = false;
    ui.openDialog({ title: 'Open With Another App', icon: 'external-link', width: 420, body: `Open "${name}" with the default application on this computer?`, buttons: [{ label: 'Cancel' }, { label: 'Open', primary: true, onClick: () => { ok = true; } }], onClose: () => resolve(ok) });
  });

  async function openItem(r, side) {
    if (!r) return;
    if (r.dir) return r.pin ? reveal(r.path) : r.expandable === false ? undefined : toggle(r.path);
    if (isTextName(r.name)) {
      await commands.execute('file.open-recent', r.path);
      if (side) await commands.execute('group.open-side', r.path);
    } else if (side) ui.toast('Only text documents open in the editor.');
    else if (await confirmExternal(r.name)) W.openExternal(r.path).catch((e) => ui.toast((e && e.message) || 'The file could not be opened.'));
  }

  const target = (p) => (typeof p === 'string' ? p : ws().selected);
  const byPath = (p) => nav.find((r) => r.path === p);
  const openPath = (p, side) => openItem(byPath(target(p)), side);
  function togglePin(p) {
    p = target(p);
    const r = p && byPath(p);
    if (!r) return;
    const i = pins.findIndex(([x]) => samePath(x, p));
    if (i >= 0) pins.splice(i, 1); else pins.push([p, r.dir ? 1 : 0]);
    save(); draw();
  }

  function onClick(e) {
    const el = e.target.closest('.ex-row');
    if (!el) return;
    const i = +el.dataset.i, r = nav[i];
    if (e.shiftKey) return extend(i);
    if (e.ctrlKey || e.metaKey) {
      many = new Set(many);
      if (!many.delete(r.path)) many.add(r.path);
      anchor = r.path;
      return select(i, true, true);
    }
    select(i, true);
    if (r.dir) { if (!r.pin && r.expandable !== false) toggle(r.path); } else if (isTextName(r.name)) openItem(r);
  }

  function extend(i) {
    const a = nav.findIndex((r) => r.path === anchor && !r.pin), s = a < 0 ? i : a;
    many = new Set(nav.slice(Math.min(s, i), Math.max(s, i) + 1).filter((r) => !r.pin).map((r) => r.path));
    select(i, true, true);
  }

  function onDbl(e) {
    const el = e.target.closest('.ex-row');
    const r = el && nav[+el.dataset.i], side = e.ctrlKey || e.metaKey;
    if (r && !(r.dir && !r.pin) && (r.dir || side || !isTextName(r.name))) openItem(r, side); // single click already handled text files and folder toggling
  }

  function onKey(e) {
    const el = e.target.closest('.ex-row');
    if (!el || ops.key(e)) return;
    const i = +el.dataset.i, r = nav[i], n = nav.length, go = (j) => { e.preventDefault(); select(Math.max(0, Math.min(n - 1, j)), true); };
    const ext = (j) => { e.preventDefault(); extend(Math.max(0, Math.min(n - 1, j))); };
    switch (e.key) {
      case 'ArrowDown': return e.shiftKey ? ext(i + 1) : go(i + 1);
      case 'ArrowUp': return e.shiftKey ? ext(i - 1) : go(i - 1);
      case 'Home': return go(0);
      case 'End': return go(n - 1);
      case 'ArrowRight':
        e.preventDefault();
        if (r.dir && !r.pin && r.expandable !== false && !r.open) toggle(r.path, true); else if (r.open) go(i + 1);
        return;
      case 'ArrowLeft': {
        e.preventDefault();
        if (r.open) return toggle(r.path, false);
        if (r.pin || !r.depth) return;
        let j = i - 1;
        while (j >= 0 && (nav[j].pin || nav[j].depth >= r.depth)) j--;
        return j >= 0 ? go(j) : undefined;
      }
      case 'Enter': e.preventDefault(); return openItem(r, e.ctrlKey || e.metaKey);
      default:
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key !== ' ' || buf)) {
      clearTimeout(bufT);
      buf += e.key;
      bufT = setTimeout(() => { buf = ''; }, 700);
      const j = typeAhead(nav, buf, i);
      if (j >= 0) go(j);
    }
  }

  function onMenu(e) { ops.menu(e); }

  function remapState(pairs) {
    const w = ws();
    pins = pins.map(([p, d]) => [remap(p, pairs), d]);
    store.dispatch(workspaceActions.expanded(w.expanded.map((p) => remap(p, pairs))));
    if (w.selected) store.dispatch(workspaceActions.select(remap(w.selected, pairs)));
    many = new Set([...many].map((p) => remap(p, pairs)));
    save();
  }
  const fl = createFollow(ctx, remapState);

  const ops = createOps(ctx, {
    moved: fl.moved, deleted: fl.deleted, ws, nav: () => nav, cache: () => cache, many: () => many, clear: () => { many = new Set(); },
    pinned: (p) => pins.some(([x]) => samePath(x, p)), draw, select, toggle, refresh, reveal, openPath, byPath,
  });

  attachDnd(list, { ws, nav: () => nav, many: () => many, drop: ops.api.drop });

  try {
    W.onTreeChange(({ root: r, dirs }) => {
      if (r !== ws().root) return;
      Promise.all(dirs.filter((d) => d === r || cache.has(d) || notes.has(d)).map(load)).then(draw);
    });
  } catch {}
  settings.subscribe((c) => { if ('explorer.sortBy' in c || 'explorer.showHidden' in c) refresh(); });

  function restore() {
    draw();
    loadRecents().then(() => { if (!ws().root) draw(); });
    const p = S('lastWorkspace');
    if (p) open(p, true);
  }

  return { render: () => root, restore, open, close, pick, refresh, reveal, openPath, togglePin, activePath, contains, ...ops.api };
}