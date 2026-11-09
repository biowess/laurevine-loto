import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { PALETTES } from '../../../../shared/export-config.js';
import { styleFromConfig } from '../../../../shared/docx-style.js';
import { templateConfig } from '../../core/publish/templates/index.js';
import { prepareDocx } from '../../core/docx/normalize.js';
import { backstagePages } from '../../ui/backstage/registry.js';
import { docInput } from './index.js';
import { destDir } from '../export/dest.js';
import * as pandoc from '../../services/pandoc-client.js';
import { getAppInfo } from '../../services/app-info.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { reveal, openExternal } from '../../services/doc-client.js';

const LIGHT = Object.keys(PALETTES).filter((id) => PALETTES[id].scheme === 'light');
const TOC_MODES = [['marker', 'Only where the document has a contents marker'], ['always', 'Always'], ['never', 'Never']];
const GUIDE = { win32: 'winget install --source winget --exact --id JohnMacFarlane.Pandoc', darwin: 'brew install pandoc', linux: 'sudo apt install pandoc' };
const NOTICE = 'DOCX is converted by Pandoc and is an approximation of the preview and PDF. Layout, columns, page decorations, diagrams and some extensions do not carry over exactly. Review the notes below and check the file in Word.';

const state = { info: null, last: null };
const ready = () => !!(state.info && state.info.found && state.info.supported);
async function refresh() { try { state.info = await pandoc.detect(); } catch { state.info = null; } return state.info; }

const settings = () => {
  const pal = getSetting('export.docxPalette');
  return { toc: getSetting('export.docxToc') || 'marker', style: getSetting('export.docxStyle') !== false, palette: LIGHT.includes(pal) ? pal : 'paper' };
};

function plan(ctx, o) {
  const d = docInput(ctx);
  if (!d) return null;
  const base = templateConfig('editorial').config, cfg = { ...base, palette: { ...base.palette, preset: o.palette, ...PALETTES[o.palette] } };
  return { d, cfg, prep: prepareDocx(d.text, { config: cfg }) };
}

function fileTitle(prep, d, cfg) {
  const pat = getSetting('export.filenamePattern') || '{title}', stem = d.name.replace(/\.[^.]+$/, '');
  return pat.replace(/\{title\}/g, prep.metadata.title || stem).replace(/\{doc\}/g, stem).replace(/\{author\}/g, prep.metadata.author || (cfg.metadata && cfg.metadata.author) || '').replace(/\{date\}/g, new Date().toISOString().slice(0, 10));
}

export async function exportDocx(ctx, over = {}) {
  const { ui, store } = ctx;
  await refresh();
  if (!ready()) { ui.toast('DOCX export needs Pandoc. Open Export > DOCX Export for help.', { timeout: 6000 }); return null; }
  const o = { ...settings(), ...over }, pl = plan(ctx, o);
  if (!pl) return null;
  const { d, cfg, prep } = pl, job = `docx-${Date.now().toString(36)}`;
  const toc = o.toc === 'always' || (o.toc === 'marker' && prep.toc);
  const t = ui.toast('Converting to DOCX…', { timeout: 0 });
  t.append(ui.h('button', { class: 'lv-toast__btn', onclick: () => { pandoc.cancel(job).catch(() => {}); } }, 'Cancel'));
  try {
    const r = await pandoc.exportDocx({ id: job, markdown: prep.markdown, defaultName: fileTitle(prep, d, cfg), baseDir: d.baseDir || '', dir: destDir(d.baseDir), toc, tocDepth: prep.tocDepth, metadata: prep.metadata, style: o.style ? styleFromConfig(cfg) : null });
    t.remove();
    if (r.canceled) { ui.toast('DOCX export canceled.'); return null; }
    const notes = [...prep.warnings, ...r.messages.map((message) => ({ kind: 'pandoc', message, line: 0, level: 'warn' }))];
    state.last = { path: r.path, notes, reference: r.reference, version: r.pandocVersion };
    const n = notes.filter((w) => w.level === 'warn').length;
    const done = ui.toast(`DOCX saved${n ? ` · ${n} conversion warning${n === 1 ? '' : 's'}` : ''}. Layout is approximate; check it in Word.`, { timeout: 14000 });
    done.append(
      ui.h('button', { class: 'lv-toast__btn', onclick: () => { done.remove(); reveal(r.path).catch(() => {}); } }, 'Show in Folder'),
      ui.h('button', { class: 'lv-toast__btn', onclick: () => { done.remove(); store.dispatch({ type: 'ui/backstage', open: true, page: 'docx-export' }); } }, 'Notes'),
    );
    if (getSetting('export.openAfterExport')) openExternal(r.path).catch(() => {});
    return state.last;
  } catch (err) {
    t.remove();
    ui.toast(`DOCX export failed: ${err.message}`, { timeout: 8000 });
    return null;
  }
}

