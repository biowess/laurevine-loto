import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { getSettingDef } from '../../../../shared/settings-schema.js';
import { getSetting } from '../../services/settings-client.js';
import { getAppInfo } from '../../services/app-info.js';
import { control } from './controls.js';

const KEYS = ['search.ignoreGlobs', 'search.maxResults', 'search.scopeContent', 'search.scopeFilenames', 'search.scopeFrontmatter', 'search.scopeCode'];
const set = (id) => async (value) => { const r = await runCommand('prefs.set', { id, value }); return r && r.ok ? null : (r && r.error) || 'The setting could not be changed.'; };
const row = (label, note, ...ctl) => h('div', { class: 'lv-pf__row' }, h('div', { class: 'lv-pf__txt' }, h('label', {}, label), h('small', {}, note)), h('div', { class: 'lv-pf__ctl' }, ...ctl));

export function searchPage() {
  const loc = h('code', { class: 'sr__loc' }, '…');
  getAppInfo().then((i) => { loc.textContent = i.userData ? `${i.userData}${i.platform === 'win32' ? '\\' : '/'}indexes` : 'Unavailable'; }).catch(() => { loc.textContent = 'Unavailable'; });
  return h('div', {},
    h('section', {}, h('h4', {}, 'Workspace search'), ...KEYS.map((id) => {
      const d = getSettingDef(id), c = control(d, getSetting(id), set(id));
      return h('div', { class: 'lv-pf__row', dataset: { key: id } },
        h('div', { class: 'lv-pf__txt' }, h('label', { for: `pf-${id}` }, d.label), h('small', {}, d.description)), h('div', { class: 'lv-pf__ctl' }, c.el), c.err);
    })),
    h('section', {}, h('h4', {}, 'Index'),
      row('Index location', 'Where the search index is cached. It is stored outside your documents.', loc),
      row('Clear index', 'Delete the cached index. It is rebuilt from your files.',
        h('button', { type: 'button', class: 'btn', dataset: { cmd: 'prefs.clear-index' }, onclick: () => runCommand('prefs.clear-index') }, 'Clear…'))));
}
