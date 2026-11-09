// Per-workspace index: runs the worker, merges results, caches to <indexes>/<id>.json, answers queries.
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { writeJsonAtomic } from '../store/json-store.js';

const VERSION = 1, MAX_BYTES = 10 * 1024 * 1024, SAVE_MS = 2000, ROWS = 5000, SEEDS = 1000;
const abortErr = () => Object.assign(new Error('Indexing canceled'), { name: 'AbortError' });
const stem = (p) => p.toLowerCase().replace(/\.(md|markdown|mdown|txt)$/, '');
const dec = (s) => { try { return decodeURI(s); } catch { return s; } };
const dirOf = (p) => p.slice(0, p.lastIndexOf('/') + 1);

function norm(p) {
  const o = [];
  for (const s of p.split('/')) { if (s === '..') { if (!o.pop()) return null; } else if (s && s !== '.') o.push(s); }
  return o.join('/');
}

export function defaultSpawn(msg, signal, onProgress) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortErr());
    const w = new Worker(new URL('./worker.js', import.meta.url));
    const onAbort = () => { w.terminate(); reject(abortErr()); };
    signal.addEventListener('abort', onAbort, { once: true });
    const end = () => { signal.removeEventListener('abort', onAbort); w.terminate(); };
    w.on('message', (m) => {
      if (m.id !== msg.id) return;
      if (m.type === 'progress') onProgress(m);
      else if (m.type === 'done') { end(); resolve(m); } else if (m.type === 'error') { end(); reject(new Error(m.message)); }
    });
    w.on('error', (e) => { end(); reject(e); });
    w.postMessage(msg);
  });
}

