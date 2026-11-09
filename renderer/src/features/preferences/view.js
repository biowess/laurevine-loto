import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { runCommand } from '../../ui/shell/panels.js';
import { listSettings } from '../../../../shared/settings-schema.js';
import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { isModified, sectionItems, pageOf, matchSetting } from '../../core/preferences/model.js';
import { preferencePages } from './registry.js';
import { control } from './controls.js';

const st = { page: 'appearance', q: '', hit: null };
let syncs = [], mounted = null;

const set = async (id, value) => { const r = await runCommand('prefs.set', { id, value }); return r && r.ok ? null : (r && r.error) || 'The setting could not be changed.'; };
const reset = (cmd, title, arg, label) => h('button', { type: 'button', class: 'tbtn', title, 'aria-label': label || title, dataset: { cmd }, onclick: () => runCommand(cmd, arg) }, icon('rotate-ccw'));
const dot = () => h('i', { class: 'lv-pf__mod', title: 'Modified from default', role: 'img', 'aria-label': 'Modified from default' });

function row(d) {
  const c = control(d, getSetting(d.id), (v) => set(d.id, v)), rst = reset('prefs.reset-setting', 'Reset to default', d.id, `Reset ${d.label}`);
  const el = h('div', { class: 'lv-pf__row', dataset: { key: d.id } },
    h('div', { class: 'lv-pf__txt' }, h('label', { for: `pf-${d.id}` }, d.label || d.id, dot(), d.restart ? h('em', { class: 'lv-pf__rs' }, 'Restart required') : null), h('small', {}, d.description || '')),
    h('div', { class: 'lv-pf__ctl' }, c.el, rst), c.err);
  syncs.push(() => { const v = getSetting(d.id), m = isModified(d, v); el.classList.toggle('is-mod', m); rst.disabled = !m; c.sync(v); });
  return el;
}

function section(s, defs) {
  if (s.render) return h('section', {}, h('h4', {}, s.title), s.render());
  const items = sectionItems(s, defs), ids = items.map((d) => d.id);
  const btn = h('button', { type: 'button', class: 'tbtn lv-pf__sreset', title: `Reset ${s.title} to defaults`, dataset: { cmd: 'prefs.reset-category' }, onclick: () => runCommand('prefs.reset-category', ids.filter((id) => isModified(items.find((d) => d.id === id), getSetting(id)))) }, icon('rotate-ccw'), 'Reset section');
  syncs.push(() => { btn.hidden = !items.some((d) => isModified(d, getSetting(d.id))); });
  return h('section', {}, h('h4', {}, s.title, btn), ...items.map(row));
}

export function prefsView() {
  const defs = listSettings(), pages = preferencePages.list();
  const nav = h('nav', { class: 'lv-pf__nav', 'aria-label': 'Preference pages' }), body = h('div', { class: 'lv-pf__body' });
  const search = h('input', { type: 'search', class: 'lv-hsearch lv-pf__search', placeholder: 'Search all settings', 'aria-label': 'Search settings', value: st.q, oninput: (e) => { st.q = e.target.value; paint(); } });

  const hits = () => {
    const out = [...pages.filter((p) => matchSetting({ id: p.id, label: p.title }, st.q)).map((p) => h('button', { type: 'button', class: 'lv-pf__hit', dataset: { cmd: 'prefs.goto' }, onclick: () => runCommand('prefs.goto', { page: p.id }) }, h('b', {}, p.title), h('small', {}, p.planned ? 'Planned page' : 'Page'))),
      ...defs.filter((d) => pageOf(pages, d) && matchSetting(d, st.q)).map((d) => h('button', { type: 'button', class: 'lv-pf__hit', dataset: { cmd: 'prefs.goto' }, onclick: () => runCommand('prefs.goto', { page: pageOf(pages, d).id, key: d.id }) },
        h('b', {}, d.label || d.id, isModified(d, getSetting(d.id)) ? dot() : null), h('small', {}, `${pageOf(pages, d).title} · ${d.description || ''}`)))];
    return out.length ? out : [h('p', { class: 'lv-hnone' }, 'No matching settings.')];
  };
  function paint() {
    syncs = [];
    nav.replaceChildren(...pages.map((p) => h('button', { type: 'button', class: (p.id === st.page && !st.q.trim() ? 'is-on' : '') + (p.planned ? ' is-planned' : ''), dataset: { cmd: 'prefs.goto' }, onclick: () => runCommand('prefs.goto', { page: p.id }) }, icon(p.icon), p.title, p.planned ? h('em', {}, 'Planned') : null)));
    const p = preferencePages.get(st.page) || pages[0];
    body.replaceChildren(...(st.q.trim() ? hits() : p.planned ? [h('h4', {}, p.title), h('p', { class: 'lv-hnone' }, `${p.title} settings are planned for a later release.`)] : p.render ? [h('h4', {}, p.title), p.render()] : [h('h4', {}, p.title), ...p.sections.map((s) => section(s, defs))]));
    syncs.forEach((f) => f());
  }
  const reveal = () => {
    const el = st.hit && body.querySelector(`[data-key="${CSS.escape(st.hit)}"]`);
    st.hit = null;
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('is-hit'); }
  };
  paint();
  const off = subscribeSettings(() => { if (!nav.isConnected) off(); else syncs.forEach((f) => f()); });
  mounted = { goto(page, key) { st.page = page; st.q = ''; st.hit = key || null; search.value = ''; paint(); reveal(); } };
  return { el: h('div', {}, search, h('div', { class: 'lv-pf' }, nav, body)), reveal };
}

export function goto(page, key) {
  if (mounted && mounted.goto && document.querySelector('.lv-pf')) mounted.goto(page, key);
  else { st.page = page; st.q = ''; st.hit = key || null; }
}
