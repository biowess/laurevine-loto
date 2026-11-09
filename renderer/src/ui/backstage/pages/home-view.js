import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { store } from '../../../state/store.js';
import { uiActions } from '../../../state/slices/ui.js';
import { register, has } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import * as recents from '../../../services/recents-client.js';
import * as workspaces from '../../../services/workspace-client.js';
import { stat } from '../../../services/doc-client.js';
import * as recovery from '../../../services/recovery-client.js';
import { getSetting } from '../../../services/settings-client.js';
import { greeting, labelItems, matches, parseTemplates, templateTitle } from '../../../core/backstage/home-model.js';

let reload = null;
document.addEventListener('lv-recovery', () => { if (reload) reload(); });
const done = (r) => { if (r && r.ok) store.dispatch(uiActions.backstage(false)); };
const act = (cmd, title, ic, arg) => h('button', { type: 'button', class: 'tbtn', title, 'aria-label': title, dataset: { cmd }, onclick: () => runCommand(cmd, arg) }, icon(ic));

for (const [id, title, call] of [['recents.pin', 'Pin', recents.pin], ['recents.unpin', 'Unpin', recents.unpin], ['recents.remove', 'Remove from Recent', recents.remove]]) {
  if (!has(id)) register({ id, title, group: 'File', run: async (p) => { await call(p); if (reload) reload(); } });
}
if (!has('recents.clear')) register({ id: 'recents.clear', title: 'Clear Recent Documents', group: 'File', run: async () => { await recents.clear(); if (reload) reload(); } });

export function homeView() {

  const st = { q: '', docs: [], wss: [], rec: [], gone: new Set() }, tpls = parseTemplates(getSetting('templates.recent'));
  const lists = h('div', { class: 'lv-home' });
  const search = h('input', { type: 'search', class: 'lv-hsearch', placeholder: 'Search documents, workspaces and templates', 'aria-label': 'Search Home', oninput: (e) => { st.q = e.target.value; paint(); } });

  const row = (main, extra, cls) => h('div', { class: 'lv-hrow' + (cls ? ` ${cls}` : '') }, main, h('span', { class: 'lv-hacts' }, extra));
  const docRow = (i) => {
    const gone = st.gone.has(i.path);
    return row(h('button', { type: 'button', class: 'lv-hmain', title: i.path, disabled: gone, dataset: { cmd: 'file.open-recent' }, onclick: async () => done(await runCommand('file.open-recent', i.path)) },
      icon('file-text'), h('b', {}, i.name), i.hint ? h('small', {}, i.hint) : null, gone ? h('em', {}, 'File not found') : null),
    [gone ? null : act(i.pinned ? 'recents.unpin' : 'recents.pin', i.pinned ? 'Unpin' : 'Pin', i.pinned ? 'pin-off' : 'pin', i.path), act('recents.remove', 'Remove from Recent', 'x', i.path)], gone ? 'is-missing' : '');
  };
  const wsRow = (w) => row(h('button', { type: 'button', class: 'lv-hmain', title: w.root, dataset: { cmd: 'workspace.open' }, onclick: async () => done(await runCommand('workspace.open', w.root)) },
    icon('folder-open'), h('b', {}, w.name || w.root), h('small', {}, w.root)), null);
  const tplRow = (id) => row(h('button', { type: 'button', class: 'lv-hmain', dataset: { cmd: 'file.new-from-template' }, onclick: () => runCommand('file.new-from-template', id) }, icon('layout-template'), h('b', {}, templateTitle(id.replace(/^user:/, '')))), null);

  const recRow = (i) => row(h('button', { type: 'button', class: 'lv-hmain', title: i.path || 'Untitled', dataset: { cmd: 'recovery.restore' }, onclick: async () => done(await runCommand('recovery.restore', i.key)) },
    icon('file-text'), h('b', {}, i.name), h('small', {}, recovery.describe(i))), act('recovery.discard', 'Discard', 'x', i.key));

  const section = (title, items, build, empty, extra) => h('section', {}, h('h4', {}, title, extra || null),
    items.length ? h('div', { class: 'md-list' }, ...items.map(build)) : h('p', { class: 'lv-hnone' }, st.q ? 'No matches' : empty));

  function paint() {
    const all = labelItems([...st.docs.filter((i) => i.pinned), ...[...st.docs.filter((i) => !i.pinned)].sort((a, b) => b.openedAt - a.openedAt)]);
    const ok = (i) => matches(st.q, i.name, i.path);
    const pinned = all.filter((i) => i.pinned && ok(i)), recent = all.filter((i) => !i.pinned && ok(i));
    const ws = st.wss.filter((w) => matches(st.q, w.name, w.root)), tp = tpls.filter((t) => matches(st.q, t, templateTitle(t)));
    const clear = all.some((i) => !i.pinned) ? h('button', { type: 'button', class: 'lv-hclear', dataset: { cmd: 'recents.clear' }, onclick: () => runCommand('recents.clear') }, 'Clear') : null;
    const rc = st.rec.filter((i) => matches(st.q, i.name, i.path || ''));
    lists.replaceChildren(...(rc.length ? [section('Recover unsaved documents', rc, recRow, '')] : []), section('Pinned', pinned, docRow, 'Pin a document to keep it here.'), section('Recent documents', recent, docRow, 'No recent documents.', clear),
      section('Recent workspaces', ws, wsRow, 'No recent workspaces.'), ...(tp.length ? [section('Recently used templates', tp, tplRow, '')] : []));
  }

  async function load() {
    reload = load;
    try { st.docs = (await recents.list()).items; } catch { st.docs = []; }
    try { st.wss = (await workspaces.recent()).items; } catch { st.wss = []; }
    try { st.rec = (await recovery.list()).items; } catch { st.rec = []; }
    paint();
    await Promise.all(st.docs.map((i) => stat(i.path).then((r) => { if (r && r.exists === false) st.gone.add(i.path); }, () => {})));
    if (st.gone.size) paint();
  }

  const name = String(getSetting('user.name') || '').trim();
  return { title: name ? `${greeting()}, ${name}` : greeting(), search, lists, load };
}
