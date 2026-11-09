import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { getSettingDef } from '../../../../shared/settings-schema.js';
import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { getAppInfo } from '../../services/app-info.js';
import { control } from './controls.js';

const PATH = 'integrations.pandocPath', LIMIT = 'integrations.pandocTimeout';
const STATE = { ready: 'Ready', 'too-old': 'Too old', broken: 'Not working', 'invalid-path': 'Invalid path', 'not-found': 'Not found' };
const GUIDE = {
  win32: ['Install with winget: ', 'winget install --source winget --exact --id JohnMacFarlane.Pandoc'],
  darwin: ['Install with Homebrew: ', 'brew install pandoc'],
  linux: ['Install with your package manager, for example: ', 'sudo apt install pandoc'],
};
const set = (id) => async (value) => { const r = await runCommand('prefs.set', { id, value }); return r && r.ok ? null : (r && r.error) || 'The setting could not be changed.'; };
const row = (label, note, ...ctl) => h('div', { class: 'lv-pf__row' }, h('div', { class: 'lv-pf__txt' }, h('label', {}, label), note), h('div', { class: 'lv-pf__ctl' }, ...ctl));
const yes = (v) => (v ? 'yes' : 'no');

function setting(id) {
  const d = getSettingDef(id), c = control(d, getSetting(id), set(id));
  return { c, el: h('div', { class: 'lv-pf__row', dataset: { key: id } }, h('div', { class: 'lv-pf__txt' }, h('label', { for: `pf-${id}` }, d.label), h('small', {}, d.description)), h('div', { class: 'lv-pf__ctl lv-int__path' }, c.el), c.err) };
}

function render() {
  const path = setting(PATH), limit = setting(LIMIT);
  const badge = h('b', { class: 'lv-int__badge', role: 'status', dataset: { state: 'busy' } }, 'Checking…'), detail = h('small', {}), result = h('small', { class: 'lv-int__res', role: 'status' });
  const detectBtn = h('button', { type: 'button', class: 'btn', dataset: { cmd: 'prefs.pandoc-detect' }, onclick: () => detect() }, 'Detect');
  const testBtn = h('button', { type: 'button', class: 'btn', dataset: { cmd: 'prefs.pandoc-test' }, onclick: () => test() }, 'Test');
  const guide = h('div', { class: 'lv-int__guide' },
    h('b', {}, 'Install Pandoc'),
    h('p', {}, 'Pandoc is a free converter that Laurevine Loto can call for Word, ODT, EPUB and other formats. Loto never downloads or installs it for you, and it is never run with commands taken from your documents.'),
    h('p', {}, h('b', {}, 'Leaves the machine: '), 'Nothing. Pandoc runs locally with no network connectivity.'),
    h('p', {}, h('b', {}, 'Opt-in: '), 'Pandoc is only invoked when you choose to export to formats that require it (Word, ODT, EPUB).'));
  getAppInfo().then((i) => { const g = GUIDE[i.platform] || GUIDE.linux; guide.append(h('p', {}, g[0], h('code', {}, g[1])), h('p', {}, 'Or download an installer from pandoc.org/installing.html. Package managers can ship old versions: use a current release. Then press Detect.')); }, () => {});
  testBtn.disabled = true;
  let seq = 0, job = '', last = getSetting(PATH);

  const paint = (info, error) => {
    if (!info) { badge.textContent = 'Unavailable'; badge.dataset.state = 'broken'; detail.replaceChildren(h('div', {}, error || 'Detection failed.')); testBtn.disabled = true; return; }
    badge.textContent = STATE[info.status] || info.status; badge.dataset.state = info.status;
    const lines = [info.message];
    if (info.found) lines.push(`Version ${info.version} · ${info.path} (${info.source === 'setting' ? 'from the path above' : 'found automatically'})`);
    if (info.capabilities) {
      const c = info.capabilities, k = c.key;
      lines.push(`Reads ${c.input.length} formats, writes ${c.output.length}. HTML ${yes(k.html)}, Word ${yes(k.docx)}, ODT ${yes(k.odt)}, EPUB ${yes(k.epub)}, LaTeX ${yes(k.latex)}, PowerPoint ${yes(k.pptx)}. Sandboxed runs: ${yes(c.sandbox)}.`);
    }
    detail.replaceChildren(...lines.map((l) => h('div', {}, l)));
    testBtn.disabled = !(info.found && info.supported) && !job;
  };
  async function detect() {
    const n = ++seq;
    badge.textContent = 'Checking…'; badge.dataset.state = 'busy';
    const r = await runCommand('prefs.pandoc-detect'), v = r && r.ok ? r.value : null;
    if (n === seq) paint(v && v.ok ? v : null, v && v.error && v.error.message);
  }
  async function test() {
    if (job) { await runCommand('prefs.pandoc-cancel', job); return; }
    const mine = `pf-${Date.now().toString(36)}`;
    job = mine; testBtn.textContent = 'Cancel'; testBtn.dataset.cmd = 'prefs.pandoc-cancel';
    result.textContent = 'Running…'; result.dataset.state = '';
    const r = await runCommand('prefs.pandoc-test', mine), v = r && r.ok ? r.value : null;
    job = ''; testBtn.textContent = 'Test'; testBtn.dataset.cmd = 'prefs.pandoc-test';
    result.textContent = v && v.ok ? v.message : (v && v.error && v.error.message) || 'The test could not run.';
    result.dataset.state = v && v.ok && v.passed ? 'ok' : 'bad';
    if (v && v.ok && v.info) paint(v.info);
  }

  const el = h('div', {}, path.el,
    row('Detection', detail, badge, detectBtn),
    row('Test Pandoc', h('small', {}, 'Converts a small Markdown sample to HTML through Pandoc and checks the result.'), testBtn),
    h('div', { class: 'lv-pf__row' }, result), limit.el, guide);
  const off = subscribeSettings(() => {
    if (!el.isConnected) { off(); return; }
    path.c.sync(getSetting(PATH)); limit.c.sync(getSetting(LIMIT));
    if (getSetting(PATH) !== last) { last = getSetting(PATH); detect(); }
  });
  detect();
  return el;
}

export const pandocSection = Object.freeze({ id: 'pandoc', title: 'Pandoc', render });
