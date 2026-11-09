import { buildRegex } from '../../core/search/text-search.js';
import { scopedMatches } from '../../core/search/scoped.js';
import { relPath, splitGlobs } from '../../core/search/results-model.js';
import * as C from '../../services/search-client.js';

const note = (n) => `Showing the first ${n.toLocaleString('en-US')} results. Refine the query to narrow them.`;

// Runs searches for state S and reports through cb.reset / cb.add(items) / cb.done(info). A new run cancels the previous one.
export function createSession({ store, settings, services: { documents } }, S, cb) {
  let timer = 0, seq = 0, id = 0, waiting = false, buf = [], over = new Map(), lastKey = '';
  const opts = () => ({ query: S.q, caseSensitive: S.cs, wholeWord: S.ww, regex: S.rx });
  const scopes = () => Object.keys(S.sc).filter((k) => S.sc[k]);
  const max = () => settings.get('search.maxResults');
  const local = (text, path) => {
    const r = scopedMatches(text, opts(), new Set(scopes()), max());
    return { error: r.error, over: r.items.length > max(), items: r.items.slice(0, max()).map((it) => ({ path, ...it })) };
  };
  const stop = () => { id = 0; waiting = false; C.cancelSearch().catch(() => {}); };

  // Open documents with unsaved changes inside the workspace: their editor text replaces the disk results.
  function dirty() {
    const root = store.get().workspace.root, m = new Map();
    documents.editorRun('flush');
    for (const t of store.get().documents.tabs) {
      const rel = t.dirty && t.path && root ? relPath(root, t.path) : null, e = rel && documents.getEntry(t.id);
      if (e) m.set(rel, e.doc.text);
    }
    return m;
  }

  const handle = (e) => {
    if (e.items) cb.add(e.items.filter((it) => it.scope === 'filenames' || !over.has(it.path)));
    if (!e.done) return;
    for (const [rel, text] of over) cb.add(local(text, rel).items);
    cb.done({ error: e.error, notice: e.notice, canceled: e.canceled });
  };
  C.onSearchResults((e) => { if (waiting) buf.push(e); else if (e.id === id) handle(e); });

  const keyOf = () => JSON.stringify([S.mode, S.q, S.cs, S.ww, S.rx, scopes(), S.inc, S.exc, store.get().workspace.root]);
  async function start() {
    const my = ++seq;
    lastKey = keyOf();
    stop(); cb.reset();
    if (!S.q) return cb.done({});
    const bad = buildRegex(opts()).error;
    if (bad) return cb.done({ regexError: bad });
    if (!scopes().length) return cb.done({ error: 'Select at least one scope.' });
    if (S.mode === 'file') {
      documents.editorRun('flush');
      const e = documents.getEntry(store.get().documents.activeId);
      if (!e) return cb.done({ nodoc: true });
      const r = local(e.doc.text, e.doc.path || '');
      cb.add(r.items);
      return cb.done({ error: r.error, notice: r.over ? note(max()) : '' });
    }
    if (!store.get().workspace.root) return cb.done({ nows: true });
    over = dirty(); waiting = true; buf = [];
    try {
      const r = await C.startSearch({ ...opts(), scopes: scopes(), include: splitGlobs(S.inc), exclude: [...splitGlobs(S.exc), ...splitGlobs(settings.get('search.ignoreGlobs'))].slice(0, 20), max: max() });
      if (my !== seq) return;
      id = r.id; waiting = false;
      const b = buf; buf = [];
      b.forEach((e) => e.id === id && handle(e));
    } catch (e) {
      if (my === seq) { waiting = false; cb.done({ error: (e && e.message) || 'Search failed.' }); }
    }
  }

  return {
    run: () => { clearTimeout(timer); start(); },
    schedule: () => { clearTimeout(timer); timer = setTimeout(() => { if (keyOf() !== lastKey) start(); }, 250); }, // skip identical queries (no repeated full walks)
    cancel: () => { clearTimeout(timer); seq++; lastKey = ''; stop(); },
  };
}