import { h, $, $$ } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { openMenu } from '../kit/menu.js';
import { toast } from '../kit/toast.js';
import { rove } from '../kit/roving.js';
import { mountOverflow } from './overflow.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import * as cmd from '../../commands/registry.js';
import '../../commands/definitions/document.js';
import '../../commands/definitions/app.js';
import { CONSTRUCTS, LEVELS } from '../../core/markdown/portability.js';
import { parseLayout, resolve, toRibbon } from '../../core/ribbon/layout.js';
import { HOME, INSERT } from './model/home.js';
import { LAYOUT, VIEW, TOOLS } from './model/layout.js';
import { REFERENCES, REVIEW } from './model/review.js';

const BASE = [HOME, INSERT, LAYOUT, REFERENCES, REVIEW, VIEW, TOOLS];
export const BASE_TABS = BASE;
const LAYOUT_KEY = 'ribbon.layout';
const ctx = new Map();
const groupModels = new WeakMap();
let els = null, collapsed = false, view = null, roving = null, overflow = null;

const baseView = () => view ??= toRibbon(resolve(BASE, parseLayout(store.get().settings.values[LAYOUT_KEY]).layout, cmd.has).model);
const tabs = () => [...baseView(), ...[...ctx].map(([id, t]) => ({ id, label: t.label, groups: t.groups, ctx: true }))];
const parse = (s) => { const big = s[0] === '*', [id, m] = (big ? s.slice(1) : s).split('|'); return { id, big, menu: m ? m.split('/') : null }; };
const port = (c) => c.portable && CONSTRUCTS[c.portable];
const tip = (c) => c.title + (c.shortcut ? ` (${c.shortcut})` : '') + (c.planned ? ' — not available yet' : '') + (port(c) ? ` — ${LEVELS[port(c).level].label}: ${port(c).note}` : '');
const root = () => els.body.closest('.md') || document.body;

export async function runCommand(id, arg) {
  const r = await cmd.execute(id, arg);
  if (r.planned) toast('Not available yet');
  else if (r.error) toast(r.error);
  return r;
}

const menuItems = (ids) => ids.map((id) => {
  if (id === '-') return '-';
  const c = cmd.get(id);
  if (!c) return { label: id, disabled: true };
  return {
    label: c.title, icon: c.icon || undefined, hint: c.planned ? 'Soon' : c.shortcut || (port(c) ? LEVELS[port(c).level].short : undefined), title: port(c) ? tip(c) : undefined, disabled: !c.planned && !cmd.canRun(id),
    checked: c.checked ? () => cmd.isChecked(id) : undefined, onSelect: (_item, pt) => runCommand(id, pt),
  };
});

function button(it, gIcon, kind) {
  const c = cmd.get(it.id);
  const cls = kind === 'lg' ? 'rbtn--lg' : kind === 'ico' ? 'rbtn--icon' + (it.menu ? ' rbtn--icon-menu' : '') : 'rbtn--sm';
  return h('button', {
    type: 'button', class: `rbtn ${cls}`, dataset: it.menu ? { cmd: it.id, menu: '1' } : { cmd: it.id }, title: tip(c), 'aria-label': c.title,
    'aria-haspopup': it.menu ? 'menu' : null, 'aria-expanded': it.menu ? 'false' : null, onclick: (e) => (it.menu ? openMenu(e.currentTarget, menuItems(it.menu)) : runCommand(it.id, e.currentTarget)),
  }, h('span', { class: 'rbtn__ico' }, icon(c.icon || gIcon)), kind === 'ico' ? null : h('span', { class: 'rbtn__label' }, c.title), kind !== 'ico' && port(c) ? h('span', { class: `rbtn__badge pt-${port(c).level}`, 'aria-hidden': 'true' }, LEVELS[port(c).level].short) : null, it.menu ? icon('chevron-down', 'ic--chev') : null);
}