export function createIndexer({ root, cacheFile, emit = () => {}, spawn = defaultSpawn, maxBytes = MAX_BYTES }) {
  let files = {}, state = 'idle', reqId = 0, done = 0, total = 0, phase = '', built = 0, truncated = false, cached = false, error = '';
  let cur = null, wantFull = false, force = false, busy = false, closed = false, saveT = null;
  const dirs = new Set();

  const status = () => ({
    state, requestId: reqId, phase, done, total, files: Object.keys(files).length, built, truncated, cached, error,
    skipped: Object.entries(files).filter(([, f]) => f.big).map(([p, f]) => ({ path: p, size: f.s })),
  });
  const push = () => { if (!closed) emit({ requestId: reqId, state, phase, done, total, files: Object.keys(files).length }); };

  const save = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => writeJsonAtomic(cacheFile, { version: VERSION, root, built, truncated, files }).catch((e) => console.error('[indexer]', e.message)), SAVE_MS);
    saveT.unref?.();
  };

  const knownMap = () => Object.fromEntries(Object.entries(files).map(([p, f]) => [p, [f.m, f.s]]));
  const strip = ({ p, same, ...rest }) => rest;

  function apply(r) {
    if (r.full) {
      const next = {};
      for (const e of r.entries) { const f = e.same ? files[e.p] : strip(e); if (f) next[e.p] = f; }
      files = next; truncated = r.truncated;
      return;
    }
    const has = new Set(r.entries.map((e) => e.p));
    const under = (p, d) => (d === '' ? true : p.startsWith(`${d}/`));
    for (const d of r.gone) for (const p of Object.keys(files)) if (under(p, d)) delete files[p];
    for (const d of r.listed) for (const p of Object.keys(files)) if (dirOf(p) === (d ? `${d}/` : '') && !has.has(p)) delete files[p];
    for (const e of r.entries) { if (!e.same) files[e.p] = strip(e); }
  }

  async function runJob(job) {
    const id = ++reqId, ac = new AbortController();
    cur = { id, ac };
    state = 'indexing'; done = 0; total = 0; phase = 'walk'; error = '';
    push();
    let last = 0;
    try {
      const r = await spawn({ id, root, maxBytes, ...job, known: job.force ? {} : knownMap() }, ac.signal, (p) => {
        if (p.id !== id || ac.signal.aborted) return;
        done = p.done; total = p.total; phase = p.phase;
        if (Date.now() - last > 100) { last = Date.now(); push(); }
      });
      if (ac.signal.aborted || id !== reqId) return;
      apply(r); state = 'ready'; cached = false; built = Date.now(); save();
    } catch (e) {
      if (ac.signal.aborted) state = 'canceled'; else { state = 'error'; error = String((e && e.message) || e); }
    } finally {
      cur = null; phase = ''; push();
    }
  }

  async function pump() {
    if (busy || closed) return;
    busy = true;
    while (!closed && (wantFull || dirs.size)) {
      const job = wantFull ? { mode: 'full', force } : { mode: 'dirs', dirs: [...dirs] };
      if (wantFull) { wantFull = false; force = false; dirs.clear(); } else dirs.clear();
      await runJob(job);
    }
    busy = false;
  }

  async function start() {
    try {
      const c = JSON.parse(await fsp.readFile(cacheFile, 'utf8'));
      if (c && c.version === VERSION && c.root === root && c.files && typeof c.files === 'object') { files = c.files; built = c.built || 0; truncated = !!c.truncated; cached = true; state = 'ready'; push(); }
    } catch { /* no usable cache */ }
    wantFull = true; pump();
  }

  // Watcher folders (absolute) -> relative; ignores folders outside the root and hidden or ignored ones.
  function update(absDirs) {
    if (closed) return;
    if (absDirs.length > 100 || dirs.size > 200) {
      dirs.clear();
      wantFull = true;
      pump();
      return;
    }
    for (const d of absDirs) {
      const rel = path.relative(root, d).split(path.sep).join('/');
      if (rel === '..' || rel.startsWith('../') || path.isAbsolute(rel) || rel.split('/').some((s) => s.startsWith('.') && s !== '')) continue;
      dirs.add(rel);
    }
    if (dirs.size > 200) { dirs.clear(); wantFull = true; }
    if (dirs.size || wantFull) pump();
  }

  const rebuild = () => { wantFull = true; force = true; if (cur) cur.ac.abort(); pump(); };
  const cancel = () => { wantFull = false; dirs.clear(); if (cur) cur.ac.abort(); else if (state === 'indexing') { state = 'canceled'; push(); } };

  function seeds(target) {
    const by = new Map(), all = Object.keys(files);
    for (const f of all) { const k = stem(f).split('/').pop(); if (!by.has(k)) by.set(k, []); by.get(k).push(f); }
    const out = [];
    for (const [from, f] of Object.entries(files)) {
      for (const l of f.l || []) {
        if (l[0] === 'i') continue;
        let hits = [];
        if (l[0] === 'w') { const k = stem(l[1]); hits = k ? (by.get(k.split('/').pop()) || []).filter((x) => stem(x).endsWith(k)) : [from]; }
        else {
          const raw = l[1];
          if (/^([a-z][a-z0-9+.-]+:|\/\/|#)/i.test(raw)) continue;
          const p = dec(raw.split('#')[0].split('?')[0]);
          if (!p) continue;
          let t = norm(p[0] === '/' ? p : dirOf(from) + p);
          if (t !== null && !files[t] && files[`${t}.md`]) t += '.md';
          if (t !== null) hits = [t];
        }
        if (hits.includes(target) && out.length < SEEDS) out.push({ from, line: l[2], kind: l[0] === 'w' ? 'wiki' : 'link', target: l[1], anchor: l[3] || (l[0] === 'l' && l[1].includes('#') ? l[1].slice(l[1].indexOf('#') + 1) : '') });
      }
    }
    return out;
  }

  function integrityQuery() {
    const by = new Map(), all = Object.keys(files);
    for (const f of all) { const k = stem(f).split('/').pop(); if (!by.has(k)) by.set(k, []); by.get(k).push(f); }
    const hasAnchor = (p, a) => {
      const hd = files[p] && files[p].h, clean = dec(a).toLowerCase();
      if (!hd) return false;
      return hd.some(([, text]) => {
        if (!text) return false;
        const t = text.trim().toLowerCase();
        return t === clean || t.replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-') === clean;
      });
    };

    const broken = [], missingMedia = [], refSet = new Set(), extMap = new Map();
    const ASSET = /\.(png|jpe?g|gif|webp|avif|bmp|svg|ico|mp3|wav|ogg|m4a|flac|mp4|webm|mov|ogv|pdf|zip|docx?|xlsx?|pptx?|csv)$/i;

    for (const [from, f] of Object.entries(files)) {
      for (const l of f.l || []) {
        const [kind, rawTarget, line, wikiAnchor = ''] = l;
        if (!rawTarget && !wikiAnchor) continue;
        if (/^([a-z][a-z0-9+.-]+:|\/\/)/i.test(rawTarget)) {
          if (!/^mailto:/i.test(rawTarget)) {
            const e = extMap.get(rawTarget) || { url: rawTarget, count: 0, sources: [] };
            e.count++;
            if (e.sources.length < 50) e.sources.push({ from, line });
            extMap.set(rawTarget, e);
          }
          continue;
        }

        if (kind === 'i') {
          const p = dec(rawTarget.split('#')[0].split('?')[0]);
          const t = norm(p[0] === '/' ? p : dirOf(from) + p);
          if (t) refSet.add(t);
          if (!t || !files[t]) missingMedia.push({ from, line, target: rawTarget, path: t || p, kind: 'media', reason: 'missing-file' });
          continue;
        }

        if (kind === 'w') {
          const k = stem(rawTarget);
          const hits = k ? (by.get(k.split('/').pop()) || []).filter((x) => stem(x).endsWith(k)) : [];
          if (!hits.length) {
            broken.push({ from, line, target: rawTarget, kind: 'wiki', reason: 'missing-file', anchor: wikiAnchor });
          } else {
            const hit = hits[0];
            refSet.add(hit);
            if (wikiAnchor && !hasAnchor(hit, wikiAnchor)) {
              broken.push({ from, line, target: rawTarget, kind: 'wiki', reason: 'missing-anchor', path: hit, anchor: wikiAnchor });
            }
          }
        } else if (kind === 'l') {
          if (rawTarget.startsWith('#')) {
            const a = dec(rawTarget.slice(1));
            if (!hasAnchor(from, a)) broken.push({ from, line, target: rawTarget, kind: 'anchor', reason: 'missing-anchor', path: from, anchor: a });
          } else {
            const [p, a = ''] = rawTarget.split('#');
            const anch = wikiAnchor || dec(a);
            const decP = dec(p.split('?')[0]);
            let t = norm(decP[0] === '/' ? decP : dirOf(from) + decP);
            if (t !== null && !files[t] && files[`${t}.md`]) t += '.md';
            if (t) refSet.add(t);
            if (t === null || !files[t]) {
              broken.push({ from, line, target: rawTarget, kind: 'file', reason: 'missing-file', path: t || decP, anchor: anch });
            } else if (anch && !hasAnchor(t, anch)) {
              broken.push({ from, line, target: rawTarget, kind: 'file', reason: 'missing-anchor', path: t, anchor: anch });
            }
          }
        }
      }
    }

    const unusedAttachments = [], orphanedAssets = [];
    for (const [p, f] of Object.entries(files)) {
      if (/\.(md|markdown|mdown)$/i.test(p) || refSet.has(p)) continue;
      const isAtt = p.split('/').some((s) => s === 'assets' || s === 'attachments' || s.endsWith('.assets'));
      const isAst = ASSET.test(p);
      if (isAtt) unusedAttachments.push({ path: p, size: f.s, mtimeMs: f.m, isAsset: isAst });
      if (isAst) orphanedAssets.push({ path: p, size: f.s, mtimeMs: f.m, inAttachmentDir: isAtt });
    }

    const externalLinks = [...extMap.values()].sort((a, b) => b.count - a.count || a.url.localeCompare(b.url));
    return { brokenLinks: broken, missingFiles: missingMedia, unusedAttachments, orphanedAssets, externalLinks };
  }

  async function checkExternalUrl(url, timeoutMs = 5000) {
    if (!url || typeof url !== 'string') return { ok: false, status: 0, statusText: 'Invalid URL' };
    const ms = Math.min(Math.max(Number(timeoutMs) || 5000, 1000), 15000);
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms);
    try {
      let res = await fetch(url, { method: 'HEAD', signal: ac.signal, redirect: 'follow' });
      if (res.status === 405 || res.status === 501) res = await fetch(url, { method: 'GET', signal: ac.signal, redirect: 'follow' });
      clearTimeout(to);
      return { ok: res.ok, status: res.status, statusText: res.statusText || String(res.status) };
    } catch (err) {
      clearTimeout(to);
      const timedOut = ac.signal.aborted;
      return { ok: false, status: timedOut ? 408 : 0, statusText: timedOut ? 'Timeout' : (err && err.code) || 'Error' };
    }
  }

  function query(op, a = {}) {
    switch (op) {
      case 'status': return { status: status() };
      case 'files': return { files: Object.entries(files).map(([p, f]) => ({ path: p, size: f.s, mtimeMs: f.m })), truncated };
      case 'headings': {
        const row = (p) => ({ path: p, headings: ((files[p] && files[p].h) || []).map(([level, text, line]) => ({ level, text, line })) });
        if (a.path) return { files: files[a.path] ? [row(a.path)] : [] };
        const all = Object.keys(files).filter((p) => files[p].h);
        return { files: all.slice(0, ROWS).map(row), truncated: all.length > ROWS };
      }
      case 'backlinks': return { path: a.path, seeds: seeds(a.path) };
      case 'tags': {
        const n = new Map();
        for (const f of Object.values(files)) for (const t of f.t || []) n.set(t, (n.get(t) || 0) + 1);
        return { tags: [...n].map(([tag, count]) => ({ tag, count })).sort((x, y) => y.count - x.count || x.tag.localeCompare(y.tag)) };
      }
      case 'rebuild': rebuild(); return { status: status() };
      case 'cancel': cancel(); return { status: status() };
      case 'integrity': return integrityQuery();
      case 'broken': return { brokenLinks: integrityQuery().brokenLinks };
      case 'missing-files': return { missingFiles: integrityQuery().missingFiles };
      case 'unused-assets': return { unusedAttachments: integrityQuery().unusedAttachments, orphanedAssets: integrityQuery().orphanedAssets };
      case 'orphaned-assets': return { orphanedAssets: integrityQuery().orphanedAssets };
      case 'external-links': return { externalLinks: integrityQuery().externalLinks };
      case 'check-url': return checkExternalUrl(a.url, a.timeout);
      default: return { status: status() };
    }
  }

  return {
    start, update, rebuild, cancel, query, status,
    close() { closed = true; wantFull = false; dirs.clear(); if (cur) cur.ac.abort(); clearTimeout(saveT); },
  };
}
