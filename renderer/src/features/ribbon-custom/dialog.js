import { h, $ } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { openDialog } from '../../ui/kit/dialog.js';
import { toast } from '../../ui/kit/toast.js';
import { BASE_TABS } from '../../ui/ribbon/ribbon.js';
import { LIMITS, noteFor, parseLayout, resolve, serialize } from '../../core/ribbon/layout.js';
import * as E from '../../core/ribbon/edit.js';

const KEY = 'ribbon.layout';
const MAX_TEXT = 30000;
let seq = 0;

const check = (label, on, cb) => h('input', { type: 'checkbox', class: 'rc__chk', checked: on, 'aria-label': label, onchange: (e) => cb(e.target.checked) });
const iconBtn = (name, label, onClick, extra = {}) => h('button', { type: 'button', class: 'rc__ib', title: label, 'aria-label': label, disabled: extra.disabled, dataset: extra.fk ? { fk: extra.fk } : undefined, onclick: onClick }, icon(name));

export function openCustomize(ctx) {
  const has = ctx.commands.has;
  const parsed = parseLayout(ctx.store.get().settings.values[KEY]);
  const first = resolve(BASE_TABS, parsed.layout, has);
  let model = first.model, tabId = (model.find((t) => !t.hide) || model[0]).id, focusKey = null, busy = false;

  const tabsEl = h('div', { class: 'rc__tabs', role: 'group', 'aria-label': 'Ribbon tabs' });
  const groupsEl = h('div', { class: 'rc__groups' });
  const statusEl = h('p', { class: 'rc__status', role: 'status' });
  const say = (msg) => { statusEl.textContent = msg || ''; };
  const cmds = ctx.commands.list((c) => !c.planned).sort((a, b) => a.title.localeCompare(b.title));
  const datalist = h('datalist', { id: 'rc-commands' }, cmds.map((c) => h('option', { value: c.id }, c.title)));

  say([parsed.error ? `The saved layout could not be read (${parsed.error}) and is not in use.` : '', noteFor(first.ignored)].filter(Boolean).join(' '));

  const act = (next, fk) => { model = next; focusKey = fk || null; paint(); };

  const arrows = (scope, i, n, label, make) => [
    iconBtn('arrow-up', `Move ${label} up`, () => act(make(i - 1), `${scope}${i - 1}:${i - 1 > 0 ? 'up' : 'down'}`), { disabled: i === 0, fk: `${scope}${i}:up` }),
    iconBtn('arrow-down', `Move ${label} down`, () => act(make(i + 1), `${scope}${i + 1}:${i + 1 < n - 1 ? 'down' : 'up'}`), { disabled: i === n - 1, fk: `${scope}${i}:down` }),
  ];

  function itemRow(t, g, gi, it, ii) {
    const c = ctx.commands.get(it.id), title = c ? c.title : it.id;
    return h('li', { class: 'rc__item' + (it.hide ? ' is-off' : '') },
      check(`Show ${title}`, !it.hide, (v) => act(E.setItemHidden(model, t.id, gi, ii, !v))),
      h('span', { class: 'rc__ico' }, icon((c && c.icon) || g.icon)),
      h('span', { class: 'rc__lbl' }, title),
      arrows(`i${gi}_`, ii, g.items.length, title, (to) => E.moveItem(model, t.id, gi, ii, to)),
      g.custom ? iconBtn('x', `Remove ${title} from ${g.name}`, () => act(E.removeItem(model, t.id, gi, ii), `a${gi}`)) : null);
  }

  function addRow(t, g, gi) {
    const input = h('input', { type: 'text', class: 'rc__add-in', list: 'rc-commands', placeholder: 'Add a command (name or id)…', 'aria-label': `Add a command to ${g.name}`, dataset: { fk: `a${gi}` } });
    const add = () => {
      const q = input.value.trim().toLowerCase(), c = cmds.find((x) => x.id === q || x.title.toLowerCase() === q);
      if (!c) { say(q ? `No available command matches “${input.value.trim()}”.` : 'Type a command name or id first.'); return; }
      if (g.items.some((i) => i.id === c.id)) { say(`${c.title} is already in ${g.name}.`); return; }
      if (g.items.length >= LIMITS.items) { say(`A group holds up to ${LIMITS.items} commands.`); return; }
      say('');
      act(E.addItem(model, t.id, gi, c.id), `a${gi}`);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    return h('div', { class: 'rc__add' }, input, h('button', { type: 'button', class: 'btn', onclick: add }, 'Add'));
  }

  function groupEl(t, g, gi) {
    return h('section', { class: 'rc__group' + (g.hide ? ' is-off' : ''), 'aria-label': g.name },
      h('div', { class: 'rc__ghead' },
        check(`Show group ${g.name}`, !g.hide, (v) => act(E.setGroupHidden(model, t.id, gi, !v))),
        g.custom
          ? h('input', { type: 'text', class: 'rc__name', value: g.name, maxlength: LIMITS.name, 'aria-label': 'Group name', dataset: { fk: `n${gi}` }, onchange: (e) => { model = E.renameGroup(model, t.id, gi, e.target.value); e.target.value = model.find((x) => x.id === t.id).groups[gi].name; } })
          : h('strong', { class: 'rc__gname' }, g.name),
        g.custom ? h('span', { class: 'rc__tag' }, 'Custom') : null,
        arrows('g', gi, t.groups.length, `group ${g.name}`, (to) => E.moveGroup(model, t.id, gi, to)),
        g.custom ? iconBtn('trash-2', `Delete group ${g.name}`, () => act(E.removeGroup(model, t.id, gi))) : null),
      g.items.length ? h('ul', { class: 'rc__items' }, g.items.map((it, ii) => itemRow(t, g, gi, it, ii))) : h('p', { class: 'rc__empty' }, 'No commands yet.'),
      g.custom ? addRow(t, g, gi) : null);
  }

  function paint() {
    tabsEl.replaceChildren(...model.map((t) => h('div', { class: 'rc__tab' + (t.id === tabId ? ' is-sel' : '') },
      check(`Show ${t.label} tab`, !t.hide, (v) => {
        const next = E.setTabHidden(model, t.id, !v);
        if (next === model) say('At least one tab must stay visible.'); else say('');
        act(next);
      }),
      h('button', { type: 'button', class: 'rc__tabbtn', 'aria-current': String(t.id === tabId), onclick: () => { tabId = t.id; paint(); } }, t.label))));
    const t = model.find((x) => x.id === tabId);
    groupsEl.replaceChildren(...t.groups.map((g, gi) => groupEl(t, g, gi)));
    if (!focusKey) return;
    const alt = focusKey.endsWith(':up') ? focusKey.replace(/:up$/, ':down') : focusKey.replace(/:down$/, ':up');
    const el = [focusKey, alt].map((k) => $(`[data-fk="${k}"]`, root)).find((n) => n && !n.disabled);
    focusKey = null;
    if (el) el.focus();
  }

  const addGroup = () => {
    const next = E.addGroup(model, tabId, 'Custom Group', Date.now().toString(36) + (seq++ % 36).toString(36));
    if (next === model) { say(`A tab holds up to ${LIMITS.groups} groups.`); return; }
    say('');
    act(next, `n${next.find((t) => t.id === tabId).groups.length - 1}`);
  };

  const importDlg = () => {
    const ta = h('textarea', { class: 'rc__ta', rows: 10, 'aria-label': 'Ribbon layout JSON' }), err = h('p', { class: 'rc__err', role: 'alert' });
    openDialog({ title: 'Import Ribbon Layout', icon: 'download', width: 520, focus: 'textarea', body: h('div', {}, h('p', {}, 'Paste an exported ribbon layout. It replaces the layout shown here; nothing is saved until you choose Apply.'), ta, err),
      buttons: [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: () => {
        const text = ta.value.trim();
        if (!text) { err.textContent = 'Paste the layout JSON first.'; return false; }
        if (text.length > MAX_TEXT) { err.textContent = 'That layout is too large.'; return false; }
        const p = parseLayout(text);
        if (p.error) { err.textContent = p.error; return false; }
        const r = resolve(BASE_TABS, p.layout, has);
        model = r.model;
        if (!model.some((t) => t.id === tabId)) tabId = model[0].id;
        say(noteFor(r.ignored) || 'Layout imported. Choose Apply to keep it.');
        paint();
      } }] });
  };

  const exportDlg = () => {
    const ta = h('textarea', { class: 'rc__ta', rows: 10, 'aria-label': 'Ribbon layout JSON' }, serialize(model, BASE_TABS, has) || JSON.stringify({ v: 1, tabs: {} }));
    ta.readOnly = true;
    openDialog({ title: 'Export Ribbon Layout', icon: 'upload', width: 520, body: h('div', {}, h('p', {}, 'Copy this text and keep it; paste it into Import on any copy of Laurevine Loto.'), ta),
      buttons: [{ label: 'Close' }, { label: 'Copy', primary: true, onClick: () => { navigator.clipboard.writeText(ta.value).then(() => toast('Copied ribbon layout')).catch(() => toast('Could not copy.')); return false; } }] });
  };

  const bar = h('div', { class: 'rc__bar' },
    h('button', { type: 'button', class: 'btn', onclick: addGroup }, 'New Custom Group'),
    h('button', { type: 'button', class: 'btn', onclick: () => { say('Tab reset. Choose Apply to keep it.'); act(E.resetTab(model, BASE_TABS, has, tabId)); } }, 'Reset Tab'),
    h('button', { type: 'button', class: 'btn', onclick: () => { say('Everything reset. Choose Apply to keep it.'); act(E.resetAll(BASE_TABS, has)); } }, 'Reset All'),
    h('button', { type: 'button', class: 'btn', onclick: importDlg }, 'Import…'),
    h('button', { type: 'button', class: 'btn', onclick: exportDlg }, 'Export…'));

  const root = h('div', { class: 'rc' },
    h('p', { class: 'rc__hint' }, 'Show, hide and reorder tabs, groups and commands. Contextual tabs (Table, Image) appear on their own. Right-click any ribbon button to add it to the Quick Access Toolbar.'),
    h('div', { class: 'rc__cols' }, tabsEl, h('div', { class: 'rc__main' }, bar, groupsEl)), statusEl, datalist);

  async function save(api) {
    if (busy) return;
    const text = serialize(model, BASE_TABS, has);
    if (text.length > MAX_TEXT) { say('This layout is too large to save. Remove some custom groups or commands.'); return; }
    busy = true;
    try {
      await ctx.settings.set(KEY, text);
      toast('Ribbon layout saved');
      api.close('Apply');
    } catch (e) {
      say(`Could not save the layout: ${e.message}`);
    } finally {
      busy = false;
    }
  }

  paint();
  return openDialog({ title: 'Customize Ribbon', icon: 'layout-panel-top', width: 780, cls: 'rc-dlg', body: root, buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: (api) => { save(api); return false; } }] });
}
