import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { getSettingDef } from '../../../../shared/settings-schema.js';
import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { index as queryIndex } from '../../services/workspace-client.js';
import { control } from './controls.js';

const sections = new Map();

export const integrationSections = {
  register(s) {
    if (!s || !/^[a-z][a-z0-9-]*$/.test(s.id || '') || typeof s.title !== 'string' || typeof s.render !== 'function') {
      throw new TypeError(`integrations: bad section "${s && s.id}"`);
    }
    sections.set(s.id, Object.freeze(s));
  },
  list: () => [...sections.values()],
};

const set = (id) => async (value) => {
  const r = await runCommand('prefs.set', { id, value });
  return r && r.ok ? null : (r && r.error) || 'The setting could not be changed.';
};

function settingRow(id) {
  const d = getSettingDef(id), c = control(d, getSetting(id), set(id));
  return {
    c,
    el: h('div', { class: 'lv-pf__row', dataset: { key: id } },
      h('div', { class: 'lv-pf__txt' }, h('label', { for: `pf-${id}` }, d.label), h('small', {}, d.description)),
      h('div', { class: 'lv-pf__ctl lv-int__path' }, c.el),
      c.err),
  };
}

export const externalLinksSection = {
  id: 'external-links',
  title: 'External-Link Checks',
  render() {
    const enabled = settingRow('integrations.externalLinkCheck');
    const timeout = settingRow('integrations.externalLinkTimeout');

    const testInput = h('input', { class: 'input', type: 'url', value: 'https://example.com' });
    const badge = h('b', { class: 'lv-int__badge', role: 'status', dataset: { state: 'ready' } }, 'Idle');
    const testBtn = h('button', { type: 'button', class: 'btn', onclick: () => runTest() }, 'Test URL');

    async function runTest() {
      const url = testInput.value.trim();
      if (!url) return;
      badge.textContent = 'Checking…';
      badge.dataset.state = 'busy';
      testBtn.disabled = true;
      try {
        const to = Number(getSetting('integrations.externalLinkTimeout')) || 5;
        const res = await queryIndex('check-url', { url, timeout: to * 1000 });
        if (res && res.ok) {
          badge.textContent = `${res.status || 200} ${res.statusText || 'OK'}`;
          badge.dataset.state = 'ready';
        } else {
          badge.textContent = (res && res.statusText) || 'Failed';
          badge.dataset.state = 'broken';
        }
      } catch (err) {
        badge.textContent = 'Error';
        badge.dataset.state = 'broken';
      } finally {
        testBtn.disabled = false;
      }
    }

    const testRow = h('div', { class: 'lv-pf__row' },
      h('div', { class: 'lv-pf__txt' }, h('label', {}, 'Test link reachability'), h('small', {}, 'Sends a check request to the specified web address.')),
      h('div', { class: 'lv-pf__ctl' }, testInput, badge, testBtn));

    const guide = h('div', { class: 'lv-int__guide' },
      h('p', {}, h('b', {}, 'Leaves the machine: '), 'HTTP requests are sent across the Internet to test the reachability of URLs in your documents. No document text or personal data is transmitted.'),
      h('p', {}, h('b', {}, 'Opt-in: '), 'Link checking is disabled by default and only runs when explicitly enabled above.'));

    const el = h('div', {}, enabled.el, timeout.el, testRow, guide);
    const off = subscribeSettings(() => {
      if (!el.isConnected) { off(); return; }
      enabled.c.sync(getSetting('integrations.externalLinkCheck'));
      timeout.c.sync(getSetting('integrations.externalLinkTimeout'));
    });
    return el;
  },
};

export const bibliographySection = {
  id: 'bibliography',
  title: 'Bibliography Defaults',
  render() {
    const file = settingRow('bibliography.defaultPath');
    const style = settingRow('bibliography.style');

    const guide = h('div', { class: 'lv-int__guide' },
      h('p', {}, h('b', {}, 'Leaves the machine: '), 'Nothing. Bibliography files (.bib and CSL-JSON) are parsed and formatted entirely on your local machine.'),
      h('p', {}, h('b', {}, 'Opt-in: '), 'Default bibliography files are only loaded when specified or referenced in documents.'));

    const el = h('div', {}, file.el, style.el, guide);
    const off = subscribeSettings(() => {
      if (!el.isConnected) { off(); return; }
      file.c.sync(getSetting('bibliography.defaultPath'));
      style.c.sync(getSetting('bibliography.style'));
    });
    return el;
  },
};

integrationSections.register(externalLinksSection);
integrationSections.register(bibliographySection);

export const integrationsPage = () => h('div', {}, ...integrationSections.list().map((s) => h('section', { dataset: { integration: s.id } }, h('h4', {}, s.title), s.render())));
