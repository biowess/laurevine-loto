import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { getSettingDef } from '../../../../shared/settings-schema.js';
import { getSetting } from '../../services/settings-client.js';
import { control } from './controls.js';
import * as hist from '../../services/history-client.js';

const SECTIONS = [['Autosave', ['files.autosave', 'files.autosaveDelay']], ['Recovery', ['recovery.interval', 'recovery.keepDays']], ['History retention and storage', ['history.maxVersions', 'history.keepLatest', 'history.maxAgeDays', 'history.maxMB', 'history.autosaveSeconds', 'history.autosaveDelta']], ['Session', ['session.restore']]];
const set = (id) => async (value) => { const r = await runCommand('prefs.set', { id, value }); return r && r.ok ? null : (r && r.error) || 'The setting could not be changed.'; };

export function recoveryPage() {
  const row = (id) => {
    const d = getSettingDef(id), c = control(d, getSetting(id), set(id));
    return h('div', { class: 'lv-pf__row', dataset: { key: id } }, h('div', { class: 'lv-pf__txt' }, h('label', { for: `pf-${id}` }, d.label), h('small', {}, d.description)), h('div', { class: 'lv-pf__ctl' }, c.el), c.err);
  };
  const usage = h('small', {}, 'Calculating…');
  const load = () => hist.stats().then((s) => { usage.textContent = `${s.versions} version${s.versions === 1 ? '' : 's'} of ${s.files} file${s.files === 1 ? '' : 's'}, ${hist.size(s.bytes)} used${s.pinned ? ` (${s.pinned} pinned)` : ''}`; }, () => { usage.textContent = 'Usage unavailable.'; });
  load();
  return h('div', {},
    ...SECTIONS.map(([t, keys]) => h('section', {}, h('h4', {}, t), ...keys.map(row))),
    h('section', {}, h('h4', {}, 'Document history data'),
      h('div', { class: 'lv-pf__row' }, h('div', { class: 'lv-pf__txt' }, h('label', {}, 'Current usage'), usage),
        h('div', { class: 'lv-pf__ctl' }, h('button', { type: 'button', class: 'btn', dataset: { cmd: 'prefs.clear-history' }, onclick: async () => { await runCommand('prefs.clear-history'); load(); } }, 'Clear history…')))),
    h('section', {}, h('h4', {}, 'Recovery data'),
      h('div', { class: 'lv-pf__row' }, h('div', { class: 'lv-pf__txt' }, h('label', {}, 'Clear recovery data'), h('small', {}, 'Delete all recovery copies of unsaved work. This cannot be undone.')),
        h('div', { class: 'lv-pf__ctl' }, h('button', { type: 'button', class: 'btn', dataset: { cmd: 'prefs.clear-recovery' }, onclick: () => runCommand('prefs.clear-recovery') }, 'Clear…')))));
}
