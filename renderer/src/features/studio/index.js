import { applyPalette, patchExportConfig, validateExportConfig } from '../../../../shared/export-config.js';
import { confirmDialog } from '../files/dialogs.js';
import { askKeep, diff, previewDialog } from './gallery.js';
import { paletteCommands } from './palette-cmds.js';
import { selectSections } from './sections-page.js';
import { paletteContrast } from '../../core/publish/palette-contrast.js';
import { getTemplate, templateConfig } from '../../core/publish/templates/index.js';
import { uiActions } from '../../state/slices/ui.js';
import { docInput, exportPdf } from '../publish/index.js';
import { PAGES } from './pages.js';
import { createPreview } from './preview.js';
import { presetCommands, openPresetsManager, presetState, getDocPreset, setDocPreset } from './presets-page.js';
import * as PC from '../../services/presets-client.js';

const SEC = [['template', 'Template', 'layout-template'], ['typography', 'Typography', 'type'], ['palette', 'Palette', 'palette'], ['columns', 'Columns', 'columns-3'], ['page', 'Page', 'file'], ['header-footer', 'Header & Footer', 'panel-top'], ['numbering', 'Page Numbers', 'list-ordered'], ['cover', 'Cover Page', 'book-open'], ['decor', 'Watermark & Decor', 'frame'], ['structure', 'Structure', 'list-tree'], ['sections', 'Sections', 'list-tree'], ['warnings', 'Warnings', 'triangle-alert'], ['presets', 'Presets', 'bookmark']];
const S = { sec: 'template', cfg: null, undo: [], redo: [], view: { zoom: 'width', spread: false } };
let C, P = null, setCol = () => {}, viewBar = () => {};

const apply = (cfg, now) => { S.cfg = cfg; setCol(); viewBar(); if (P) P.schedule(S.cfg, now); };
const edit = (cfg, now) => {
  if (JSON.stringify(cfg) !== JSON.stringify(S.cfg)) { S.undo.push(S.cfg); if (S.undo.length > 100) S.undo.shift(); S.redo = []; }
  apply(cfg, now);
};
const jump = (from, to) => { if (from.length) { to.push(S.cfg); apply(from.pop(), true); } };
const RESET = ['typography', 'palette', 'columns', 'page', 'header-footer', 'numbering', 'cover', 'decor'];

// WCAG rows for the export palette currently being edited (same shape as core/a11y/contrast checkPairs).
export const exportContrast = () => paletteContrast(S.cfg.palette);

