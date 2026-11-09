import { PALETTES } from '../../../../shared/export-config.js';
import { ROLES, normHex } from '../../../../shared/palette.js';
import { paletteContrast } from '../../core/publish/palette-contrast.js';
import * as PC from '../../services/palettes-client.js';
import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';

const MAIN = ['midnight', 'oxford', 'burgundy', 'forest', 'olive', 'slate', 'terracotta', 'monochrome', 'neutral'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const sw = (p) => h('i', {}, ...[p.background, p.text, p.accent].map((x) => h('s', { style: { background: x } })));
const ACTS = [['rename', 'Rename', 'pen-line'], ['duplicate', 'Duplicate', 'copy'], ['export', 'Export', 'download'], ['delete', 'Delete', 'trash-2']];
let saved = [];

export function palettePage(c, ed, { fld, seg }) {
  const p = c.palette, run = ed.run, set = (k, v) => ed.patch({ palette: { [k]: v, preset: 'custom' } });
  const btn = (id, ic, label, off) => h('button', { type: 'button', class: 'btn btn--sm', disabled: off ? true : null, dataset: { cmd: id }, onclick: () => run(id) }, icon(ic), label);
  const card = (id, pal) => h('button', { type: 'button', class: 'md-pal' + (id === p.preset ? ' is-on' : ''), 'aria-pressed': id === p.preset ? 'true' : 'false', onclick: () => (id === 'custom' ? ed.patch({ palette: { preset: 'custom' } }) : ed.palette(id)) }, sw(pal), cap(id));
  const grid = (ids) => h('div', { class: 'md-sw10' }, ...ids.map((id) => card(id, id === 'custom' ? p : PALETTES[id])));
  const row = ([k, label]) => {
    const txt = h('input', { type: 'text', value: p[k], maxlength: 7, spellcheck: 'false', title: 'Hex colour, #rrggbb', 'aria-label': `${label} hex` });
    txt.oninput = () => txt.classList.toggle('is-bad', !normHex(txt.value));
    txt.onchange = () => { const v = normHex(txt.value); if (v) set(k, v); };
    return h('label', { class: 'md-fld lv-pc' }, h('span', {}, label), h('input', { type: 'color', value: p[k], 'aria-label': label, onchange: (e) => set(k, e.target.value) }), txt);
  };
  const rows = paletteContrast(p), bad = rows.filter((r) => r.pass === false);
  const box = h('div', { class: 'lv-psaved' });
  const fill = () => box.replaceChildren(...(saved.length ? saved.map((s) => h('div', { class: 'lv-prow' },
    h('button', { type: 'button', class: 'md-pal', title: 'Use this palette', onclick: () => run('studio.palette-use', s.id) }, sw(s.palette), s.name),
    ...ACTS.map(([a, l, ic]) => h('button', { type: 'button', class: 'tbtn', title: l, 'aria-label': `${l} ${s.name}`, dataset: { cmd: `studio.palette-${a}` }, onclick: () => run(`studio.palette-${a}`, s.id) }, icon(ic))))) : [h('p', { class: 'sub' }, 'No saved palettes yet.')]));
  fill();
  PC.list().then((r) => { if (JSON.stringify(r.items) !== JSON.stringify(saved)) { saved = r.items; if (box.isConnected) fill(); } }).catch(() => {});
  return [h('h4', {}, 'Color palette'), grid([...MAIN, 'custom']), h('h5', {}, 'Template palettes'), grid(Object.keys(PALETTES).filter((k) => !MAIN.includes(k))),
    h('h5', {}, 'Colors'), fld('Scheme', seg([['light', 'Light'], ['dark', 'Dark']], p.scheme, (v) => set('scheme', v))), ...ROLES.map(row),
    h('h5', {}, 'Contrast (WCAG AA)'),
    h('ul', { class: 'lv-cg', role: 'list' }, ...rows.map((r) => h('li', { class: r.pass === false ? 'is-bad' : null }, h('span', {}, r.name), h('b', {}, `${r.ratio ?? '–'}:1`), h('em', {}, r.pass === false ? `✕ needs ${r.need}:1` : '✓ pass')))),
    h('p', { class: 'sub', role: 'status' }, bad.length ? `${bad.length} pair${bad.length > 1 ? 's' : ''} below the AA minimum.` : 'All key pairs meet the AA minimum.'),
    btn('studio.palette-autofix', 'check', 'Auto-fix', !bad.length),
    h('h5', {}, 'My palettes'), h('div', { class: 'lv-pbar' }, btn('studio.palette-save', 'save', 'Save current…'), btn('studio.palette-import', 'folder-open', 'Import…')), box];
}
