import { render, asset } from '../../core/markdown/renderer.js';
import { icon } from '../../ui/kit/icons.js';
import { fixMedia, brokenImage } from '../../core/markdown/media.js';
import { getProfile, hasPlugin } from '../../core/markdown/profiles.js';
import { indexFiles } from '../../core/links/resolve.js';
import { listFiles, onTreeChange } from '../../services/workspace-client.js';
import { getHljs, loadHljs, getKatex, loadKatex } from '../../services/lazy-libs.js';
import { buildBlockMap, offsetToLine } from '../../core/sync/block-map.js';
import { hydrateMermaid } from './mermaid.js';
import { getDocBibliography } from '../citations/index.js';
import { editorRun } from '../../services/documents.js';

const dirOf = (p) => p.replace(/[\\/][^\\/]*$/, '');
const norm = (p) => p.replace(/\\/g, '/').replace(/\/+$/, '');

let worker = null, wReq = 0;
function getWorker() {
  if (!worker) worker = new Worker(new URL('./render-worker.js', import.meta.url), { type: 'module' });
  return worker;
}
function workerRender(text, opts) {
  return new Promise((res, rej) => {
    const id = ++wReq, w = getWorker();
    const fn = (ev) => {
      if (ev.data.id === id) {
        w.removeEventListener('message', fn);
        if (ev.data.ok) res(ev.data.res);
        else rej(new Error(ev.data.error));
      }
    };
    w.addEventListener('message', fn);
    w.postMessage({ id, text, opts });
  });
}

export function docProfileId({ store, services, settings }, id) {
  const e = services.documents.getEntry(id || store.get().documents.activeId);
  return getProfile((e && e.profile) || settings.get('markdown.defaultProfile')).id;
}

