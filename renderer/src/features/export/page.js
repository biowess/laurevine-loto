import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { runCommand } from '../../ui/shell/panels.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { pickFolder } from '../../services/image-client.js';
import { results } from './dest.js';

const MODES = [['ask', 'Ask each time'], ['same', 'Same folder as the document'], ['custom', 'A folder I choose']];
const MAX_NOTES = 5;
let cached = null; // last Pandoc status, so the page paints instantly
export const primePandoc = (st) => { cached = st; };

export function exportPage(ctx, api) {
  const { store } = ctx, focus = api.focus();
  const save = (k, v) => setSetting(`export.${k}`, v).catch(() => {});
  const go = (page) => store.dispatch({ type: 'ui/backstage', open: true, page });
  const list = h('div', { class: 'lv-exp__list' }), where = h('span', { class: 'sub' });
  let mode = getSetting('export.destination') || 'ask';

  const showDir = () => { where.textContent = mode === 'custom' ? (getSetting('export.destinationDir') || 'No folder chosen yet; the Save dialog will be used.') : mode === 'same' ? 'Files are offered beside the document (unsaved documents use the Save dialog).' : 'You choose the location in a Save dialog each time.'; };
  const modeSel = h('select', { class: 'select', onchange: (e) => { mode = e.target.value; save('destination', mode); chooser.style.display = mode === 'custom' ? '' : 'none'; showDir(); } },
    MODES.map(([v, l]) => { const o = h('option', { value: v }, l); if (v === mode) o.selected = true; return o; }));
  const chooser = h('button', { type: 'button', class: 'btn btn--sm', style: { display: mode === 'custom' ? '' : 'none' }, onclick: async () => {
    try { const r = await pickFolder(getSetting('export.destinationDir') || undefined); if (!r.canceled && r.path) { await save('destinationDir', r.path); showDir(); } } catch { /* dialog failed */ }
  } }, icon('folder-search'), 'Choose folder…');
  showDir();

  const dirNote = () => (mode === 'custom' ? `saves to ${getSetting('export.destinationDir') || 'the folder you choose'}` : mode === 'same' ? 'saves beside the document' : 'asks where to save');
  const goes = (f) => (f.studio ? 'Opens PDF Studio, which always asks where to save.'
    : f.collection ? 'Opens the Collection Builder dialog; pick documents and output there. Requires an open workspace folder.'
      : f.options ? `Export… ${dirNote()}; Options… opens the ${f.name} settings page first.` : `Export… runs from this page and ${dirNote()}.`);
  const row = (f, st) => {
    const hasDoc = api.hasDoc(), ok = f.collection ? !!store.get().workspace.root : hasDoc && (!f.pandoc || st.ok);
    const why = f.collection ? 'Open a workspace folder first.' : !hasDoc ? 'No document is open.' : f.pandoc && !st.ok ? ((st.info && st.info.message) || 'Pandoc was not found. Install it or set its location under Preferences > Integrations; Loto never downloads it for you.') : '';
    const notes = hasDoc && !f.collection ? api.preview(f.id) : [], last = results.get(f.id);
    const run = () => { if (f.collection) store.dispatch({ type: 'ui/backstage', open: false }); runCommand(f.cmd); };
    const btns = [h('button', { type: 'button', class: 'btn btn--primary btn--sm', dataset: { cmd: f.cmd }, disabled: f.studio ? !hasDoc : !ok, title: why, onclick: run }, f.label || 'Export…')];
    if (f.options) btns.unshift(h('button', { type: 'button', class: 'btn btn--sm', onclick: () => go(f.options) }, 'Options…'));
    const el = h('div', { class: `lv-exp__row${focus === f.id ? ' is-focus' : ''}`, dataset: { format: f.id } },
      h('span', { class: 'lv-exp__ic' }, icon(f.icon)),
      h('div', { class: 'lv-exp__main' },
        h('div', { class: 'lv-exp__title' }, h('b', {}, f.name), st.pending ? null : h('span', { class: ok ? 'lv-exp__st' : 'lv-exp__st is-off' }, ok ? 'Available' : 'Unavailable')),
        h('span', { class: 'sub' }, f.note),
        h('span', { class: 'sub lv-exp__goes' }, icon('corner-down-right'), goes(f)),
        !ok && !st.pending ? h('span', { class: 'sub lv-exp__off' }, why) : null,
        notes.length ? h('ul', { class: 'lv-docx__notes' }, notes.slice(0, MAX_NOTES).map((w) => h('li', { class: w.level === 'info' ? 'is-info' : '' }, w.message + (w.line ? ` (line ${w.line})` : ''))), notes.length > MAX_NOTES ? h('li', { class: 'is-info' }, `${notes.length - MAX_NOTES} more…`) : null) : null,
        last ? h('span', { class: 'sub' }, `Last export: ${last.path}`) : null),
      h('div', { class: 'lv-exp__side' }, btns));
    return el;
  };

  const paint = (st) => {
    list.replaceChildren(...api.formats.map((f) => row(f, st)));
    const hit = list.querySelector('.is-focus');
    if (hit && hit.scrollIntoView) hit.scrollIntoView({ block: 'nearest' });
  };
  const same = (a, b) => a && b && a.ok === b.ok && ((a.info && a.info.message) || '') === ((b.info && b.info.message) || '');
  function draw() {
    const shown = cached || { ok: true, pending: true };
    paint(shown);
    if (!api.formats.some((f) => f.pandoc)) return;
    api.pandoc().then((st) => { const prev = cached; cached = st; if (list.isConnected && (!same(prev, st) || shown.pending)) paint(st); });
  }

  const root = h('div', { class: 'lv-exp' },
    h('h2', {}, 'Export'),
    h('p', { class: 'sub' }, 'Publish this document in another form. Warnings are previewed from the current text; nothing is written until you confirm.'),
    h('h4', {}, 'Destination'),
    h('div', { class: 'lv-exp__dest' }, h('div', {}, h('b', {}, 'Save location'), where), h('div', { class: 'lv-exp__ctl' }, modeSel, chooser)),
    h('p', { class: 'lv-exp__note' }, 'Applies to every format except PDF, which always asks. Existing files are never replaced without confirmation.'),
    h('h4', {}, 'Formats'),
    list);
  draw();
  return root;
}
