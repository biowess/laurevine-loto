import { h } from '../../kit/dom.js';
import { isChecked } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import { page, heading } from '../page-kit.js';

const SECTIONS = ['Appearance', 'Editor', 'Markdown', 'Typography', 'File Management', 'Search', 'Autosave and Recovery', 'Export', 'Keyboard Shortcuts', 'Integrations', 'Accessibility', 'Privacy'];
const THEMES = [['view.theme-light', 'Light'], ['view.theme-dark', 'Dark']];

export default {
  id: 'preferences', title: 'Preferences', icon: 'settings',
  render: () => page('Preferences', 'Appearance, editing and file behavior.',
    h('div', { style: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', maxWidth: '760px' } },
      h('div', { class: 'md-list', style: { border: '0', background: 'none' } },
        ...SECTIONS.map((n, i) => h('div', { class: 'md-row' + (i ? '' : ' is-on'), style: { border: '0', height: '28px' } }, n))),
      h('div', {}, h('h4', { style: { marginTop: '0' } }, 'Theme'),
        h('div', { class: 'md-seg2', style: { width: 'max-content' } },
          ...THEMES.map(([id, t]) => h('button', { type: 'button', class: isChecked(id) ? 'is-on' : null, dataset: { cmd: id }, style: { width: 'auto', padding: '0 14px' }, onclick: () => runCommand(id) }, t))),
        heading('More settings arrive with the settings feature.')))),
};
