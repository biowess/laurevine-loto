import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { uiActions } from '../../state/slices/ui.js';
import { createResults, addItems, flatten, allHits, parts } from '../../core/search/results-model.js';
import { index, onIndexProgress } from '../../services/workspace-client.js';
import { createSession } from './session.js';
import { reveal } from './reveal.js';
import { createReplace } from './replace.js';

const SC = [['content', 'Content'], ['filenames', 'Filenames'], ['frontmatter', 'Frontmatter'], ['code', 'Code blocks']];
const TG = [['search.match-case', 'Aa', 'Match Case', 'cs'], ['search.whole-word', 'ab', 'Whole Word', 'ww'], ['search.regex', '.*', 'Use Regular Expression', 'rx']];
const MD = [['search.scope-workspace', 'Workspace', 'workspace'], ['search.scope-file', 'This file', 'file']];
const IDS = ['search.match-case', 'search.whole-word', 'search.regex', 'search.scope-workspace', 'search.scope-file', 'search.next', 'search.prev'];
const base = (p) => p.split(/[\\/]/).pop();

export function createSearch(ctx) {
  const { store, settings, commands, services: { documents }, ui: { runCommand, toast } } = ctx;
  const S = {
    q: '', cs: !!settings.get('search.matchCase'), ww: false, rx: false, mode: 'workspace', inc: '', exc: '', phase: 'idle', err: '', notice: '', ix: null, cur: null,
    sc: Object.fromEntries(SC.map(([k]) => [k, !!settings.get(`search.scope${k[0].toUpperCase()}${k.slice(1)}`)])),
  };
  let R = createResults();
  const els = new Map();

  const q = h('input', { type: 'text', class: 'sr__qi', 'aria-label': 'Search', placeholder: 'Search', spellcheck: 'false', oninput: (e) => { S.q = e.target.value; session.schedule(); } });
  const tgs = TG.map(([cmd, label, title, key]) => [key, h('button', { type: 'button', class: 'sr__tg', title, 'aria-label': title, 'aria-pressed': 'false', dataset: { cmd }, onclick: () => runCommand(cmd) }, label)]);
  const mds = MD.map(([cmd, label, key]) => [key, h('button', { type: 'button', class: 'sr__mb', 'aria-pressed': 'false', dataset: { cmd }, onclick: () => runCommand(cmd) }, label)]);
  const boxes = SC.map(([k, label]) => { const c = h('input', { type: 'checkbox', onchange: () => runCommand('search.scope', k) }); return [k, c, h('label', {}, c, label)]; });
  const gi = (key, label) => h('input', { class: 'sr__gi', 'aria-label': label, placeholder: label, spellcheck: 'false', oninput: (e) => { S[key] = e.target.value; session.schedule(); } });
  const st = h('div', { class: 'sr__st', role: 'status', 'aria-live': 'polite' }), nt = h('div', { class: 'sr__note' }), ixl = h('div', { class: 'sr__note' });
  const rp = createReplace(ctx, S, () => R.groups, () => S.cur);
  const bar = h('div', { class: 'sr__bar', 'aria-hidden': 'true' }), empty = h('div', { class: 'sr__empty' });
  const cbtn = h('button', { type: 'button', class: 'sr__cb', hidden: true, dataset: { cmd: 'search.collapse-all' }, onclick: () => runCommand('search.collapse-all') });
  const sum = h('div', { class: 'sr__sum' }, st, cbtn);
  const list = h('div', { class: 'sr__list', role: 'tree', 'aria-label': 'Search results', tabindex: '0' });
  const root = h('div', { class: 'sr' },
    h('div', { class: 'sr__q' }, q, ...tgs.map((t) => t[1])),
    rp.el,
    h('div', { class: 'sr__m' }, ...mds.map((m) => m[1])),
    h('div', { class: 'sr__sc' }, ...boxes.map((b) => b[2])),
    h('details', { class: 'sr__adv' }, h('summary', {}, icon('chevron-right'), 'Include / exclude files'), h('div', { class: 'sr__gl' }, gi('inc', 'Files to include (e.g. notes/**, *.md)'), gi('exc', 'Files to exclude (e.g. drafts/**)'))),
    bar, sum, nt, ixl, empty, list);

  function syncCollapse() {
    const any = R.groups.some((g) => g.open), t = any ? 'Collapse all results' : 'Expand all results';
    cbtn.hidden = !R.groups.length;
    cbtn.title = t; cbtn.setAttribute('aria-label', t);
    if (cbtn.dataset.o !== String(any)) { cbtn.dataset.o = String(any); cbtn.replaceChildren(icon(any ? 'chevrons-down-up' : 'chevrons-up-down')); }
  }

  function syncUi() {
    for (const [k, b] of tgs) b.setAttribute('aria-pressed', String(S[k]));
    for (const [k, b] of mds) b.setAttribute('aria-pressed', String(S.mode === k));
    for (const [k, c] of boxes) c.checked = S.sc[k];
    root.classList.toggle('is-file', S.mode === 'file');
    IDS.forEach((id) => commands.invalidate(id));
  }

  function paintStatus() {
    const n = R.total, f = R.groups.length, busy = S.phase === 'busy';
    const nows = S.phase === 'nows' || (S.mode === 'workspace' && !S.q && !store.get().workspace.root);
    root.classList.toggle('is-busy', busy);
    const count = `${n.toLocaleString('en-US')} result${n === 1 ? '' : 's'} in ${f.toLocaleString('en-US')} file${f === 1 ? '' : 's'}`;
    st.className = `sr__st${S.phase === 'err' ? ' sr__err' : ''}`;
    st.textContent = S.refs ? `${S.refs} · ${count}` : nows ? '' : S.phase === 'err' ? `Search error: ${S.err}. Check regex syntax or adjust query.` : S.phase === 'nodoc' ? 'No document is open. Open or create a file to search.'
      : busy ? `Searching… ${n ? count : 'Scanning documents for matches…'}` : S.phase === 'done' ? (n ? count : `No results for “${S.q}”. Check spelling or broaden search scope.`) : '';
    nt.textContent = S.notice;
    ixl.textContent = S.ix && S.ix.state === 'indexing' ? `Indexing workspace… ${S.ix.total ? `${S.ix.done.toLocaleString('en-US')} / ${S.ix.total.toLocaleString('en-US')}` : 'Cataloguing files…'}` : '';
    empty.replaceChildren(...(nows ? [
      h('p', {}, 'No workspace is open. Open a folder to search all files, or search the active document.'),
      h('button', { type: 'button', class: 'btn btn--primary', dataset: { cmd: 'file.open-folder' }, onclick: () => runCommand('file.open-folder') }, 'Open Folder'),
      h('button', { type: 'button', class: 'btn', dataset: { cmd: 'search.scope-file' }, onclick: () => runCommand('search.scope-file') }, 'Search this file'),
    ] : []));

    commands.invalidate('search.next'); commands.invalidate('search.prev'); rp.sync(R.total > 0 && !busy);
    commands.invalidate('search.replace-file'); commands.invalidate('search.replace-all');
  }

  const title = (g) => {
    if (S.mode !== 'file') return g.path;
    const e = documents.getEntry(store.get().documents.activeId);
    return g.path ? base(g.path) : (e && e.doc.name) || 'Untitled';
  };
  function groupEl(g) {
    let e = els.get(g);
    if (e) return e;
    const ct = h('span', { class: 'sr__ct' });
    const head = h('div', { class: 'sr__fh', role: 'treeitem', 'aria-level': '1', 'aria-expanded': 'true', title: g.path, onclick: () => runCommand('search.toggle-group', g.path) }, icon('chevron-down'), h('span', { class: 'sr__fn' }, title(g)), ct);
    const body = h('div', { class: 'sr__fl', role: 'group' }), wrap = h('div', { class: 'sr__f' }, head, body);
    list.append(wrap);
    els.set(g, e = { wrap, head, body, ct });
    return e;
  }
  function rowEl(it) {
    if (it._el) return it._el;
    const [a, b, c] = parts(it);
    return (it._el = h('div', { class: 'sr__r', role: 'treeitem', 'aria-level': '2', title: `${it.scope}${it.line ? ` · line ${it.line}` : ''}`, onclick: () => runCommand('search.open', it) },
      h('span', { class: 'sr__ln' }, it.line ? String(it.line) : 'name'), h('span', { class: 'sr__tx' }, a, h('mark', {}, b), c)));
  }

  const VIRT = 120, RH = 26, hdEls = new WeakMap();
  const sp = h('div', { class: 'sr__sp', style: { position: 'relative', width: '100%' } });
  let flat = [], isVirt = false, virtRaf = 0, vA = -1, vB = -1, vDirty = true;

  function headEl(g) {
    let c = hdEls.get(g);
    if (c && c.open === g.open && c.n === g.items.length) return c.el;
    const el = h('div', { class: 'sr__fh', role: 'treeitem', 'aria-level': '1', 'aria-expanded': String(g.open), title: g.path, onclick: () => runCommand('search.toggle-group', g.path) }, icon(g.open ? 'chevron-down' : 'chevron-right'), h('span', { class: 'sr__fn' }, title(g)), h('span', { class: 'sr__ct' }, String(g.items.length)));
    hdEls.set(g, c = { el, open: g.open, n: g.items.length });
    return el;
  }

  function paintVirtual() {
    const n = flat.length, y = list.scrollTop, hgt = list.clientHeight || 500;
    const a = Math.max(0, Math.floor(y / RH) - 6), b = Math.min(n, Math.ceil((y + hgt) / RH) + 8);
    if (!vDirty && a === vA && b === vB) return;
    vA = a; vB = b;
    if (vDirty) { sp.style.height = `${n * RH}px`; vDirty = false; }
    const nodes = [];
    for (let i = a; i < b; i++) {
      const row = flat[i], el = row.it ? rowEl(row.it) : headEl(row.g);
      el.style.transform = `translateY(${i * RH}px)`;
      el.classList.toggle('is-cur', (row.it || row.g) === S.cur);
      nodes.push(el);
    }
    sp.replaceChildren(...nodes);
  }

  function renderList() {
    flat = flatten(R);
    syncCollapse();
    if (flat.length > VIRT) {
      if (!isVirt) { isVirt = true; list.replaceChildren(sp); }
      vDirty = true;
      paintVirtual();
    } else {
      if (isVirt) { isVirt = false; list.replaceChildren(); }
      els.clear();
      list.replaceChildren();
      for (const g of R.groups) {
        const ge = groupEl(g);
        ge.ct.textContent = String(g.items.length);
        ge.wrap.classList.toggle('is-closed', !g.open); ge.head.setAttribute('aria-expanded', String(g.open));
        ge.body.replaceChildren(...(g.open ? g.items.map((it) => { const e = rowEl(it); e.style.transform = ''; e.classList.toggle('is-cur', it === S.cur); return e; }) : []));
      }
    }
  }

  list.addEventListener('scroll', () => { if (isVirt && !virtRaf) virtRaf = requestAnimationFrame(() => { virtRaf = 0; paintVirtual(); }); }, { passive: true });

  let paintRaf = 0;
  const flushPaint = () => { clearTimeout(paintRaf); paintRaf = 0; renderList(); paintStatus(); };
  const cb = {
    reset() { clearTimeout(paintRaf); paintRaf = 0; R = createResults(); els.clear(); flat = []; isVirt = false; vDirty = true; syncCollapse(); list.replaceChildren(); S.cur = null; S.phase = 'busy'; S.refs = ''; S.err = ''; S.notice = ''; paintStatus(); },
    add(items) {
      addItems(R, items);
      if (!paintRaf) paintRaf = setTimeout(flushPaint, 90); // coalesce streamed batches: at most ~11 repaints/s
    },
    done(i) {
      if (paintRaf) flushPaint();
      S.phase = i.nows ? 'nows' : i.nodoc ? 'nodoc' : i.canceled ? 'idle' : i.error || i.regexError ? 'err' : S.q ? 'done' : 'idle';
      S.err = i.regexError ? `Invalid regular expression: ${i.regexError}` : i.error || '';
      S.notice = i.notice || '';
      paintStatus();
    },
  };
  const session = createSession(ctx, S, cb);
  const rerun = () => { syncUi(); if (S.q) session.run(); else paintStatus(); };

  const elOf = (x) => (x ? (x.items ? els.get(x)?.head : x._el) : null);
  function setCur(t) {
    elOf(S.cur)?.classList.remove('is-cur');
    S.cur = t;
    if (isVirt) {
      const i = t ? flat.findIndex((x) => (x.it || x.g) === t) : -1, y = list.scrollTop, hgt = list.clientHeight;
      if (i >= 0) { if (i * RH < y) list.scrollTop = i * RH; else if ((i + 1) * RH > y + hgt) list.scrollTop = (i + 1) * RH - hgt; }
      vDirty = true; paintVirtual();
    } else {
      const e = elOf(t);
      if (e) { e.classList.add('is-cur'); e.scrollIntoView({ block: 'nearest' }); }
    }
  }
  function setOpen(g, v) {
    g.open = v;
    renderList();
  }
  function move(d) {
    const f = flatten(R);
    if (!f.length) return;
    const i = f.findIndex((x) => (x.it || x.g) === S.cur), x = f[Math.min(f.length - 1, Math.max(0, i < 0 ? (d > 0 ? 0 : f.length - 1) : i + d))];
    setCur(x.it || x.g);
  }
  const open = (it) => { setCur(it); return reveal(ctx, it).catch((e) => toast((e && e.message) || 'The result could not be opened.')); };
  const toggleGroup = (path) => { const g = R.by.get(path); if (g) { setOpen(g, !g.open); setCur(g); } };

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter' && S.cur) { e.preventDefault(); if (S.cur.items) toggleGroup(S.cur.path); else open(S.cur); }
    else if (e.key === 'Enter' && e.target.matches('input[type=text]')) { e.preventDefault(); session.run(); }
  });
  documents.onDocChange(() => { if (S.mode === 'file' && S.q) session.schedule(); });
  store.subscribe((s) => s.documents.activeId, () => { if (S.mode === 'file' && S.q) session.schedule(); });
  const loadIx = () => { S.ix = null; if (store.get().workspace.root) index('status').then((r) => { S.ix = r.status; paintStatus(); }).catch(() => {}); };
  store.subscribe((s) => s.workspace.root, () => { loadIx(); rerun(); });
  onIndexProgress((p) => { S.ix = p; paintStatus(); });
  loadIx(); syncUi(); paintStatus();

  return {
    el: root, S, open, toggleGroup, has: () => R.total > 0, replace: rp.run,
    showRefs: (label, items) => {
      session.cancel(); q.value = ''; S.q = ''; S.mode = 'workspace'; cb.reset(); cb.add(items); S.refs = label; S.phase = 'done';
      syncUi(); paintStatus(); store.dispatch(uiActions.panel('left', { view: 'search', open: true }));
    },
    focusReplace: () => { S.mode = 'workspace'; store.dispatch(uiActions.panel('left', { view: 'search', open: true })); rerun(); setTimeout(rp.focus, 50); },
    toggle: (k) => { S[k] = !S[k]; rerun(); },
    scope: (k) => { if (k in S.sc) { S.sc[k] = !S.sc[k]; rerun(); } },
    setMode: (m) => { S.mode = m; rerun(); },
    collapseAll: () => { const o = R.groups.some((g) => g.open); R.groups.forEach((g) => { g.open = !o; }); if (o && S.cur && !S.cur.items) S.cur = R.by.get(S.cur.path) || null; renderList(); list.scrollTop = 0; },
    clear: () => { q.value = ''; S.q = ''; session.cancel(); cb.reset(); cb.done({}); q.focus(); },
    step: (d) => {
      const hs = allHits(R), n = hs.length, i = hs.indexOf(S.cur);
      if (!n) return;
      const it = hs[i < 0 ? (d > 0 ? 0 : n - 1) : (i + d + n) % n], g = R.by.get(it.path);
      if (!g.open) setOpen(g, true);
      open(it);
    },
    focus: () => { store.dispatch(uiActions.panel('left', { view: 'search', open: true })); setTimeout(() => { q.focus(); q.select(); }, 50); },
  };
}