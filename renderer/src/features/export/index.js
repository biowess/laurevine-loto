import { plainText } from '../../core/export/plain-text.js';
import { planPackage } from '../../core/export/package.js';
import { prepareDocx } from '../../core/docx/normalize.js';
import { backstagePages } from '../../ui/backstage/registry.js';
import { setPreviewExtras } from '../../ui/editor/editor-pane.js';
import { runCommand } from '../../ui/shell/panels.js';
import { docInput } from '../publish/index.js';
import * as pandoc from '../../services/pandoc-client.js';
import { writeExport, reveal, openExternal } from '../../services/doc-client.js';
import { readAsset } from '../../services/pdf-client.js';
import { getSetting } from '../../services/settings-client.js';
import { destDir, stemFor, results } from './dest.js';
import { targetOf, exportDiagram } from './diagram.js';
import { exportPage, primePandoc } from './page.js';

export const FORMATS = [
  { id: 'pdf', name: 'PDF', icon: 'file-output', cmd: 'pub.pdf-studio', note: 'Typeset pages with templates, palettes and columns. Always asks where to save.', label: 'Open Studio…', studio: true },
  { id: 'html', name: 'HTML', icon: 'globe', cmd: 'pub.html', note: 'Standalone page with the preview styling.', options: 'html-export' },
  { id: 'docx', name: 'DOCX', icon: 'file-type', cmd: 'pub.export-docx', note: 'Word document converted by Pandoc; layout is approximate.', pandoc: true, options: 'docx-export' },
  { id: 'rtf', name: 'RTF', icon: 'file-text', cmd: 'pub.export-rtf', note: 'Rich Text Format converted by Pandoc; layout is approximate.', pandoc: true },
  { id: 'text', name: 'Plain text', icon: 'file-text', cmd: 'pub.export-text', note: 'All formatting removed; tables stay aligned.' },
  { id: 'package-zip', name: 'Markdown package (.zip)', icon: 'package', cmd: 'pub.export-package', note: 'The document and its images in one zip, with relative paths.' },
  { id: 'package-folder', name: 'Markdown package (folder)', icon: 'package', cmd: 'pub.export-package-folder', note: 'The same package written into a new folder.' },
];

FORMATS.push({ id: 'collection', name: 'Collection Builder', icon: 'library', cmd: 'pub.collection', note: 'Combine several workspace documents into one PDF, or export them as separate files.', label: 'Open Builder…', collection: true });

const wait = { focus: '' };
let pending = null;

export async function pandocStatus() {
  try { const info = await pandoc.detect(); return { ok: !!(info && info.found && info.supported), info }; } catch { return { ok: false, info: null }; }
}

function report(ctx, id, label, r, warnings, noOpen) {
  const { ui } = ctx, n = warnings.filter((w) => w.level === 'warn').length;
  results.set(id, { path: r.path, warnings });
  const t = ui.toast(`${label} saved${n ? ` · ${n} warning${n === 1 ? '' : 's'}` : ''}.`, { timeout: 12000 });
  t.append(ui.h('button', { class: 'lv-toast__btn', onclick: () => { t.remove(); reveal(r.path).catch(() => {}); } }, 'Show in Folder'));
  if (!noOpen && getSetting('export.openAfterExport')) openExternal(r.path).catch(() => {});
}

export async function exportText(ctx) {
  const d = docInput(ctx);
  if (!d) return null;
  try {
    const { text, warnings } = plainText(d.text, { profile: getSetting('markdown.defaultProfile'), anchorStrategy: getSetting('markdown.anchorStrategy') });
    const r = await writeExport({ kind: 'file', ext: 'txt', defaultName: stemFor(d, prepareDocx(d.text).metadata), dir: destDir(d.baseDir), entries: [{ name: 'export.txt', text }] });
    if (r.canceled) { ctx.ui.toast('Plain text export canceled.'); return null; }
    report(ctx, 'text', 'Plain text', r, warnings);
    return r;
  } catch (err) {
    ctx.ui.toast(`Plain text export failed: ${err.message}`, { timeout: 8000 });
    return null;
  }
}

export async function exportPackage(ctx, kind = 'zip') {
  const d = docInput(ctx);
  if (!d) return null;
  const t = ctx.ui.toast('Collecting images…', { timeout: 0 });
  try {
    const plan = planPackage(d.text), stem = stemFor(d, prepareDocx(d.text).metadata), warnings = [...plan.warnings];
    const entries = [{ name: `${stem.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim() || 'Document'}.md`, text: plan.markdown }];
    if (plan.refs.length && !d.baseDir) warnings.push({ kind: 'asset', message: 'Save the document first so its images can be found; none were copied.', line: 0, level: 'warn' });
    else {
      for (const ref of plan.refs) {
        try { entries.push({ name: ref.to, data: (await readAsset(d.baseDir, ref.from)).data }); } catch { warnings.push({ kind: 'asset', message: `${ref.from} could not be read, so it is missing from the package.`, line: 0, level: 'warn' }); }
      }
    }
    const r = await writeExport({ kind, defaultName: stem, dir: destDir(d.baseDir), entries });
    t.remove();
    if (r.canceled) { ctx.ui.toast('Package export canceled.'); return null; }
    report(ctx, kind === 'zip' ? 'package-zip' : 'package-folder', 'Markdown package', r, warnings, kind === 'folder');
    return r;
  } catch (err) {
    t.remove();
    ctx.ui.toast(`Package export failed: ${err.message}`, { timeout: 8000 });
    return null;
  }
}

