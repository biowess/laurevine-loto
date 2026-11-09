import { buildPublication } from '../../core/publish/index.js';
import { getTemplate, templateConfig } from '../../core/publish/templates/index.js';
import { h } from '../../ui/kit/dom.js';
import { envFor } from '../publish/index.js';
import { mountPagedFrame } from '../publish/paged-frame.js';

const SAMPLE = `# The Quiet Library

*A short essay on reading slowly*

## Opening

A good library rewards patience. Shelves of quiet spines invite the reader to linger, to compare, and to return, and the best pages are the ones that survive a second reading without losing their shape.

> Typography is the voice of a page before a single word is read.

## Method

1. Choose one book and set a fixed hour.
2. Read without a screen nearby.
3. Write down one sentence worth keeping.

| Habit | Minutes | Notes |
| :--- | ---: | :--- |
| Morning pages | 20 | Before coffee |
| Slow reading | 45 | One chapter |
| Review | 10 | Highlights only |

### A small listing

\`\`\`
for shelf in library:
    read(shelf.first_book)
\`\`\`

## Closing

Lists, quotations, tables and code should all sit comfortably together. A template is judged by how calmly it handles each of them, page after page, from the first heading to the final paragraph. Longer passages show how the body face, the measure and the rhythm of the leading work in concert, and how headings keep their place without shouting over the text that follows them.`;

const done = new Map(), cache = new Map();
let chain = Promise.resolve();

async function render(id) {
  const cfg = templateConfig(id).config, d = { id: 'sample', name: 'Sample', path: '', text: SAMPLE, baseDir: '' };
  const pub = await buildPublication([d], cfg, await envFor(SAMPLE, cfg));
  const host = h('div', { class: 'lv-offscreen' }), f = (document.body.append(host), mountPagedFrame(host, pub.html));
  try {
    const r = await Promise.race([f.ready, new Promise((res) => setTimeout(() => res({ lotoPaged: 'error' }), 20000))]);
    if (r.lotoPaged !== 'done') return null;
    const html = await new Promise((res) => {
      const on = (e) => { if (e.source === f.frame.contentWindow && e.data && e.data.lotoThumbHtml) { removeEventListener('message', on); res(e.data.lotoThumbHtml); } };
      addEventListener('message', on); f.frame.contentWindow.postMessage({ lotoThumb: 1 }, '*');
    });
    return { html, w: r.w, h: r.h, pages: r.pages || 1 };
  } finally { f.destroy(); host.remove(); }
}

// Real render of the sample document with the template's own defaults, one at a time, cached for the session.
export function thumb(id) {
  if (!cache.has(id)) { const p = (chain = chain.then(() => render(id)).catch(() => null)).then((r) => { done.set(id, r); return r; }); cache.set(id, p); }
  return cache.get(id);
}

const srcdoc = (t, all) => `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:"><style>html,body{overflow:hidden}body{margin:0;background:#d9d6cf}.pagedjs_page{margin:0 0 12px!important}${all ? '' : '.pagedjs_page~.pagedjs_page{display:none}'}</style>${t.html}`;

const frameEl = (t, width, all) => {
  const s = width / t.w, ph = all ? t.pages * (t.h + 12) : t.h;
  return h('div', { class: 'lv-tt', style: { width: `${width}px`, height: `${Math.round(ph * s)}px` } },
    h('iframe', { sandbox: '', scrolling: 'no', tabindex: '-1', title: 'Template sample', srcdoc: srcdoc(t, all), style: { width: `${t.w}px`, height: `${ph}px`, transform: `scale(${s})` } }));
};
const show = (box, r, w, all) => box.replaceChildren(r ? frameEl(r, w, all) : h('span', {}, 'No preview'));

export function gallery(c, ed, list) {
  return h('div', { class: 'lv-gal' }, ...list.map((t) => {
    const box = h('div', { class: 'lv-gth' }, h('span', {}, 'Rendering…'));
    if (done.has(t.id)) show(box, done.get(t.id), 120, false); else thumb(t.id).then((r) => show(box, r, 120, false));
    return h('div', { class: 'lv-gc' + (t.id === c.template ? ' is-on' : ''), onclick: () => ed.template(t.id) }, box,
      h('button', { type: 'button', class: 'lv-gn', 'aria-pressed': t.id === c.template ? 'true' : 'false', title: t.description, onclick: (e) => { e.stopPropagation(); ed.template(t.id); } }, t.name),
      h('span', { class: 'sub' }, t.description),
      h('button', { type: 'button', class: 'btn btn--sm', onclick: (e) => { e.stopPropagation(); ed.preview(t.id); } }, 'Preview'));
  }));
}

export function previewDialog(ctx, id) {
  const t = getTemplate(id);
  if (!t) return;
  const body = h('div', { class: 'lv-gprev' }, h('span', {}, 'Rendering…'));
  ctx.ui.openDialog({ title: `${t.name} template`, icon: 'layout-template', width: 560, body, buttons: [{ label: 'Close' }, { label: 'Use this template', primary: true, onClick: () => { ctx.ui.runCommand('studio.template', id); } }] });
  thumb(id).then((r) => show(body, r, 500, true));
}

// true = keep customizations, false = template defaults, null = cancel.
export const askKeep = (ctx) => new Promise((resolve) => {
  let r = null;
  ctx.ui.openDialog({
    title: 'Switch template', icon: 'layout-template', width: 440,
    body: 'You changed some settings. Keep your customizations on top of the new template, or use its defaults?',
    buttons: [{ label: 'Cancel' }, { label: 'Use template defaults', onClick: () => { r = false; } }, { label: 'Keep my customizations', primary: true, onClick: () => { r = true; } }],
    onClose: () => resolve(r),
  });
});

// Nested object of the values in b that differ from a, or null.
export const diff = (a, b) => {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b) ? null : b;
  const o = {};
  for (const k of Object.keys(b)) { const d = diff(a ? a[k] : undefined, b[k]); if (d !== null) o[k] = d; }
  return Object.keys(o).length ? o : null;
};
