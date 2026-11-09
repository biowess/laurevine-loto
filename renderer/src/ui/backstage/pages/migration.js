import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { register, registerAll, canRun } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import * as client from '../../../services/migration-client.js';
import { writeExport } from '../../../services/doc-client.js';
import { STEPS, initial, canNext, canBack, slug } from '../../../core/migration/wizard.js';
import { toMarkdown, toHtml, summary } from '../../../core/migration/report-view.js';
import { reportView } from './migration-view.js';
import { createApply } from './migration-apply.js';

registerAll('Migration', [['migration.in-place', 'Open in Place', 'folder-input'], ['migration.copy', 'Import as Copy', 'copy'], ['migration.new-workspace', 'Create a New Workspace', 'folder-plus'], ['migration.open-workspace', 'Open Imported Workspace', 'folder-open']]);

let S = initial(), box = null, prog = null, unsub = null, token = 0;
const num = (n) => Number(n || 0).toLocaleString('en-US');
const connected = () => box && box.isConnected;
// Shared disabled styling keys off [disabled]: mirror every command's enabled state onto its button.
const sync = () => { for (const b of box.querySelectorAll('[data-cmd]')) b.disabled = !canRun(b.dataset.cmd); };
const draw = () => { if (connected()) { box.replaceChildren(...view()); sync(); } };
const msg = (e) => String((e && e.message) || e || 'Something went wrong.');
const stop = () => { if (unsub) { try { unsub(); } catch { /* already closed */ } unsub = null; } };

function progressText(p) {
  if (!p) return 'Starting scan… Reading notes and links.';
  return `${num(p.files)} files found, ${num(p.documents)} Markdown documents read. Please wait while links and frontmatter are analyzed.`;
}

async function startScan() {
  const mine = ++token;
  stop();
  S = { ...S, step: 1, scanning: true, progress: null, report: null, strategy: '', dest: null, convert: false, result: null, tx: null, error: '', notice: '' };
  try { unsub = client.onProgress((p) => { if (mine !== token || !S.scanning) return; S.progress = p; if (prog && prog.isConnected) prog.textContent = progressText(p); }); } catch { unsub = null; }
  draw();
  try {
    const r = await client.scan(S.source.path);
    if (mine !== token) return;
    stop();
    if (r.canceled) S = { ...S, step: 0, scanning: false, notice: 'The scan was canceled. You can pick another source or try again.' };
    else S = { ...S, step: 2, scanning: false, report: r.report };
  } catch (e) {
    if (mine !== token) return;
    stop();
    S = { ...S, step: 0, scanning: false, error: `Scan failed: ${msg(e)}. Ensure the source is readable and contains valid files.` };
  }
  draw();
}


async function cancel() {
  if (!S.scanning) return;
  token++;
  stop();
  S = { ...S, step: 0, scanning: false, notice: 'The scan was canceled.' };
  draw();
  try { await client.cancelScan(); } catch { /* nothing left to cancel */ }
}

async function pick(kind) {
  try {
    const r = await client.pickSource(kind);
    if (r.canceled) return;
    S = { ...S, source: { path: r.path, kind: r.kind, name: r.name }, report: null, strategy: '', dest: null, convert: false, result: null, tx: null, error: '', notice: '' };
  } catch (e) { S = { ...S, error: msg(e) }; }
  draw();
}

async function exportReport(ext) {
  if (!S.report) return;
  const base = `compatibility-report-${slug(S.source && S.source.name)}`;
  try {
    const r = await writeExport({ kind: 'file', defaultName: base, ext, entries: [{ name: `${base}.${ext}`, text: ext === 'md' ? toMarkdown(S.report) : toHtml(S.report) }] });
    S = { ...S, error: '', notice: r.canceled ? '' : `Compatibility report saved to ${r.path}` };
  } catch (e) { S = { ...S, notice: '', error: `The compatibility report could not be saved: ${msg(e)}` }; }
  draw();
}

function go(step) { S = { ...S, step, error: '', notice: '' }; draw(); }
const next = () => { if (!canNext(S)) return; if (S.step === 0) startScan(); else if (S.step === 4) A.runApply(); else go(S.step + 1); };
const back = () => { if (!canBack(S)) return; if (S.scanning) cancel(); else go(S.step - 1); };

