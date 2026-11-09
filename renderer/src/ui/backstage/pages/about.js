import { h } from '../../kit/dom.js';
import { register, has } from '../../../commands/registry.js';
import { openDialog } from '../../kit/dialog.js';
import { CH, IPC_VERSION } from '../../../../../shared/channels.js';
import { getNotices, getAppInfo } from '../../../services/app-info.js';
import { render as renderMd } from '../../../core/markdown/renderer.js';
import { cta, rows } from '../page-kit.js';

const DOCS = {
  notices: ['Third-Party License Notices', 'THIRD_PARTY_NOTICES.md'],
  license: ['Apache License 2.0', 'LICENSE.txt'],
  trademark: ['Trademark & Brand Assets', 'TRADEMARK.md'],
};

/* ---- app version: fetched once, cached, never shown as "loading" ---- */
let version = '';
const subs = new Set();
const infoP = (() => { try { return getAppInfo().then((i) => { version = String((i && i.version) || ''); subs.forEach((f) => f()); }).catch(() => {}); } catch { return Promise.resolve(); } })();
const bind = (el, fmt) => { const f = () => { el.textContent = version ? fmt(version) : ''; if (!el.isConnected) subs.delete(f); }; subs.add(f); f(); return el; };

/* ---- markdown documents: cached text, chunked + lazily rendered ---- */
const docs = new Map(); // doc -> { p: Promise<chunks[]>, html: string[] }
const CHUNK = 2600;

function prepare(doc, text) {
  let lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  if (doc === 'license') { // plain text: strip indentation, keep short title blocks as hard breaks
    const paras = lines.map((l) => l.trim()).join('\n').split(/\n{2,}/).filter(Boolean).map((p, i) => {
      const ls = p.split('\n');
      if (i === 0 && ls.length <= 4) return `## ${ls[0]}\n${ls.slice(1).join('  \n')}`;
      return ls.length <= 3 && ls.every((l) => l.length < 60) ? ls.join('  \n') : p;
    });
    lines = paras.join('\n\n').split('\n');
  }
  const out = []; let cur = [], size = 0, fence = false;
  for (const l of lines) {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    cur.push(l); size += l.length + 1;
    if (!fence && size >= CHUNK && l.trim() === '') { out.push(cur.join('\n')); cur = []; size = 0; }
  }
  if (cur.length) out.push(cur.join('\n'));
  return out;
}

function load(doc) {
  let e = docs.get(doc);
  if (!e) {
    e = { html: [], p: getNotices(doc).then((r) => prepare(doc, r && r.text)) };
    e.p.catch(() => docs.delete(doc));
    docs.set(doc, e);
  }
  return e;
}

function mountDoc(box, e, chunks) {
  const nodes = chunks.map(() => h('section', { class: 'lv-md__c', style: { minHeight: '480px' } }));
  const fill = (i) => {
    const n = nodes[i];
    if (!n || n.dataset.r) return;
    n.dataset.r = '1';
    n.innerHTML = e.html[i] ??= renderMd(chunks[i]).html;
    n.style.minHeight = '';
  };
  box.replaceChildren(...nodes);
  for (let i = 0; i < Math.min(2, nodes.length); i++) fill(i);
  const io = new IntersectionObserver((es) => { for (const x of es) if (x.isIntersecting) fill(nodes.indexOf(x.target)); }, { root: box, rootMargin: '2400px 0px' });
  nodes.forEach((n) => io.observe(n));
  let next = 2;
  const pump = () => {
    if (!box.isConnected) return io.disconnect();
    const t = performance.now();
    while (next < nodes.length && performance.now() - t < 6) fill(next++);
    if (next < nodes.length) requestAnimationFrame(pump); else io.disconnect();
  };
  requestAnimationFrame(pump);
}

function openDoc(doc) {
  const [title, file] = DOCS[doc];
  const box = h('div', { class: 'lv-md', tabindex: '0' });
  box.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    ev.preventDefault();
    if (/^https?:/i.test(a.getAttribute('href'))) window.open(a.href, '_blank', 'noopener');
  });
  openDialog({ title, icon: 'file-text', width: 780, cls: 'lv-mddlg', body: box });
  const e = load(doc);
  e.p.then((chunks) => mountDoc(box, e, chunks), () => { box.textContent = `Could not be loaded. See ${file} in the application folder.`; });
}

for (const [doc, [title]] of Object.entries(DOCS)) {
  const id = 'about.' + doc;
  if (!has(id)) register({ id, title, icon: 'file-text', group: 'Help', run: () => openDoc(doc) });
}

const mask = (cls) => h('span', { class: cls, 'aria-hidden': 'true' });

export default {
  id: 'about', title: 'About', icon: 'circle-help',
  render: () => {
    const list = rows([['tag', 'Version', ''], ['plug', 'IPC version', `v${IPC_VERSION} · ${Object.keys(CH).length} channels`], ['building-2', 'Made by', 'Biowess']]);
    bind(list.firstChild.querySelector('small'), (v) => v);
    const buttons = cta(['about.license', 'View License', 'file-text'], ['about.notices', 'Third-Party Notices', 'file-text'], ['about.trademark', 'Trademark Policy', 'file-text']);
    buttons.classList.add('lv-about__cta');
    return [h('h2', {}, 'About'), h('p', { class: 'sub' }, 'A local-first Markdown editor and publishing app. Part of the Laurevine family, alongside Plum and Rose.'), h('div', { class: 'lv-about' },
      h('div', { class: 'lv-about__brand', role: 'img', 'aria-label': 'Laurevine Loto' }, mask('lv-about__icon'), mask('lv-about__wordmark')),
      h('h4', {}, 'Application'), list,
      h('h4', {}, 'License'),
      h('section', { class: 'lv-about__license' },
        h('b', {}, 'Apache License 2.0'),
        h('p', {}, 'Copyright © Biowess. Licensed under the Apache License, Version 2.0; you may not use this software except in compliance with the License. The Laurevine Loto name, logo and visual design are reserved (see Trademark Policy). Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, without warranties or conditions of any kind, either express or implied.')),
      buttons)];
  },
  after: () => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 50));
    idle(() => Object.keys(DOCS).forEach(load));
  },
};
