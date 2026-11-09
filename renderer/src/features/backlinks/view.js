import { absPath, relPath, parts } from '../../core/search/results-model.js';
import { titleOf, anchorIs, headingAbove, occurrence, refItem, inLink, selfRefs } from '../../core/links/backlinks.js';
import { readPath } from '../../services/doc-client.js';
import * as W from '../../services/workspace-client.js';
import * as C from '../../services/search-client.js';

const lines = (t) => String(t || '').split(/\r?\n/);

// Text of a workspace file (relative path): clean open tab, else disk.
async function textOf({ store, services: { documents: D } }, rel) {
  const abs = absPath(store.get().workspace.root, rel), id = D.findByPath(abs), t = id && store.get().documents.tabs.find((x) => x.id === id);
  if (id && t && !t.dirty) return D.getEntry(id).doc.text;
  const r = await readPath(abs).catch(() => null);
  return r && r.ok ? r.doc.text : '';
}

// Inbound references to `path` (all of them, or only to heading id `headId`) as search-shaped items with `head`.
export async function references(ctx, path, headId) {
  const strategy = ctx.settings.get('markdown.anchorStrategy');
  const r = await W.index('backlinks', { path });
  let seeds = (r.seeds || []).filter((s) => s.from !== path);
  if (headId) seeds = seeds.filter((s) => anchorIs(s.anchor, headId, strategy));
  const files = [...new Set(seeds.map((s) => s.from))].slice(0, 200), texts = new Map();
  await Promise.all(files.map(async (f) => texts.set(f, await textOf(ctx, f))));
  const seen = new Map(), out = [];
  for (const s of seeds) {
    if (!texts.has(s.from)) continue;
    const ls = lines(texts.get(s.from)), ln = ls[s.line - 1] || '', k = `${s.from}\n${s.line}\n${s.kind}\n${s.target}`, n = seen.get(k) || 0;
    seen.set(k, n + 1);
    const o = occurrence(ln, s, n);
    out.push({ ...refItem(s.from, s.line, o.col, o.len, ln), head: headingAbove(ls, s.line) });
  }
  if (headId) {
    const ls = lines(await textOf(ctx, path));
    for (const x of selfRefs(ls.join('\n'), headId, strategy)) out.push({ ...refItem(path, x.line, x.col, x.len, x.ln), head: headingAbove(ls, x.line) });
  }
  return out;
}

// Plain-text mentions of `title` that are not links (workspace search, content scope).
function unlinked(path, title) {
  if (title.length < 2) return Promise.resolve([]);
  return new Promise((res) => {
    let id = 0, waiting = true, buf = [], off = null, done = false;
    const out = [];
    const fin = () => { if (done) return; done = true; if (typeof off === 'function') off(); res(out.slice(0, 200)); };
    const handle = (e) => {
      if (e.items) out.push(...e.items.filter((it) => it.scope === 'content' && it.path !== path && !inLink(it.text, it.from)));
      if (e.done) fin();
    };
    off = C.onSearchResults((e) => { if (waiting) buf.push(e); else if (e.id === id) handle(e); });
    setTimeout(fin, 8000);
    C.startSearch({ query: title, caseSensitive: false, wholeWord: true, regex: false, scopes: ['content'], include: [], exclude: [], max: 300 })
      .then((r) => { id = r.id; waiting = false; buf.forEach((e) => e.id === id && handle(e)); buf = []; }, fin);
  });
}

export function createBacklinks(ctx) {
  const { store, settings, ui: { h, kit, runCommand } } = ctx;
  let seq = 0, stale = true;
  const body = h('div', { class: 'bl__b' });
  const chk = h('input', { type: 'checkbox', onchange: () => { settings.set('backlinks.showUnlinked', chk.checked); refresh(); } });
  const el = h('div', { class: 'bl' }, h('label', { class: 'bl__u' }, chk, 'Show unlinked mentions'), body);

  const msg = (t) => h('div', { class: 'bl__m' }, t);
  const row = (it) => {
    const [a, b, c] = parts(it);
    return h('button', { type: 'button', class: 'bl__r', title: `${it.path} · line ${it.line}`, onclick: () => runCommand('search.reveal', it) },
      h('span', { class: 'bl__tx' }, a, h('mark', {}, b), c), it.head ? h('small', {}, `under # ${it.head}`) : null);
  };
  const groups = (items) => {
    const by = new Map();
    for (const it of items) { if (!by.has(it.path)) by.set(it.path, []); by.get(it.path).push(it); }
    return [...by].map(([p, xs]) => h('div', { class: 'bl__f' }, h('div', { class: 'bl__fh', title: p }, h('b', {}, p.split('/').pop()), h('span', {}, String(xs.length))), ...xs.map(row)));
  };
  function paint(m) {
    if (m.msg) return body.replaceChildren(msg(m.msg));
    body.replaceChildren(
      ...(m.indexing ? [msg('Indexing workspace… results will refresh automatically.')] : []),
      kit.lbl(`Linked mentions · ${m.linked.length}`), ...(m.linked.length ? groups(m.linked) : [msg('No other notes link here. Add markdown links [[Note]] or [Link](file.md) from other documents.')]),
      ...(m.un ? [kit.lbl(`Unlinked mentions · ${m.un.length}`), ...(m.un.length ? groups(m.un) : [msg('No unlinked mentions found in this workspace.')])] : []));
  }

  async function refresh() {
    stale = false;
    const my = ++seq, s = store.get(), t = s.documents.tabs.find((x) => x.id === s.documents.activeId), root = s.workspace.root;
    chk.checked = !!settings.get('backlinks.showUnlinked');
    const path = root && t && t.path ? relPath(root, t.path) : null;
    if (!root) return paint({ msg: 'No workspace is open. Open a workspace folder to discover references.' });
    if (!path) return paint({ msg: 'Active document is not saved in this workspace. Save it inside the folder to track backlinks.' });
    try {
      const [linked, st] = await Promise.all([references(ctx, path), W.index('status')]);
      if (my !== seq) return;
      const m = { linked, indexing: st.status.state === 'indexing' };
      paint(m);
      if (chk.checked) { const un = await unlinked(path, titleOf(path)); if (my === seq) paint({ ...m, un }); }
    } catch (e) { if (my === seq) paint({ msg: `Failed to load backlinks: ${(e && e.message) || 'Unknown error'}. Check workspace permissions or refresh.` }); }
  }


  let timer = 0;
  const kick = (ms = 0) => {
    stale = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const doRefresh = () => { if (el.isConnected) refresh(); };
      if (window.requestIdleCallback) window.requestIdleCallback(doRefresh, { timeout: 1000 });
      else doRefresh();
    }, ms);
  };
  store.subscribe((s) => s.documents.activeId, () => kick());
  store.subscribe((s) => s.workspace.root, () => kick());
  store.subscribe((s) => s.documents.tabs.map((t) => (t.dirty ? 1 : 0)).join(''), () => kick(1200));
  W.onIndexProgress((p) => { if (p && p.state === 'ready') kick(250); });

  return { render: () => { if (stale) refresh(); return el; } };
}