import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { control } from './controls.js';
import { getSetting, setSetting, subscribeSettings } from '../../services/settings-client.js';
import { getSettingDef } from '../../../../shared/settings-schema.js';
import { parseEndpoint } from '../../../../shared/grammar.js';

const ACTIONS = [
  ['prefs.clear-recents', 'Recent documents', 'Remove the list of recently opened documents. Pinned items stay.'],
  ['prefs.clear-history', 'Document history', 'Delete saved history snapshots.'],
  ['prefs.clear-recovery', 'Recovery data', 'Delete recovery copies of unsaved work.'],
];

const put = (k) => async (v) => { try { await setSetting(k, v); return null; } catch (e) { return (e && e.message) || 'Could not save the setting.'; } };
const line = (title, note, ...ctl) => h('div', { class: 'lv-pf__row' }, h('div', { class: 'lv-pf__txt' }, h('label', {}, title), note), h('div', { class: 'lv-pf__ctl' }, ...ctl));

function network() {
  const state = h('small', {}), btn = h('button', { type: 'button', class: 'btn', dataset: { cmd: 'rev.grammar' }, onclick: () => runCommand('rev.grammar') });
  const field = (id) => { const d = getSettingDef(id), c = control(d, getSetting(id), put(id)); return [line(d.label, h('small', {}, d.description), c.el), c.err, c]; };
  const [urlRow, urlErr, url] = field('grammar.url'), [langRow, langErr, lang] = field('grammar.language');
  const sync = () => {
    const on = getSetting('grammar.enabled') === true, u = parseEndpoint(getSetting('grammar.url'));
    state.textContent = on ? `On: the checked paragraph of each document is sent to ${u ? u.host : 'the endpoint'}. Local checks send nothing.` : 'Off: nothing is sent. No network request is made while this is off.';
    btn.textContent = on ? 'Turn off' : 'Turn on…';
    url.sync(getSetting('grammar.url')); lang.sync(getSetting('grammar.language'));
  };
  const el = h('section', {}, h('h4', {}, 'Network features'),
    h('p', { class: 'lv-hnone' }, 'Laurevine Loto sends no telemetry, analytics or crash reports. Only the features below can use the network; every other feature works offline.'),
    line('Online grammar check', state, btn), urlRow, urlErr, langRow, langErr,
    line('External-link checks', h('small', {}, 'Manual only: when you press Check in the Links panel, each listed address is requested (HEAD, then GET). No document text is sent.'), h('b', {}, 'On request')));
  sync();
  const off = subscribeSettings(() => { if (el.isConnected) sync(); else off(); });
  return el;
}

export const privacyPage = () => h('div', {},
  network(),
  h('section', {}, h('h4', {}, 'Local data'),
    ...ACTIONS.map(([cmd, title, note]) => h('div', { class: 'lv-pf__row' },
      h('div', { class: 'lv-pf__txt' }, h('label', {}, title), h('small', {}, note)),
      h('div', { class: 'lv-pf__ctl' }, h('button', { type: 'button', class: 'btn', dataset: { cmd }, onclick: () => runCommand(cmd) }, 'Clear…'))))));
