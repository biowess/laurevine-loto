// Insert > Equation Editor: mode pills, live KaTeX preview, category symbol keyboard and a LaTeX source box that stay in sync.
import { h, $, $$ } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { loadKatex, getKatex } from '../../services/lazy-libs.js';
import { EQ_CATS } from './equation-cats.js';

const MODES = [['inline', 'Inline'], ['display', 'Display'], ['align', 'Align']];
const ALIGNED = /\\begin\{aligned?\*?\}/;
// TeX actually rendered/inserted for a mode: Align wraps bare rows in an aligned environment.
export const eqBody = (mode, tex) => (mode === 'align' && !ALIGNED.test(tex) ? `\\begin{aligned}\n${tex}\n\\end{aligned}` : tex);

export function openEquationDialog({ openDialog, toast }, { text, onInsert }) {
  const pills = h('div', { class: 'eq-mode' }, MODES.map(([m, l], i) => h('button', { class: 'eq-mode__pill' + (i ? '' : ' is-on'), type: 'button', 'data-m': m }, l)));
  const prev = h('div', { class: 'eq-prev' }), tabs = h('div', { class: 'eq-tabs' }), grid = h('div', { class: 'eq-grid' });
  const src = h('textarea', { class: 'eq-src', rows: 2, placeholder: 'LaTeX: type here or click symbols above', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'LaTeX source' });
  const nav = (dir, label) => h('button', { class: 'eq-tabs-nav', type: 'button', 'aria-label': label, title: label, onclick: () => tabs.scrollBy({ left: dir * 140, behavior: 'smooth' }) }, icon(dir < 0 ? 'chevron-left' : 'chevron-right'));
  const body = h('div', {}, pills, prev, h('div', { class: 'eq-kb' }, h('div', { class: 'eq-tabs-bar' }, nav(-1, 'Previous categories'), tabs, nav(1, 'Next categories')), grid), src);
  const mode = () => $('.is-on', pills).dataset.m;
  const hint = () => prev.replaceChildren(h('span', { class: 'eq-prev__hint' }, 'Start typing below…'));

  const render = () => {
    const v = src.value.trim(), k = getKatex();
    if (!v) return hint();
    if (!k) { prev.textContent = v; return; }
    prev.replaceChildren();
    try { k.render(eqBody(mode(), v), prev, { displayMode: mode() !== 'inline', throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false }); }
    catch (_) { prev.replaceChildren(h('span', { class: 'eq-prev__err' }, src.value)); }
  };
  src.addEventListener('input', render);
  pills.addEventListener('click', (e) => {
    const p = e.target.closest('.eq-mode__pill'); if (!p) return;
    $$('.eq-mode__pill', pills).forEach((x) => x.classList.toggle('is-on', x === p));
    render();
  });

  const cache = new Map();
  const keyHtml = (tex, label) => {
    const k = getKatex();
    if (!k) return null;
    if (cache.has(tex)) return cache.get(tex);
    let p = tex.replace(/▢/g, '\\Box');
    if (tex.startsWith('\\text{')) p = '\\text{Abc}';
    else if (tex.includes('\\cancelto')) p = '\\cancel{\\Box}';
    else if (tex.startsWith('\\begin{align')) p = p.replace(/\\begin\{align\*?\}/g, '\\begin{aligned}').replace(/\\end\{align\*?\}/g, '\\end{aligned}');
    let r = null;
    try { r = k.renderToString(p, { throwOnError: true, displayMode: false, strict: 'ignore', trust: false }).replace(/<span class="mord amsrm(?:\s+mtight)?">□<\/span>/g, '<span class="eq-ph"></span>'); } catch (_) { /* label fallback */ }
    cache.set(tex, r);
    return r;
  };
  const showCat = (i) => {
    $$('.eq-tab', tabs).forEach((t, n) => { t.classList.toggle('is-on', n === i); if (n === i) t.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    grid.replaceChildren(...EQ_CATS[i].items.map(([label, tex]) => {
      const b = h('button', { class: 'eq-key', type: 'button', title: tex, 'data-t': tex }), r = keyHtml(tex, label);
      if (r) b.innerHTML = r; else b.textContent = label; // KaTeX output only (trust:false)
      return b;
    }));
  };
  tabs.append(...EQ_CATS.map((c, i) => h('button', { class: 'eq-tab' + (i ? '' : ' is-on'), type: 'button', onclick: () => showCat(i) }, c.id)));
  tabs.addEventListener('wheel', (e) => { if (e.deltaY) { e.preventDefault(); tabs.scrollLeft += e.deltaY; } }, { passive: false });
  showCat(0);

  const put = (tex) => {
    const s = src.selectionStart, e = src.selectionEnd, cur = src.value.slice(s, e);
    src.setRangeText(cur && tex.includes('▢') ? tex.replace('▢', cur) : tex, s, e, 'end');
    const n = src.value.indexOf('▢', s);
    if (n >= 0) src.setSelectionRange(n, n + 1);
    src.focus(); render();
  };
  grid.addEventListener('click', (e) => { const b = e.target.closest('.eq-key'); if (b) put(b.dataset.t); });
  src.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const n = src.value.indexOf('▢', src.selectionEnd);
    if (n < 0) return;
    e.preventDefault(); e.stopPropagation(); src.setSelectionRange(n, n + 1);
  });

  src.value = text; render();
  loadKatex().then(() => { showCat(Math.max(0, $$('.eq-tab', tabs).findIndex((t) => t.classList.contains('is-on')))); render(); }, () => {});

  openDialog({
    title: 'Equation Editor', icon: 'sigma', width: 720, cls: 'dlg--eq', body, focus: '.eq-src',
    buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: () => {
      const c = src.value.trim();
      if (!c) { toast('Type or build an equation first'); return false; }
      if (c.includes('▢')) { toast('Fill in the ▢ placeholders first'); return false; }
      onInsert(mode(), eqBody(mode(), c));
    } }],
  });
  src.select();
}
