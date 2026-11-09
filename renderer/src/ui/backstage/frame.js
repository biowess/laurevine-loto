import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { has, register } from '../../commands/registry.js';
import { h, $ } from '../kit/dom.js';
import { bindRestore } from './restore.js';
import { icon } from '../kit/icons.js';
import { runCommand } from '../shell/panels.js';
import { backstagePages } from './registry.js';
import { page as pageEl } from './page-kit.js';
import { rove } from '../kit/roving.js';

const go = (id) => store.dispatch(uiActions.backstage(true, id));

function registerCommands(pages) {
  for (const p of pages) {
    const id = `backstage.${p.id}`;
    if (has(id)) continue;
    register(p.render ? { id, title: p.title, icon: p.icon, group: 'File', run: () => go(p.id) } : { id, title: p.title, icon: p.icon, group: 'File', planned: true });
  }
  if (!has('backstage.close')) register({ id: 'backstage.close', title: 'Back', icon: 'arrow-left', group: 'File', run: () => store.dispatch(uiActions.backstage(false)) });
}

// Title rule follows the page's own content: widest content block + 20px (actions, subtitles and section captions don't count).
const fitRule = (main) => {
  const t = main.querySelector(':scope > h2, :scope > .lv-open > h2');
  if (!t) return;
  t.style.width = t.style.maxWidth = '';
  let w = 0, x = 20;
  for (const c of t.parentElement.children) if (c !== t && !c.matches('p.sub, h4, .md-cta, .lv-tgal, .lv-chips')) { const cw = c.getBoundingClientRect().width; if (cw > w) { w = cw; x = parseFloat(getComputedStyle(c).getPropertyValue('--rule-x')) || 20; } }
  if (!w) return;
  t.style.maxWidth = 'none';
  t.style.width = `${Math.min(Math.ceil(w) + x, main.clientWidth - parseFloat(getComputedStyle(main).paddingLeft))}px`;
};

export function mountBackstage(root = $('#backstage')) {
  const pages = backstagePages.list();
  registerCommands(pages);
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'File');
  const nav = (id, title, ic, on) => h('button', { type: 'button', class: on ? 'is-on' : null, 'aria-current': on ? 'page' : null, dataset: { cmd: id }, onclick: () => runCommand(id) }, icon(ic), h('span', {}, title));
  const body = (cur) => {
    if (!cur.render) return pageEl(cur.title, 'Not available yet.');
    try { return [cur.render(), cur.planned ? h('p', { class: 'sub', style: { marginTop: '18px' } }, 'Preview only: not connected yet.') : null]; }
    catch (e) { console.error('[backstage]', cur.id, e); return pageEl(cur.title, 'This page could not be shown.'); }
  };
  const cache = new Map(), fresh = new Set();
  let side = null, main = null, shown = null;
  const nodesOf = (cur, warm) => {
    if (!cur.after) return body(cur);
    if (!cache.has(cur.id)) {
      cache.set(cur.id, body(cur));
      if (warm) fresh.add(cur.id);
      try { const r = cur.after(); if (r && r.catch) r.catch(() => {}); } catch (e) { console.error('[backstage]', cur.id, e); }
    }
    return cache.get(cur.id);
  };
  const refreshNav = (cur) => side.querySelectorAll('button[data-cmd]').forEach((b) => {
    const on = b.dataset.cmd === `backstage.${cur.id}`;
    b.classList.toggle('is-on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const draw = () => {
    const { open, page } = store.get().ui.backstage;
    root.hidden = !open;
    if (!open) { shown = null; return root.replaceChildren(); }
    const cur = backstagePages.get(page) || pages[0];
    if (!side) {
      side = h('nav', { class: 'md-bnav', 'aria-label': 'File pages' }, nav('backstage.close', 'Back', 'arrow-left'), h('hr'), ...pages.map((p) => nav(`backstage.${p.id}`, p.title, p.icon)));
      main = h('div', { class: 'md-bmain' });
      new ResizeObserver(() => fitRule(main)).observe(main);
      rove(side, 'button', { orientation: 'vertical' });
    }
    refreshNav(cur);
    if (root.firstChild !== side) root.replaceChildren(side, main);
    if (shown !== cur.id) {
      const wasCached = cur.after && cache.has(cur.id), skip = fresh.delete(cur.id);
      main.replaceChildren(...[].concat(nodesOf(cur)).flat().filter(Boolean));
      if (shown !== null) main.scrollTop = 0;
      shown = cur.id;
      fitRule(main);
      if (wasCached && !skip && cur.after) { try { const r = cur.after(); if (r && r.catch) r.catch(() => {}); } catch (e) { console.error('[backstage]', cur.id, e); } }
    }
    if (!root.contains(document.activeElement)) $('.is-on', side)?.focus();
  };
  const reset = () => { cache.clear(); fresh.clear(); side = main = shown = null; draw(); };
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  const warm = () => idle(() => pages.filter((p) => p.render && p.after).forEach((p) => nodesOf(p, true)));
  const off = [bindRestore(), store.subscribe((s) => s.ui.backstage, draw), store.subscribe((s) => s.ui.theme, reset)];
  draw(); warm();
  return () => off.forEach((f) => f());
}
