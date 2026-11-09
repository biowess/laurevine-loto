import { columnsPage } from './columns-page.js';
import { coverPage } from './cover-page.js';
import { decorPage } from './decor-page.js';
import { headerFooterPage } from './header-page.js';
import { numberingPage } from './numbering-page.js';
import { pagePage } from './page-page.js';
import { palettePage } from './palette-page.js';
import { listTemplates } from '../../core/publish/templates/index.js';
import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { gallery } from './gallery.js';
import { sectionsPage } from './sections-page.js';
import { structurePage } from './structure-page.js';
import { typographyPage } from './typography-page.js';
import { presetsPage } from './presets-page.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const FONT = [['serif', 'Serif'], ['classic', 'Classic serif'], ['sans', 'Sans-serif']];
const fld = (l, ...c) => h('label', { class: 'md-fld' }, h('span', {}, l), ...c);
const sel = (opts, val, on) => h('select', { onchange: (e) => on(e.target.value) }, ...opts.map(([v, l]) => h('option', { value: v, selected: v === val ? true : null }, l)));
const range = (min, max, step, val, on) => {
  const o = h('output', {}, String(val));
  return [h('input', { type: 'range', min, max, step, value: val, oninput: (e) => { o.textContent = e.target.value; }, onchange: (e) => on(+e.target.value) }), o];
};
const chk = (l, v, on) => h('label', { class: 'md-chk' }, h('input', { type: 'checkbox', checked: v ? true : null, onchange: (e) => on(e.target.checked) }), l);
const card = (label, on, click, desc) => h('button', { type: 'button', class: 'md-card' + (on ? ' is-on' : ''), onclick: click }, h('b', {}, label), desc ? h('span', {}, desc) : null);
const seg = (list, cur, set) => h('div', { class: 'md-seg2' }, ...list.map(([v, l]) => h('button', { type: 'button', class: v === cur ? 'is-on' : null, style: { width: 'auto', padding: '0 10px' }, onclick: () => set(v) }, l)));

// Each page: (config, ed) -> nodes. ed.patch(partial) / ed.template(id) / ed.palette(id) run Studio commands.
export const PAGES = {
  template: (c, ed) => [h('h4', {}, 'Template'), gallery(c, ed, listTemplates())],
  typography: (c, ed) => typographyPage(c, ed, { fld, sel, range, chk, seg }),
  palette: (c, ed) => palettePage(c, ed, { fld, seg }),
  columns: (c, ed) => columnsPage(c, ed, { fld, sel, range, chk, seg, card }),
  page: (c, ed) => pagePage(c, ed, { fld, sel, chk, seg }),
  'header-footer': (c, ed) => headerFooterPage(c, ed, { fld, sel, range, chk, seg }),
  numbering: (c, ed) => numberingPage(c, ed, { fld, sel, chk, seg }),
  structure: (c, ed) => structurePage(c, ed, { fld, sel, range, chk, seg }),
  sections: (c, ed) => sectionsPage(c, ed, { fld, chk, seg }),
  cover: (c, ed) => coverPage(c, ed, { fld, sel, chk, seg }),
  decor: (c, ed) => decorPage(c, ed, { fld, sel, range, chk, seg }),
  presets: (c, ed) => presetsPage(c, ed),
  warnings: (_c, ed) => {
    const pf = ed.preflight ? ed.preflight() : { findings: [], blockingCount: 0 };
    const { findings = [] } = pf;
    if (!findings.length) return [h('h4', {}, 'Warnings'), h('p', { class: 'sub' }, h('span', { class: 'lv-ok-ic' }, icon('check', 'ic--chev')), 'No preflight issues found. Ready to export.')];
    const SEV_LABEL = { error: 'Error', warning: 'Warn', info: 'Info' };
    const SEV_CLS = { error: 'is-error', warning: 'is-warning', info: 'is-info' };
    const rows = findings.map((f) => {
      const lineLabel = f.line ? `Line ${f.line}` : (f.path ? f.path.split(/[\\/]/).pop() : '');
      return h('div', {
        class: 'pf__row', role: 'button', tabindex: 0,
        title: f.fix ? `Fix: ${f.fix}` : f.message,
        onclick: () => f.line && ed.run('preflight.goto-line', f.line),
        onkeydown: (e) => e.key === 'Enter' && f.line && ed.run('preflight.goto-line', f.line),
      },
        h('span', { class: `pf__sev ${SEV_CLS[f.severity] || ''}` }, SEV_LABEL[f.severity] || f.severity),
        h('span', { class: 'pf__msg' }, f.message),
        lineLabel ? h('span', { class: 'pf__loc' }, lineLabel) : null,
      );
    });
    const blocking = pf.blockingCount;
    const note = blocking
      ? h('p', { class: 'pf__note pf__note--err' }, `${blocking} error${blocking === 1 ? '' : 's'} will block export — confirm "Export anyway" to override.`)
      : h('p', { class: 'pf__note' }, 'Warnings and info findings do not block export.');
    return [h('h4', {}, 'Warnings'), note, h('div', { class: 'pf__list' }, ...rows)];
  },
};