export async function exportRtf(ctx) {
  const d = docInput(ctx);
  if (!d) return null;
  if (!(await pandocStatus()).ok) { ctx.ui.toast('RTF export needs Pandoc. Open Export to see its status.', { timeout: 6000 }); return null; }
  const prep = prepareDocx(d.text), job = `rtf-${Date.now().toString(36)}`;
  const t = ctx.ui.toast('Converting to RTF…', { timeout: 0 });
  t.append(ctx.ui.h('button', { class: 'lv-toast__btn', onclick: () => { pandoc.cancel(job).catch(() => {}); } }, 'Cancel'));
  try {
    const r = await pandoc.exportRtf({ id: job, markdown: prep.markdown, defaultName: stemFor(d, prep.metadata), baseDir: d.baseDir || '', dir: destDir(d.baseDir), toc: false, metadata: prep.metadata });
    t.remove();
    if (r.canceled) { ctx.ui.toast('RTF export canceled.'); return null; }
    const notes = [...prep.warnings, ...r.messages.map((message) => ({ kind: 'pandoc', message, line: 0, level: 'warn' }))];
    report(ctx, 'rtf', 'RTF', r, notes);
    return r;
  } catch (err) {
    t.remove();
    ctx.ui.toast(`RTF export failed: ${err.message}`, { timeout: 8000 });
    return null;
  }
}

export function previewWarnings(ctx, id) {
  const d = docInput(ctx);
  if (!d) return [];
  try {
    if (id === 'text') return plainText(d.text, { profile: getSetting('markdown.defaultProfile') }).warnings;
    if (id === 'rtf' || id === 'docx') return prepareDocx(d.text).warnings;
    if (id.startsWith('package')) {
      const p = planPackage(d.text);
      return [...(p.refs.length ? [{ kind: 'asset', message: `${p.refs.length} image${p.refs.length === 1 ? '' : 's'} will be copied into assets/.`, line: 0, level: 'info' }] : []), ...p.warnings];
    }
  } catch { /* preview only */ }
  return [];
}

export function registerExport(ctx) {
  const { store, commands } = ctx, has = () => !!store.get().documents.activeId, NO_DOC = 'No document is open';
  const open = (focus) => { wait.focus = focus || ''; store.dispatch({ type: 'ui/backstage', open: true, page: 'export' }); };
  const cmd = (id, title, icon, run, extra = {}) => commands.register({ id, title, icon, group: 'Publishing', run, enabled: has, reason: NO_DOC, ...extra });
  cmd('pub.export-page', 'Export…', 'file-output', () => open(''));
  cmd('pub.text', 'Plain Text…', 'file-text', () => open('text'));
  cmd('pub.md-package', 'Markdown Package…', 'package', () => open('package-zip'));
  cmd('pub.rtf', 'RTF Export…', 'file-text', () => open('rtf'));
  cmd('pub.export-text', 'Export as Plain Text', 'file-text', () => exportText(ctx));
  cmd('pub.export-package', 'Export Markdown Package (.zip)', 'package', () => exportPackage(ctx, 'zip'));
  cmd('pub.export-package-folder', 'Export Markdown Package (folder)', 'package', () => exportPackage(ctx, 'folder'));
  cmd('pub.export-rtf', 'Export as RTF', 'file-text', () => exportRtf(ctx));

  const exportPending = (f) => (pending ? exportDiagram(ctx, pending, f) : null);
  const reason = 'Right-click a diagram, equation or code block in the preview';
  commands.register({ id: 'preview.export-svg', title: 'Export as SVG…', icon: 'image', group: 'Preview', run: () => exportPending('svg'), enabled: () => !!pending, reason });
  commands.register({ id: 'preview.export-png', title: 'Export as PNG…', icon: 'image', group: 'Preview', run: () => exportPending('png'), enabled: () => !!pending, reason });
  setPreviewExtras((e) => {
    const t = targetOf(e.target);
    if (!t) return [];
    const item = (label, id) => ({ label, onSelect: () => { pending = t; runCommand(id); } });
    return ['-', item('Export as SVG…', 'preview.export-svg'), item('Export as PNG…', 'preview.export-png')];
  });

  const api = { formats: FORMATS, pandoc: pandocStatus, hasDoc: has, preview: (id) => previewWarnings(ctx, id), focus: () => { const f = wait.focus; wait.focus = ''; return f; } };
  backstagePages.register({ id: 'export', title: 'Export', icon: 'file-output', render: () => exportPage(ctx, api) });
  pandocStatus().then(primePandoc);
}