function renderGroup(g, gi) {
  const [name, ic, per, ...items] = g;
  const body = h('div', { class: 'rgroup__content' });
  let col = null, row = null;
  for (const s of items) {
    const it = parse(s);
    if (!cmd.has(it.id)) { console.warn('[ribbon] unknown command', it.id); continue; }
    if (it.big) { col = row = null; body.append(button(it, ic, 'lg')); continue; }
    if (per) {
      if (!row) { row = h('div', { class: 'rstack is-ico' }); body.append(row); col = null; }
      if (!col || col.children.length >= per) { col = h('div', { class: 'rrow' }); row.append(col); }
      col.append(button(it, ic, 'ico'));
    } else {
      if (!col || col.children.length >= 3) { col = h('div', { class: 'rstack' }); body.append(col); }
      col.append(button(it, ic, 'sm'));
    }
  }
  const el = h('div', { class: 'rgroup', role: 'group', 'aria-label': name, style: { '--i': gi }, dataset: { group: name } }, body, h('div', { class: 'rgroup__label' }, name));
  groupModels.set(el, g);
  return el;
}

function overflowItems(hidden) {
  return hidden.flatMap((g) => {
    const [name, , , ...items] = groupModels.get(g) || [];
    const rows = items.map(parse).filter((it) => cmd.has(it.id)).flatMap((it) => (it.menu ? [{ head: cmd.get(it.id).title }, ...menuItems(it.menu)] : menuItems([it.id])));
    return rows.length ? [{ head: name }, ...rows] : [];
  });
}

function sync() {
  if (!els) return;
  for (const b of $$('[data-cmd]', els.body)) {
    const c = cmd.get(b.dataset.cmd);
    if (!c) continue;
    const off = !c.planned && !cmd.canRun(c.id), on = !b.dataset.menu && cmd.isChecked(c.id);
    b.disabled = off;
    b.classList.toggle('is-planned', c.planned);
    b.classList.toggle('is-on', on);
    b.title = off ? `${c.title} (unavailable here)` : tip(c);
    if (c.planned) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    if (c.checked && !b.dataset.menu) b.setAttribute('aria-pressed', String(on)); else b.removeAttribute('aria-pressed');
  }
  if (roving) roving.refresh();
}

const current = () => { const id = store.get().ui.ribbonTab, all = tabs(); return all.find((t) => t.id === id) || all[0]; };

function renderBody() {
  if (!els) return;
  const t = current();
  els.body.replaceChildren(...t.groups.map(renderGroup));
  els.body.setAttribute('role', 'tabpanel');
  els.body.setAttribute('aria-labelledby', `rtab-${t.id}`);
  if (overflow) overflow.fit();
  sync();
}

function renderTabs() {
  if (!els) return;
  const had = els.tabs.contains(document.activeElement) && document.activeElement.dataset.tab, act = current().id;
  els.tabs.replaceChildren(
    h('button', { type: 'button', class: 'tab tab--file', role: 'tab', 'aria-selected': 'false', tabindex: -1, onclick: () => runCommand('file.backstage') }, 'File'),
    ...tabs().map((t) => h('button', {
      type: 'button', id: `rtab-${t.id}`, role: 'tab', class: 'tab' + (t.ctx ? ' tab--ctx' : '') + (t.id === act ? ' is-active' : ''),
      'aria-selected': String(t.id === act), tabindex: t.id === act ? 0 : -1, dataset: { tab: t.id }, onclick: () => select(t.id),
    }, t.label)),
  );
  if (had) { const b = $(`[data-tab="${had}"]`, els.tabs); if (b) b.focus(); }
}

const refresh = () => { renderTabs(); renderBody(); };
const peek = (v) => root().classList.toggle('ribbon-peek', !!v && collapsed);

export function select(id) {
  if (!tabs().some((t) => t.id === id)) return;
  if (collapsed) peek(true);
  store.dispatch(uiActions.ribbonTab(id));
}

export function focusTabs() {
  if (!els) return false;
  if (collapsed) peek(true);
  const t = $('.tab.is-active', els.tabs) || $('.tab', els.tabs);
  if (t) t.focus();
  return !!t;
}

export const collapse = (v) => { store.dispatch(uiActions.ribbonCollapsed(!!v)); };