export function docxExportPage(ctx) {
  const o = settings(), remember = (k, v) => setSetting(`export.${k}`, v).catch(() => {});
  const status = h('div', { class: 'lv-docx__panel' }), notes = h('div', { class: 'lv-docx__panel' }), result = h('div', { class: 'lv-docx__panel', style: { display: 'none' } });
  const exportBtn = h('button', { type: 'button', class: 'btn btn--primary', dataset: { cmd: 'pub.export-docx' }, onclick: async () => {
    exportBtn.disabled = true;
    try { await exportDocx(ctx, o); showResult(); drawNotes(); } finally { exportBtn.disabled = !ready(); }
  } }, icon('file-type'), 'Export DOCX…');

  const detectBtn = h('button', { type: 'button', class: 'btn', onclick: () => draw() }, 'Detect again');
  function showResult() {
    const l = state.last;
    result.style.display = l ? 'flex' : 'none';
    if (!l) return;
    result.replaceChildren(h('b', {}, 'Last export'), h('p', { class: 'sub' }, l.path),
      h('p', { class: 'sub' }, l.reference === 'generated' ? 'Styles were generated from the export palette and typography.' : 'Pandoc default styles were used (no reference document could be generated).'),
      h('div', { class: 'lv-docx__row' }, h('button', { type: 'button', class: 'btn btn--sm', onclick: () => reveal(l.path).catch(() => {}) }, icon('folder-search'), 'Show in Folder'), h('button', { type: 'button', class: 'btn btn--sm', onclick: () => openExternal(l.path).catch(() => {}) }, 'Open')));
  }

  function drawNotes() {
    const pl = plan(ctx, o), list = pl ? [...pl.prep.warnings] : [];
    if (state.last) for (const w of state.last.notes) if (w.kind === 'pandoc') list.push(w);
    notes.replaceChildren(h('b', {}, 'Conversion notes for this document'), list.length
      ? h('ul', { class: 'lv-docx__notes' }, list.map((w) => h('li', { class: w.level === 'info' ? 'is-info' : '' }, w.message + (w.line ? ` (line ${w.line})` : ''))))
      : h('p', { class: 'sub' }, 'No unsupported constructs were found. Word can still differ from the preview.'));
  }

  async function draw() {
    status.replaceChildren(h('p', { class: 'sub' }, 'Looking for Pandoc…'));
    await refresh();
    exportBtn.disabled = !ready();
    if (ready()) { status.replaceChildren(h('b', {}, 'Pandoc is ready'), h('p', { class: 'sub' }, `Version ${state.info.version}. Pandoc runs without a shell or filters, and network access is blocked for DOCX conversion.`)); return; }
    const os = await getAppInfo().then((i) => i.platform, () => 'linux');
    status.classList.add('lv-docx__panel--warn');
    status.replaceChildren(h('b', {}, 'DOCX export is disabled: Pandoc is not available'),
      h('p', {}, (state.info && state.info.message) || 'Pandoc was not found on this computer.'),
      h('p', { class: 'sub' }, 'Install Pandoc, for example with ', h('code', {}, GUIDE[os] || GUIDE.linux), ', or set its location under Preferences > Integrations, then detect again. Loto never downloads or installs it for you.'), detectBtn);
  }

  const sel = (opts, cur, on) => h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => on(e.target.value) }, opts.map(([v, l]) => { const x = h('option', { value: v }, l); if (v === cur) x.selected = true; return x; }));
  const styleChk = h('input', { type: 'checkbox', onchange: (e) => { o.style = e.target.checked; palSel.disabled = !o.style; remember('docxStyle', o.style); } });
  styleChk.checked = o.style;
  const palSel = sel(LIGHT.map((id) => [id, id[0].toUpperCase() + id.slice(1)]), o.palette, (v) => { o.palette = v; remember('docxPalette', v); drawNotes(); });
  palSel.disabled = !o.style;
  const root = h('div', { class: 'lv-docx' },
    h('h2', {}, 'DOCX Export'), h('p', { class: 'sub' }, NOTICE), status,
    h('div', { class: 'lv-docx__panel' }, h('b', {}, 'Options'),
      h('label', { class: 'lv-docx__row' }, 'Contents', sel(TOC_MODES, o.toc, (v) => { o.toc = v; remember('docxToc', v); })),
      h('label', { class: 'lv-docx__row' }, styleChk, 'Apply export typography and palette (Pandoc defaults if that fails)', palSel),
      h('p', { class: 'sub' }, 'Dark palettes are not offered: Word pages stay white. Page background, headers, footers and columns are not exported.')),
    notes, h('div', { class: 'lv-docx__row' }, exportBtn), result);
  draw();
  drawNotes();
  showResult();
  return root;
}

export function registerDocx(ctx) {
  const { store } = ctx, has = () => !!store.get().documents.activeId;
  ctx.commands.register({ id: 'pub.docx', title: 'DOCX Export…', icon: 'file-type', group: 'Publishing', run: () => store.dispatch({ type: 'ui/backstage', open: true, page: 'docx-export' }), enabled: has, reason: 'No document is open' });
  ctx.commands.register({ id: 'pub.export-docx', title: 'Export as DOCX', icon: 'file-type', group: 'Publishing', run: () => exportDocx(ctx), enabled: () => has() && ready(), reason: 'No document is open, or Pandoc is not available' });
  backstagePages.register({ id: 'docx-export', title: 'DOCX Export', icon: 'file-type', render: () => docxExportPage(ctx) });
  refresh();
}
