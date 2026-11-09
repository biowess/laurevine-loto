// Problem Rules dialog: enable or disable rule groups, override severity, toggle editor underlines (settings `problems.*`).
import { TITLES } from '../../core/problems/model.js';
import { getSetting, setSetting } from '../../services/settings-client.js';

const SEVS = [['', 'Default'], ['error', 'Error'], ['warning', 'Warning'], ['info', 'Info']];

export function openRules({ ui: { h, openDialog, toast } }, done) {
  const off = new Set(getSetting('problems.disabled').split(',').filter(Boolean));
  let sv = {};
  try { sv = JSON.parse(getSetting('problems.severity')) || {}; } catch { /* defaults */ }
  const sq = h('input', { type: 'checkbox', role: 'switch', class: 'lv-pf__sw', 'aria-label': 'Underline problems in the editor' });
  sq.checked = !!getSetting('problems.squiggles');
  const rows = Object.entries(TITLES).map(([k, t]) => {
    const cb = h('input', { type: 'checkbox', role: 'switch', class: 'lv-pf__sw', 'aria-label': t }), s = h('select', { class: 'select', 'aria-label': `${t} severity` }, SEVS.map(([v, l]) => h('option', { value: v }, l)));
    cb.checked = !off.has(k);
    s.value = sv[k] || '';
    return { k, cb, s, el: h('label', {}, cb, h('span', { class: 'pr-t' }, t), s) };
  });
  openDialog({
    title: 'Problem Rules', icon: 'settings-2', width: 520,
    body: [h('label', { class: 'pr-rules' }, h('span', {}, sq, ' Underline problems in the editor')), h('div', { class: 'pr-rules' }, rows.map((r) => r.el))],
    buttons: [{ label: 'Cancel' }, {
      label: 'Save', primary: true,
      onClick: () => {
        const map = {};
        rows.forEach((r) => { if (r.s.value) map[r.k] = r.s.value; });
        Promise.all([
          setSetting('problems.squiggles', sq.checked),
          setSetting('problems.disabled', rows.filter((r) => !r.cb.checked).map((r) => r.k).join(',')),
          setSetting('problems.severity', JSON.stringify(map)),
        ]).then(done, () => toast('Could not save the problem rules.'));
      },
    }],
  });
}
