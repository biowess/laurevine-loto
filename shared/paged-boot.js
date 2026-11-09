// Classic script, loaded before vendor/pagedjs/paged.polyfill.js in every paged publication (preview iframe and PDF window).
// Paginates once fonts are loaded, then reports { lotoPaged: 'done' | 'error', pages, message } via data attributes and postMessage.
window.PagedConfig = { auto: false };
addEventListener('message', (e) => {
  if (e.source !== parent || !e.data || !e.data.lotoThumb) return;
  const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'), pg = [...document.querySelectorAll('.pagedjs_page')].map((p) => p.outerHTML).join('');
  parent.postMessage({ lotoThumbHtml: `<style>${css}</style><div class="pagedjs_pages">${pg}</div>` }, '*');
});
const pgv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// 45a pre-pass (before Paged.js): captions stay with figure/table, small tables stay whole, no lone first/last table row, consecutive breaks collapse.
function prepass() {
  const last = (e) => { while (e && e.lastElementChild) e = e.lastElementChild; return e; };
  const prevOf = (e) => { while (e && !e.previousElementSibling && e.parentElement !== document.body) e = e.parentElement; return e && e.previousElementSibling; };
  const brk = (e) => { e = last(e); return !!(e && e.closest('.lv-brk,.lv-cover,.lv-toc')); };
  if (pgv('--lv-pg-cap') === '1') for (const c of document.querySelectorAll('.lv-cap-b')) if (c.previousElementSibling) c.previousElementSibling.classList.add('lv-kn');
  const small = +pgv('--lv-pg-small') || 0, row = pgv('--lv-pg-row') === '1';
  for (const t of document.querySelectorAll('.lv-body table')) {
    const r = t.querySelectorAll('tbody tr'), n = r.length;
    if (small && n <= small) t.classList.add('lv-ti');
    else if (row && n >= 3) { r[0].classList.add('lv-ka'); r[n - 1].classList.add('lv-kb'); }
  }
  if (pgv('--lv-pg-brk') !== '1') return;
  for (const b of document.querySelectorAll('.lv-brk')) if (brk(prevOf(b)) || (b.nextElementSibling && b.nextElementSibling.matches('.lv-h1pb'))) b.remove();
  for (const h of document.querySelectorAll('.lv-h1pb')) if (brk(prevOf(h))) h.classList.remove('lv-h1pb');
}
// 45a tidy (after Paged.js): drops repeated table headers when off and blank pages (e.g. after an exact fill).
function tidy() {
  if (pgv('--lv-pg-thead') !== '1') for (const t of document.querySelectorAll('table[data-split-from] thead')) t.remove();
  if (pgv('--lv-pg-empty') !== '1') return;
  for (const p of [...document.querySelectorAll('.pagedjs_page')]) {
    const c = p.querySelector('.pagedjs_page_content');
    if (c && !c.textContent.trim() && !c.querySelector('img,svg,canvas,hr,table,pre')) {
      if (document.querySelectorAll('.pagedjs_page').length > 1) p.remove();
    }
  }
}
// 45b post-layout check on the real rendered pages: stranded headings, single-line split fragments, near-empty pages -> [{ page, kind, text }].
function checkPages() {
  const out = [], pages = [...document.querySelectorAll('.pagedjs_page')], txt = (e) => (e.textContent || '').trim().slice(0, 40);
  pages.forEach((pg, i) => {
    const c = pg.querySelector('.pagedjs_page_content');
    if (!c || c.querySelector('.lv-cover,.lv-toc')) return;
    const n = i + 1, ct = c.getBoundingClientRect();
    for (const h of c.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const r = document.createRange();
      r.selectNodeContents(c); r.setStartAfter(h);
      const f = r.cloneContents();
      if (!f.textContent.trim() && !f.querySelector('img,svg,canvas,table,pre,hr')) out.push({ page: n, kind: 'heading', text: txt(h) });
    }
    for (const p of c.querySelectorAll('p[data-split-from],p[data-split-to],li[data-split-from],li[data-split-to]')) {
      const s = getComputedStyle(p), lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
      if (Math.round(p.getBoundingClientRect().height / lh) <= 1) out.push({ page: n, kind: 'fragment', text: txt(p) });
    }
    const nx = pages[i + 1] && pages[i + 1].querySelector('.pagedjs_page_content'), f1 = nx && nx.querySelector('h1,h2,h3,h4,h5,h6,p,li,table,pre,img');
    if (c.querySelector('.lv-brk') || (f1 && f1.classList.contains('lv-h1pb'))) return;
    let used = 0;
    for (const e of c.querySelectorAll('*')) used = Math.max(used, e.getBoundingClientRect().bottom - ct.top);
    if (ct.height && used / ct.height < 0.1) out.push({ page: n, kind: 'empty', text: '' });
  });
  return out;
}
function getTocPages() {
  const pg = [...document.querySelectorAll('.pagedjs_page')];
  const map = [];
  for (const a of document.querySelectorAll('.lv-toc [href^="#"]')) {
    const id = a.getAttribute('href');
    const el = document.querySelector(id) || (() => { try { return document.querySelector(decodeURIComponent(id)); } catch { return null; } })();
    if (!el) continue;
    let n = 0;
    for (const p of pg) {
      const s = getComputedStyle(p), r = s['counter-reset'].replace('page', '').trim(), inc = s['counter-increment'].replace('page', '').trim();
      if (r !== 'none') n = parseInt(r, 10);
      if (inc !== 'none') n += parseInt(inc, 10);
      if (p.contains(el)) { map.push(`${id}:${n}`); break; }
    }
  }
  return map.join(',');
}