export function register(ctx) {
  C = ctx; S.cfg = templateConfig('editorial').config;
  const { commands, store } = ctx, go = (a) => store.dispatch(a);
  const reg = (id, title, icon, run, extra) => commands.register({ id, title, icon, group: 'Studio', run, ...extra });
  const pv = (f) => (a) => P && f(P, a), has = () => !!P && P.st.pages > 1;
  commands.register({ id: 'pub.open-studio', title: 'Open Export Studio', icon: 'file-output', group: 'Publishing', run: () => {
    go(uiActions.studio(true));
  } });
  // The studio overlays whatever it was opened from (backstage stays mounted underneath), so closing is instant.
  reg('studio.close', 'Back to Export', 'arrow-left', () => { go(uiActions.studio(false)); });
  SEC.forEach(([id, t, ic, planned]) => reg(`studio.section-${id}`, t, ic, () => { S.sec = id; setCol(); }, planned ? { planned: true } : null));
  reg('studio.sections-select', 'Select Sections', 'list-checks', (a) => { selectSections(a || {}); setCol(); });
  reg('studio.set', 'Change Export Setting', 'sliders-horizontal', (patch) => edit(patchExportConfig(S.cfg, patch).config));
  reg('studio.template', 'Choose Template', 'layout-template', async (id) => {
    if (!getTemplate(id) || id === S.cfg.template) return;
    const mine = diff(templateConfig(S.cfg.template, S.cfg).config, S.cfg), keep = mine ? await askKeep(C) : false;
    if (keep === null) return;
    const bad = validateExportConfig(getTemplate(id).defaults).problems, t = templateConfig(id, S.cfg).config;
    if (bad.length) C.ui.toast(`Template defaults invalid: ${bad[0].path} ${bad[0].message}`);
    edit(keep ? patchExportConfig(t, mine).config : t, true);
  });
  reg('studio.template-preview', 'Preview Template', 'eye', (id) => previewDialog(C, id));
  reg('studio.palette', 'Choose Palette', 'palette', (id) => edit(applyPalette(S.cfg, id).config));
  reg('studio.undo', 'Undo', 'undo-2', () => jump(S.undo, S.redo), { enabled: () => S.undo.length > 0 });
  reg('studio.redo', 'Redo', 'redo-2', () => jump(S.redo, S.undo), { enabled: () => S.redo.length > 0 });
  reg('studio.reset-section', 'Reset Section', 'rotate-ccw', () => { const k = S.sec; if (RESET.includes(k)) edit(patchExportConfig(S.cfg, Object.fromEntries((k === 'decor' ? [k, 'watermark'] : [k]).map((x) => [x, templateConfig(S.cfg.template).config[x]]))).config); }, { enabled: () => RESET.includes(S.sec) });
  paletteCommands(reg, () => S.cfg, () => setCol(), C);
  presetCommands(reg, () => S.cfg, () => setCol(), C, (cfg) => edit(cfg, true));
  commands.register({ id: 'custom.presets', title: 'Manage Export Presets', icon: 'bookmark', group: 'Tools', run: () => openPresetsManager(C, (t) => { presetState.set(t.name, t.config); const d = C.services.documents.getActive(); if (d) setDocPreset(d.path || d.id, t.name); edit(t.config, true); }) });
  reg('studio.preview', 'Refresh Preview', 'refresh-cw', pv((p) => p.schedule(S.cfg, true)));
  reg('studio.cancel-preview', 'Cancel Preview', 'x', pv((p) => p.cancel()));
  reg('studio.prev-page', 'Previous Page', 'chevron-left', pv((p) => p.step(-1)), { enabled: has });
  reg('studio.next-page', 'Next Page', 'chevron-right', pv((p) => p.step(1)), { enabled: has });
  reg('studio.goto-page', 'Go to Page', 'hash', pv((p, n) => p.goto(n)), { enabled: has });
  reg('studio.zoom-in', 'Zoom In', 'plus', pv((p) => p.zoomBy(0.1)));
  reg('studio.zoom-out', 'Zoom Out', 'minus', pv((p) => p.zoomBy(-0.1)));
  reg('studio.zoom-width', 'Fit Width', 'move-horizontal', pv((p) => p.setZoom('width')));
  reg('studio.zoom-page', 'Fit Page', 'scan', pv((p) => p.setZoom('page')));
  reg('studio.zoom-100', 'Actual Size', 'search', pv((p) => p.setZoom(1)));
  reg('studio.spread', 'Toggle Two-Page Spread', 'book-open', pv((p) => p.toggleSpread()));
  reg('studio.export-pdf', 'Export PDF', 'file-output', () => exportPdf(C, S.cfg), { enabled: () => !!docInput(C), reason: 'No document is open' });
  // Jump from a preflight finding to its source line in the editor.
  C.commands.register({
    id: 'preflight.goto-line', title: 'Go to Source Line', icon: 'corner-down-right', group: 'Studio',
    run: (line) => {
      if (!Number.isInteger(line) || line < 1) return;
      C.store.batch(() => { C.store.dispatch(uiActions.backstage(false)); C.store.dispatch(uiActions.studio(false)); });
      setTimeout(() => {
        const v = C.services.documents.editorRun('view');
        if (!v) return;
        const l = v.state.doc.line(Math.min(line, v.state.doc.lines));
        v.dispatch({ selection: { anchor: l.from }, effects: v.constructor.scrollIntoView(l.from, { y: 'center' }), userEvent: 'select.goto' });
        v.focus();
      }, 150);
    },
  });
}