export function mountPreview(ctx, { slot = 0, el = null } = {}) {
  const { store, services: { documents, assets }, settings } = ctx;
  const prev = el || document.getElementById('prev'), btn = slot ? null : document.getElementById('profbtn'), offs = [];
  if (!prev) return;
  const scroll = new Map();
  let timer = 0, idle = 0, chunkIdle = 0, seq = 0, shown = null, authorized = '';
  const active = () => { const g = store.get().editorGroups.groups[slot]; return g ? g.activeId : null; };
  const label = () => { if (btn) btn.replaceChildren(`${getProfile(docProfileId(ctx)).label} `, icon('chevron-down', 'ic--chev')); };

  async function baseDirFor(tab) {
    if (!tab || !tab.path) return '';
    const dir = norm(dirOf(tab.path)), ws = store.get().workspace.root, key = `${dir}|${ws}`;
    if (key !== authorized) {
      authorized = key;
      await Promise.all([assets.authorizeAssetRoot('doc', dirOf(tab.path)), ws ? assets.authorizeAssetRoot('ws', ws) : null]).catch(() => { authorized = ''; });
    }
    const w = ws && norm(ws);
    return w && (dir === w || dir.startsWith(`${w}/`)) ? `ws${dir.slice(w.length)}` : 'doc';
  }

  let wIdx = null, wRoot = '', wStamp = 0;
  async function wikiFor(tab) {
    const enabled = !!settings.get('markdown.wikiLinks'), ws = store.get().workspace.root;
    if (!(enabled || hasPlugin(docProfileId(ctx, tab && tab.id), 'wikilinks')) || !ws || !tab || !tab.path) return { enabled };
    if (ws !== wRoot || Date.now() - wStamp > 15000) {
      wRoot = ws; wStamp = Date.now();
      wIdx = await listFiles({ showHidden: !!settings.get('explorer.showHidden') }).then((f) => indexFiles(f.files.map((x) => x.replace(/\\/g, '/'))), () => null);
    }
    const w = norm(ws), p = norm(tab.path);
    return { enabled, index: wIdx, from: p.startsWith(`${w}/`) ? p.slice(w.length + 1) : '' };
  }

  function watchMath() {
    const pending = prev.querySelectorAll('.lv-math--pending');
    if (!pending.length) return;
    if (typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          obs.disconnect();
          loadKatex().then(() => schedule(true), () => {});
        }
      }, { root: prev, rootMargin: '300px' });
      pending.forEach((el) => obs.observe(el));
    } else {
      loadKatex().then(() => schedule(true), () => {});
    }
  }

  async function paint() {
    if (!prev.isConnected) return dispose();
    const id = active(), e = id && documents.getEntry(id), n = ++seq;
    if (((e && e.mode) || store.get().ui.mode) === 'source') return;
    if (shown && shown !== id) scroll.set(shown, prev.scrollTop);
    if (!e) { prev.replaceChildren(); shown = null; return; }
    const tab = store.get().documents.tabs.find((t) => t.id === id);
    const baseDir = await baseDirFor(tab), wiki = await wikiFor(tab);
    const bib = await getDocBibliography(ctx, e.doc.text, tab?.path).catch(() => null);
    if (n !== seq) return;
    if (!getHljs() && /^ {0,3}(?:`{3,}|~{3,})\s*[\w#+.-]/m.test(e.doc.text)) loadHljs().then(() => schedule(true), () => {});
    const keep = shown === id ? prev.scrollTop : scroll.get(id) || 0;
    const style = settings.get('bibliography.style') || 'author-year';
    const opts = {
      profile: docProfileId(ctx, id),
      baseDir,
      anchorStrategy: settings.get('markdown.anchorStrategy'),
      html: settings.get('markdown.htmlPassthrough'),
      code: { hl: getHljs() },
      wiki,
      bibliography: bib ? { entries: bib.entryMap, style } : null,
      math: { katex: getKatex },
    };
    const rendered = e.doc.text.length > 1024 * 1024
      ? await workerRender(e.doc.text, opts).catch(() => render(e.doc.text, opts))
      : render(e.doc.text, opts);
    if (n !== seq) return;

    const tpl = document.createElement('template');
    tpl.innerHTML = rendered.html;
    const nodes = Array.from(tpl.content.children);
    if (chunkIdle && window.cancelIdleCallback) window.cancelIdleCallback(chunkIdle);

    if (nodes.length <= 150) {
      prev.replaceChildren(...nodes);
      fixMedia(prev, baseDir, asset);
      prev.scrollTop = keep;
      shown = id;
      hydrateMermaid(prev, id);
      watchMath();
      return;
    }

    const bmap = buildBlockMap(prev);
    const visibleLine = bmap.length ? Math.round(offsetToLine(bmap, keep)) : 1;
    let mid = nodes.findIndex((el) => {
      const a = Number(el.dataset?.srcLine || 0), b = Number(el.dataset?.srcEnd || 0);
      return a <= visibleLine && b >= visibleLine;
    });
    if (mid < 0) mid = 0;
    const firstEnd = Math.min(nodes.length, Math.max(mid + 60, 100));
    prev.replaceChildren(...nodes.slice(0, firstEnd));
    fixMedia(prev, baseDir, asset);
    prev.scrollTop = keep;
    shown = id;

    let cursor = firstEnd;
    const step = () => {
      if (n !== seq) return;
      const chunk = nodes.slice(cursor, cursor + 80);
      if (chunk.length) {
        prev.append(...chunk);
        fixMedia(prev, baseDir, asset);
        cursor += 80;
        if (cursor < nodes.length) {
          if (window.requestIdleCallback) chunkIdle = window.requestIdleCallback(step, { timeout: 300 });
          else setTimeout(step, 16);
        } else {
          hydrateMermaid(prev, id);
          watchMath();
        }
      }
    };
    if (cursor < nodes.length) {
      if (window.requestIdleCallback) chunkIdle = window.requestIdleCallback(step, { timeout: 300 });
      else setTimeout(step, 16);
    } else {
      hydrateMermaid(prev, id);
      watchMath();
    }
  }

  function schedule(now) {
    clearTimeout(timer);
    if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle);
    if (chunkIdle && window.cancelIdleCallback) window.cancelIdleCallback(chunkIdle);
    const e = documents.getEntry(active());
    const delay = now ? 0 : Math.min(80 + ((e ? e.doc.text.length : 0) >> 6), 1500);
    timer = setTimeout(() => {
      if (window.requestIdleCallback) idle = window.requestIdleCallback(paint, { timeout: 800 });
      else paint();
    }, delay);
  }

  const copy = (el) => ctx.commands.execute('preview.copy-code', el);
  const toggleTask = (box) => {
    const li = box.closest('li[data-src-line]'), v = editorRun('view');
    if (!li || !v) return;
    const ln = Number(li.dataset.srcLine);
    if (!(ln >= 1 && ln <= v.state.doc.lines)) return;
    const L = v.state.doc.line(ln), m = /^((?:\s*>)*\s*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])\]/.exec(L.text);
    if (!m) return;
    const at = L.from + m[1].length;
    v.dispatch({ changes: { from: at, to: at + 1, insert: m[2] === ' ' ? 'x' : ' ' }, userEvent: 'input.task' });
  };
  prev.addEventListener('keydown', (ev) => {
    const c = ev.target.classList;
    if ((ev.key === 'Enter' || ev.key === ' ') && c && c.contains('lt-copy')) { ev.preventDefault(); copy(ev.target); }
    else if ((ev.key === ' ' || ev.key === 'Enter') && c && c.contains('lt-task')) { ev.preventDefault(); toggleTask(ev.target); }
  });
  const onClick = (ev) => {
    if (ev.button > 1) return;
    const cp = ev.type === 'click' && ev.target.closest && ev.target.closest('.lt-copy');
    if (cp) { ev.preventDefault(); copy(cp); return; }
    const tk = ev.type === 'click' && ev.target.closest && ev.target.closest('.lt-task');
    if (tk) { ev.preventDefault(); toggleTask(tk); return; }
    const a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    ev.preventDefault();
    const href = a.getAttribute('href') || '';
    if (href[0] === '#') {
      let id = href.slice(1);
      try { id = decodeURIComponent(id); } catch { /* keep raw */ }
      const t = id && prev.querySelector(`[id="${CSS.escape(id)}"]`);
      if (t) t.scrollIntoView({ block: 'start' });
    } else if (/^(?:https?:\/\/|mailto:)/i.test(href)) { ev.stopPropagation(); window.open(a.href || href, '_blank', 'noopener'); }
  };
  prev.addEventListener('click', onClick);
  prev.addEventListener('auxclick', onClick);
  prev.addEventListener('error', (ev) => brokenImage(ev.target), true);

  const keep = (f) => { if (typeof f === 'function') offs.push(f); };
  const mo = new MutationObserver(() => schedule(true));
  const dispose = () => { clearTimeout(timer); if (chunkIdle && window.cancelIdleCallback) window.cancelIdleCallback(chunkIdle); mo.disconnect(); offs.splice(0).forEach((f) => f()); };
  keep(documents.onDocChange((id) => { label(); if (id === active()) schedule(false); }));
  keep(store.subscribe((s) => s.editorGroups.groups[slot]?.activeId, () => { label(); schedule(true); }));
  keep(store.subscribe((s) => s.ui.mode, () => schedule(true)));
  keep(settings.subscribe((changed) => { if (changed && ('markdown.defaultProfile' in changed || 'markdown.anchorStrategy' in changed || 'markdown.htmlPassthrough' in changed || 'markdown.wikiLinks' in changed || 'bibliography.defaultPath' in changed || 'bibliography.style' in changed)) { label(); schedule(true); } }));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  keep(onTreeChange(() => { wStamp = 0; if (wIdx) schedule(false); }));
  label();
  schedule(true);
  return dispose;
}