addEventListener('load', async () => {
  const root = document.documentElement;
  const post = (m) => {
    root.dataset.paged = m.lotoPaged;
    if (m.message) root.dataset.pagedError = m.message;
    parent.postMessage(m, '*');
  };
  try {
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
    await document.fonts.ready;
    prepass();
    const bodyHtml = document.body.innerHTML;
    const origStyles = [...document.querySelectorAll('style:not([data-pagedjs-inserted-styles], [media~="screen"])')].map((el) => {
      const o = {}; o[window.location.href] = el.textContent; return o;
    });
    let flow = await window.PagedPolyfill.preview();
    await document.fonts.ready;
    // shortcut: max 2 passes guards against reflow oscillation loops, upgrade with cycle-detection if 3+ passes needed.
    const maxPasses = 2;
    let lastPages = getTocPages(), pass = 1;
    while (pass < maxPasses && lastPages) {
      const tmpl = document.querySelector('template[data-ref="pagedjs-content"]');
      if (tmpl) tmpl.innerHTML = bodyHtml;
      flow = await window.PagedPolyfill.preview(tmpl ? tmpl.content : null, origStyles);
      await document.fonts.ready;
      const nextPages = getTocPages();
      if (nextPages === lastPages) break;
      lastPages = nextPages;
      pass++;
    }
    const lb = [...document.querySelectorAll('.pagedjs_page_content .lv-body')].pop();
    if (lb && getComputedStyle(lb).getPropertyValue('--lv-bal').trim() === '1') { lb.style.height = 'auto'; lb.style.columnFill = 'balance'; }
    tidy();
    const pg = [...document.querySelectorAll('.pagedjs_page')], r = pg[0] && pg[0].getBoundingClientRect();
    const affected = pg.map((p, i) => (p.querySelector('[data-sec-rule],[data-sec-cols],.lv-sec-cover') || p.classList.contains('pagedjs_named_page') ? i + 1 : 0)).filter(Boolean);
    post({ lotoPaged: 'done', pages: pg.length, affected, w: r ? r.width : 0, h: r ? r.height : 0, titles: pg.map((p) => (p.textContent || '').trim().slice(0, 60)), issues: checkPages() });
  } catch (e) {
    post({ lotoPaged: 'error', message: String((e && e.message) || e).slice(0, 300) });
  }
});
// Preview controls from the Studio (zoom, spread, scroll to page) and reports back the current page and Ctrl+wheel.
document.head.insertAdjacentHTML('beforeend', '<style media="screen">.lv-spread .pagedjs_pages{display:grid;grid-template-columns:repeat(2,max-content);justify-content:center;column-gap:16px;row-gap:28px;margin:0 auto;width:100%}.lv-spread .pagedjs_page:first-child{grid-column:2}</style>');
const pgs = () => [...document.querySelectorAll('.pagedjs_page')];
// Current page = the one with the most visible area (like PDF readers); stable at the document end.
const cur = () => { let b = 0, v = -1; pgs().forEach((p, i) => { const r = p.getBoundingClientRect(), a = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (a > v + 1) { v = a; b = i; } }); return b; };
// Zoom/spread reflow keeps the page under the viewport centre in place instead of jumping.
const anchor = () => { const p = pgs()[cur()]; if (!p) return null; const r = p.getBoundingClientRect(); return { p, o: (innerHeight / 2 - r.top) / (r.height || 1) }; };
const restore = (k) => { const r = k.p.getBoundingClientRect(); scrollBy({ top: r.top + k.o * r.height - innerHeight / 2, behavior: 'instant' }); };
let tick = 0, tm = 0, lock = 0, last = 0;
addEventListener('message', (e) => {
  const m = e.data && e.data.lotoView, d = document.documentElement;
  if (!m || e.source !== parent) return;
  const keep = !m.page && (m.zoom || typeof m.spread === 'boolean') ? anchor() : null;
  if (m.zoom) d.style.zoom = m.zoom;
  if (typeof m.spread === 'boolean') d.classList.toggle('lv-spread', m.spread);
  if (typeof m.snap === 'boolean') d.classList.toggle('lv-snap', m.snap);
  if (keep) restore(keep);
  const t = m.page && pgs()[m.page - 1];
  if (!t) return;
  const sm = m.smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sm) lock = Date.now() + 1500;
  t.scrollIntoView({ block: d.classList.contains('lv-snap') ? 'center' : 'start', behavior: sm ? 'smooth' : 'instant' });
});
addEventListener('keydown', (e) => {
  const k = e.key, c = e.ctrlKey || e.metaKey;
  if (!(c ? '+=-_012'.includes(k) : ['PageUp', 'PageDown', 'Home', 'End'].includes(k))) return;
  e.preventDefault();
  parent.postMessage({ lotoKey: { key: k, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey } }, '*');
});
addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); parent.postMessage({ lotoWheel: e.deltaY }, '*'); } }, { passive: false });
const report = () => { const n = cur() + 1; if (n !== last) { last = n; parent.postMessage({ lotoAt: n }, '*'); } };
addEventListener('scroll', () => {
  if (Date.now() < lock) { clearTimeout(tm); tm = setTimeout(report, 160); return; }
  if (!tick) tick = requestAnimationFrame(() => { tick = 0; report(); });
}, true);
addEventListener('scrollend', () => { lock = 0; clearTimeout(tm); report(); }, true);