const R = (id, title, icon, run, extra) => register({ id, title, icon, group: 'Migration', run, ...extra });
R('migration.pick-folder', 'Choose Source Folder', 'folder-search', () => pick('folder'));
R('migration.pick-zip', 'Choose Source ZIP Archive', 'file-archive', () => pick('zip'));
R('migration.next', 'Migration: Next Step', 'arrow-right', next, { enabled: () => canNext(S) });
R('migration.back', 'Migration: Previous Step', 'arrow-left', back, { enabled: () => canBack(S) });
R('migration.cancel-scan', 'Cancel Migration Scan', 'x', cancel, { enabled: () => S.scanning });
R('migration.rescan', 'Scan Source Again', 'rotate-cw', () => { if (S.source && !S.scanning) startScan(); }, { enabled: () => !!S.source && !S.scanning });
R('migration.export-md', 'Export Compatibility Report as Markdown', 'file-text', () => exportReport('md'), { enabled: () => !!S.report });
R('migration.export-html', 'Export Compatibility Report as HTML', 'globe', () => exportReport('html'), { enabled: () => !!S.report });

const btn = (id, label, ic, o = {}) => h('button', { type: 'button', class: `btn${o.primary ? ' btn--primary' : ''}`, dataset: { cmd: id }, disabled: o.disabled, onclick: () => runCommand(id) }, ic ? icon(ic) : null, label);
const line = (cls, text) => (text ? h('p', { class: `lv-mig__msg ${cls}`, role: cls === 'is-error' ? 'alert' : 'status' }, text) : null);
const A = createApply({ get: () => S, set: (p) => { S = { ...S, ...p }; draw(); }, go, btn, line });

function steps() {
  return h('ol', { class: 'lv-mig__steps', 'aria-label': 'Migration progress' }, STEPS.map(([id, label], i) => h('li', { class: i < S.step ? 'is-done' : i === S.step ? 'is-current' : '', dataset: { step: id }, 'aria-current': i === S.step ? 'step' : null }, label)));
}

function source() {
  return [
    h('p', {}, 'Choose the folder or ZIP archive that holds your existing Markdown notes. The scan only reads it: nothing is changed, copied, or run.'),
    h('div', { class: 'md-cta' }, btn('migration.pick-folder', 'Choose Folder…', 'folder-search'), btn('migration.pick-zip', 'Choose ZIP Archive…', 'file-archive')),
    S.source ? h('div', { class: 'lv-mig__src' }, icon(S.source.kind === 'zip' ? 'file-archive' : 'folder'), h('b', {}, S.source.name), h('small', {}, S.source.path)) : h('p', { class: 'sub' }, 'No source chosen yet. Choose a folder or ZIP archive of Markdown notes to begin.'),
    line('is-error', S.error), line('', S.notice),
  ];
}

function scanStep() {
  if (S.scanning) {
    prog = h('p', { class: 'lv-mig__msg' }, progressText(S.progress));
    return [h('p', {}, `Scanning ${S.source.name}…`), h('progress', { 'aria-label': 'Scan in progress' }), prog, h('div', { class: 'md-cta' }, btn('migration.cancel-scan', 'Cancel Scan', 'x'))];
  }
  const rows = S.report ? summary(S.report).slice(1, 4).map(([k, v]) => `${k}: ${v}`).join(' · ') : '';
  return [h('p', {}, S.report ? 'The scan finished.' : 'No scan has run yet. Choose a source above to scan.'), rows ? h('p', { class: 'sub' }, rows) : null, S.source ? h('div', { class: 'md-cta' }, btn('migration.rescan', 'Scan Again', 'rotate-cw')) : null, line('is-error', S.error)];
}


function body() {
  switch (S.step) {
    case 0: return source();
    case 1: return scanStep();
    case 2: return [line('', S.notice), line('is-error', S.error), ...reportView(S.report)];
    case 3: return A.strategyStep();
    case 4: return A.reviewStep();
    default: return A.finalStep();
  }
}

function view() {
  const last = S.step === STEPS.length - 1;
  return [
    h('h2', {}, 'Migration Center'),
    h('p', { class: 'sub' }, `Step ${S.step + 1} of ${STEPS.length}: ${STEPS[S.step][1]}. Bring an existing Markdown workspace into Laurevine.`),
    steps(),
    h('div', { class: 'lv-mig__body' }, body()),
    h('div', { class: 'lv-mig__nav' }, btn('migration.back', 'Back', 'arrow-left', { disabled: !canBack(S) }), h('span', { class: 'sp' }),
      last ? null : btn('migration.next', S.step === 0 ? 'Scan Source' : S.step === 4 ? (S.strategy === 'in-place' ? 'Continue' : 'Import') : 'Next', 'arrow-right', { primary: true, disabled: !canNext(S) })),
  ];
}

export default {
  id: 'migration', title: 'Migration Center', icon: 'package-open',
  render: () => { box = h('div', { class: 'lv-mig' }); box.replaceChildren(...view()); sync(); return box; },
};