function applyCollapse(v) {
  collapsed = !!v;
  root().classList.toggle('ribbon-collapsed', collapsed);
  if (!collapsed) peek(false);
  els.toggle.setAttribute('aria-expanded', String(!collapsed));
  els.toggle.title = collapsed ? 'Expand the ribbon' : 'Collapse the ribbon';
  cmd.invalidate('view.toggle-ribbon');
}

export const contextual = {
  show(id, { label, groups } = {}) {
    if (!/^[a-z][a-z0-9-]*$/.test(id || '') || BASE.some((t) => t.id === id)) throw new TypeError(`ribbon: bad contextual tab id "${id}"`);
    ctx.set(id, { label: String(label || id), groups: Array.isArray(groups) ? groups : [] });
    refresh();
  },
  hide(id) {
    if (!ctx.delete(id)) return;
    if (store.get().ui.ribbonTab === id) store.dispatch(uiActions.ribbonTab(baseView()[0].id));
    refresh();
  },
};

export function mountRibbon({ tabs: tabEl = $('#rtabs'), body = $('#ribbon') } = {}) {
  if (!tabEl || !body) return null;
  const toggle = h('button', { type: 'button', class: 'rbtn rbtn--icon tabrow__toggle', 'aria-label': 'Collapse the ribbon', 'aria-expanded': 'true', onclick: () => runCommand('view.toggle-ribbon') }, icon('chevron-up'));
  els = { tabs: tabEl, body, toggle };
  if (tabEl.parentElement) tabEl.parentElement.append(toggle);
  if (!cmd.has('view.toggle-ribbon')) {
    cmd.register({ id: 'view.toggle-ribbon', title: 'Collapse Ribbon', icon: 'chevron-up', group: 'Display', shortcut: 'Ctrl+F1', checked: () => collapsed, run: () => collapse(!collapsed) });
  }
  const toTabs = () => { const t = $('.tab.is-active', tabEl); if (t) t.focus(); };
  roving = rove(body, '.rbtn', {
    selected: false,
    onKey: (e, b) => {
      if (e.key === 'Escape' || e.key === 'ArrowUp') { e.preventDefault(); toTabs(); return true; }
      if (e.key === 'ArrowDown' && b.dataset.menu) { e.preventDefault(); b.click(); return true; }
      return false;
    },
  });
  overflow = mountOverflow(body, overflowItems, () => roving.refresh());
  tabEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cmd.execute('nav.focus-editor'); return; }
    if (e.key === 'ArrowDown' && document.activeElement.dataset.tab) {
      const b = $('.rbtn[tabindex="0"]', body) || $('.rbtn:not(:disabled)', body);
      if (b) { e.preventDefault(); b.focus(); }
      return;
    }
    const all = $$('.tab', tabEl), i = all.indexOf(document.activeElement);
    const to = { ArrowRight: all[(i + 1) % all.length], ArrowLeft: all[(i - 1 + all.length) % all.length], Home: all[0], End: all[all.length - 1] }[e.key];
    if (!to || i < 0) return;
    e.preventDefault();
    if (to.dataset.tab) select(to.dataset.tab); else to.focus();
  });
  body.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { body.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  document.addEventListener('pointerdown', (e) => { if (collapsed && !e.target.closest('.tabrow, .ribbon, .popover')) peek(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') peek(false); });
  document.addEventListener('focusin', (e) => { if (collapsed && !e.target.closest('.tabrow, .ribbon, .popover')) peek(false); });
  tabEl.addEventListener('dblclick', (e) => { if (e.target.closest('.tab')) runCommand('view.toggle-ribbon'); });
  store.subscribe((s) => s.ui.ribbonCollapsed, applyCollapse);
  applyCollapse(store.get().ui.ribbonCollapsed);
  store.subscribe((s) => s.ui.ribbonTab, refresh);
  store.subscribe((s) => s.settings.values[LAYOUT_KEY], () => { view = null; refresh(); });
  store.subscribe((s) => s.ui, sync);
  cmd.onChange((e) => { if (e.type === 'change') sync(); else { view = null; renderBody(); } });
  refresh();
  return { select, collapse, contextual };
}
