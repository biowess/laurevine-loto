import { h, append } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { toast } from '../kit/toast.js';
import { execute, get } from '../../commands/registry.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';

const reg = new Map(), subs = new Set(), SIDES = ['left', 'right'];
const key = (side, id) => `${side}:${id}`;
const emit = () => { for (const f of [...subs]) try { f(); } catch (e) { console.error('[panels]', e); } };

// render(ctx) returns a Node, a string (text) or an array of them; never HTML.
export const panels = {
  register(def) {
    const ok = def && /^[a-z][a-z0-9-]*$/.test(def.id || '') && SIDES.includes(def.side) && def.title && def.icon && typeof def.render === 'function';
    if (!ok) throw new TypeError(`panels: bad definition "${def && def.id}"`);
    const k = key(def.side, def.id);
    reg.set(k, Object.freeze({ ...def, actions: [...(def.actions || [])] }));
    emit();
    return () => { if (reg.delete(k)) emit(); };
  },
  get: (side, id) => reg.get(key(side, id)),
  list: (side) => [...reg.values()].filter((p) => p.side === side),
  onChange: (fn) => { subs.add(fn); return () => subs.delete(fn); },
};

// Single routing point: always activates `view` on `side` and opens that sidebar (other side untouched). toggle=true closes it when already active.
export function openPanel(side, view, toggle = false) {
  const p = store.get().ui.panels[side];
  store.dispatch(uiActions.panel(side, { view, open: !(toggle && p.open && p.view === view) }));
}

export async function runCommand(id, arg) {
  const r = await execute(id, arg);
  if (r.planned) toast('Not available yet');
  else if (r.error) toast(r.error);
  return r;
}

export function renderSidebar(el, side, view, onView) {
  const all = panels.list(side), cur = panels.get(side, view) || all[0];
  if (!cur) return el.replaceChildren();
  let out = null;
  try { out = cur.render({ side }); } catch (e) { console.error('[panels]', cur.id, e); }
  const body = append(h('div', { class: 'md-sb' }), [out]);
  [...body.children].forEach((x, i) => x.style.setProperty('--i', Math.min(i, 14)));
  const panelId = `sbpanel-${side}`, tabId = (p) => `sbtab-${side}-${p.id}`;
  body.setAttribute('role', 'tabpanel'); body.id = panelId; body.setAttribute('aria-labelledby', tabId(cur));
  const tab = (p) => h('button', {
    type: 'button', id: tabId(p), class: p === cur ? 'is-on' : null, role: 'tab', 'aria-selected': String(p === cur),
    'aria-controls': p === cur ? panelId : null, title: p.title, 'aria-label': p.title, dataset: { k: p.id }, onclick: () => onView(p.id),
  }, icon(p.icon));
  const kept = el.contains(document.activeElement) && document.activeElement.closest('.md-sw') ? document.activeElement.dataset.k : null;
  const act = (a) => {
    const t = (get(a.command) || {}).title || a.title || a.command;
    return h('button', { type: 'button', class: 'tbtn', title: t, 'aria-label': t, dataset: { cmd: a.command }, onclick: () => runCommand(a.command) }, icon(a.icon));
  };
  el.replaceChildren(
    h('div', { class: 'md-sw', role: 'tablist', 'aria-label': `${side === 'left' ? 'Left' : 'Right'} sidebar views` }, ...all.map(tab)),
    h('div', { class: 'md-sh' }, h('span', { role: 'heading', 'aria-level': '2' }, cur.title), h('span', { class: 'sp' }), ...cur.actions.map(act)),
    body,
  );
  if (kept) { const t = [...el.querySelectorAll('.md-sw [data-k]')].find((n) => n.dataset.k === kept); if (t) t.focus(); }
}