export function mountStudio(root = document.getElementById('studio')) {
  const { h, icon, runCommand } = C.ui, { store } = C;
  const run = (id) => (a) => runCommand(id, a);
  const ED = { run: runCommand, doc: () => docInput(C), patch: run('studio.set'), template: run('studio.template'), preview: run('studio.template-preview'), palette: run('studio.palette'), preflight: () => (P ? P.st.preflight : { findings: [], errors: [], warnings: [], blockingCount: 0 }) };
  const cb = (id, ic, label, cls, text) => h('button', { type: 'button', class: cls, title: label, 'aria-label': label, dataset: { cmd: id }, onclick: () => runCommand(id) }, icon(ic), text ? label : null);
  const nav = h('nav', { class: 'md-stnav', 'aria-label': 'Studio sections' }), set = h('div', { class: 'md-stset' }), bar = h('div', { class: 'md-pvbar' });
  const box = h('div', { class: 'lv-pvbox' }), thumbs = h('div', { class: 'lv-thumbs' }), status = h('div', { class: 'lv-status', role: 'status' }), sum = h('div', { class: 'sum' }), sub = h('span', { class: 'sub' });
  root.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!(e.ctrlKey || e.metaKey) || e.altKey || (k !== 'z' && k !== 'y') || e.target.matches('input[type=text],input[type=number],textarea')) return;
    e.preventDefault();
    runCommand(k === 'y' || e.shiftKey ? 'studio.redo' : 'studio.undo');
  });
  root.addEventListener('keydown', (e) => {
    if (!P || e.altKey || e.defaultPrevented || e.target.matches('input,textarea,select')) return;
    const k = e.key, c = e.ctrlKey || e.metaKey, zk = { '+': 'in', '=': 'in', '-': 'out', _: 'out', 0: 'page', 1: '100', 2: 'width' }[k];
    let cmd, arg;
    if (c && zk) cmd = `studio.zoom-${zk}`;
    else if (!c && box.contains(e.target) && ['PageDown', 'PageUp', 'Home', 'End'].includes(k)) {
      [cmd, arg] = k === 'PageDown' ? ['studio.next-page'] : k === 'PageUp' ? ['studio.prev-page'] : ['studio.goto-page', k === 'Home' ? 1 : P.st.pages];
    }
    if (!cmd) return;
    e.preventDefault(); runCommand(cmd, arg);
  });
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'PDF Export Studio');
  root.replaceChildren(
    h('div', { class: 'md-sthead' }, cb('studio.close', 'arrow-left', 'Back to Export', 'tbtn'), h('h2', {}, 'PDF Export Studio'), sub, h('span', { class: 'sp' }), cb('studio.undo', 'undo-2', 'Undo', 'tbtn'), cb('studio.redo', 'redo-2', 'Redo', 'tbtn'), cb('studio.reset-section', 'rotate-ccw', 'Reset Section', 'btn btn--sm', true), cb('studio.preset-save', 'save', 'Save Preset', 'btn btn--sm', true), cb('studio.preview', 'refresh-cw', 'Refresh Preview', 'btn btn--sm', true)),
    h('div', { class: 'md-stbody' }, nav, set, h('div', { class: 'md-pvwrap' }, bar, box, thumbs, status)),
    h('div', { class: 'md-stfoot' }, sum, h('button', { type: 'button', class: 'md-export', dataset: { cmd: 'studio.export-pdf' }, onclick: async () => {
      const pf = P && P.st.preflight;
      if (pf && pf.blockingCount > 0) {
        const msg = `${pf.blockingCount} preflight error${pf.blockingCount === 1 ? '' : 's'} found (${pf.errors.map((e) => e.message.slice(0, 60)).join('; ')}). Export anyway?`;
        if (!(await confirmDialog(C, { title: 'Export Anyway?', text: msg, label: 'Export Anyway' }))) { runCommand('studio.section-warnings'); return; }
      }
      runCommand('studio.export-pdf');
    } }, icon('file-output'), 'Export PDF…')));

  setCol = () => {
    const y = set.dataset.sec === S.sec ? set.scrollTop : 0; set.dataset.sec = S.sec;
    nav.replaceChildren(...SEC.map(([id, t, ic, planned]) => h('button', { type: 'button', class: (id === S.sec ? 'is-on' : '') + (planned ? ' is-planned' : ''), 'aria-current': id === S.sec ? 'true' : null, dataset: { cmd: `studio.section-${id}` }, onclick: () => runCommand(`studio.section-${id}`) }, icon(ic), h('span', {}, t))));
    const page = PAGES[S.sec];
    set.replaceChildren(...(page ? page(S.cfg, ED) : [h('h4', {}, SEC.find((s) => s[0] === S.sec)[1]), h('p', { class: 'sub' }, 'Not available yet.')]).filter(Boolean));
    set.scrollTop = y;
    for (const id of ['studio.undo', 'studio.redo', 'studio.reset-section', 'studio.preset-save']) { const b = root.querySelector(`[data-cmd="${id}"]`); if (b) b.disabled = !C.commands.canRun(id); }
  };
  viewBar = () => {
    if (!P) return;
    const { st } = P, c = S.cfg, id = store.get().documents.activeId, e = id && C.services.documents.getEntry(id);
    S.view = { zoom: st.zoom, spread: st.spread };
    const mod = presetState.isModified(c);
    sub.textContent = `${e ? e.doc.name : 'No document'} · Preset: ${presetState.name || 'Custom'}${mod ? ' (modified)' : ''}`;
    bar.replaceChildren(cb('studio.prev-page', 'chevron-left', 'Previous Page', 'tbtn'),
      h('input', { class: 'lv-pgin', type: 'number', min: 1, max: st.pages || 1, value: st.page, 'aria-label': 'Go to page', onchange: (ev) => runCommand('studio.goto-page', +ev.target.value) }), ` of ${st.pages}${st.basePages && st.basePages !== st.pages ? ` (${st.basePages} before)` : ''}`,
      cb('studio.next-page', 'chevron-right', 'Next Page', 'tbtn'), h('span', { class: 'sp' }),
      cb('studio.zoom-width', 'move-horizontal', 'Fit Width', 'tbtn'), cb('studio.zoom-page', 'scan', 'Fit Page', 'tbtn'), cb('studio.zoom-out', 'minus', 'Zoom Out', 'tbtn'),
      h('button', { type: 'button', class: 'tbtn lv-zlab', title: 'Actual Size', dataset: { cmd: 'studio.zoom-100' }, onclick: () => runCommand('studio.zoom-100') }, `${st.pct}%`),
      cb('studio.zoom-in', 'plus', 'Zoom In', 'tbtn'), cb('studio.spread', st.spread ? 'file' : 'book-open', st.spread ? 'Single Page' : 'Two-Page Spread', 'tbtn'));
    const aff = new Set(st.affected || []);
    thumbs.replaceChildren(...st.titles.map((t, i) => {
      const on = aff.has(i + 1);
      return h('button', { type: 'button', class: 'lv-th' + (i + 1 === st.page ? ' is-on' : '') + (on ? ' is-affected' : ''), title: `Page ${i + 1}${on ? ' · section layout' : ''}`, style: { aspectRatio: `${st.w}/${st.h}` }, dataset: { cmd: 'studio.goto-page' }, onclick: () => runCommand('studio.goto-page', i + 1) }, h('i', {}, t), h('b', {}, String(i + 1)));
    }));
    const cur = $th(thumbs);
    if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    status.textContent = st.text;
    sum.replaceChildren(h('b', {}, (getTemplate(c.template) || { name: c.template }).name), ` · Preset: ${presetState.name || 'Custom'}${mod ? ' (modified)' : ''} · ${c.typography.bodyFont} / ${c.typography.headingFont} · ${c.columns.count} column${c.columns.count > 1 ? 's' : ''} · ${c.page.size} ${c.page.orientation}`, h('br'), 'Destination: chosen when exporting');
    if (S.sec === 'warnings') setCol(); // refresh findings list after each render
  };
  const $th = (el) => el.querySelector('.is-on');

  const draw = () => {
    const open = store.get().ui.studio.open;
    root.hidden = !open;
    if (open && !P) {
      S.sec = SEC[0][0];
      const id = store.get().documents.activeId, e = id && C.services.documents.getEntry(id);
      const pref = getDocPreset(e && (e.doc.path || e.doc.id));
      P = createPreview(C, box, viewBar, S.view); setCol(); viewBar();
      // Defer first render until presets load — avoids a wasted Paged.js pass with the wrong config.
      PC.list().then(({ items }) => {
        const found = items.find((x) => x.name === pref || x.id === pref);
        if (found) { presetState.set(found.name, found.config); apply(found.config, true); }
        else apply(S.cfg, true);
      }).catch(() => { apply(S.cfg, true); });
    } else if (!open && P) { P.destroy(); P = null; }
  };
  const off = store.subscribe((s) => s.ui.studio, draw);
  draw();
  return () => { off(); root.hidden = true; root.replaceChildren(); if (P) P.destroy(); P = null; setCol = viewBar = () => {}; };
}
