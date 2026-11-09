import { buildPublication } from '../../core/publish/index.js';
import { getTemplate, templateConfig } from '../../core/publish/templates/index.js';
import { BUNDLED } from '../../core/publish/font-catalog.js';
import { reveal, openExternal, saveCopy } from '../../services/doc-client.js';
import { loadHljs, loadKatex, loadMermaid } from '../../services/lazy-libs.js';
import * as api from '../../services/pdf-client.js';
import { getSetting } from '../../services/settings-client.js';
import { loadBibliography, resolveBibliographyPaths } from '../citations/sources.js';
import { runPreflight } from '../../core/publish/preflight.js';
import { fontWarnings } from '../studio/font-warning.js';
import { backstagePages } from '../../ui/backstage/registry.js';
import { destDir } from '../export/dest.js';
import { htmlConfig } from './html-config.js';
import { writeExport } from '../../services/doc-client.js';

const PHASE = { prepare: 'Preparing', fonts: 'Loading fonts', paginate: 'Paginating', print: 'Printing', outline: 'Adding outline', save: 'Saving' };
const app = (p) => new URL(`../../../${p}`, import.meta.url);
const get = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r; };
const dataUri = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

// Publications allow fonts from data: only, so template fonts and KaTeX fonts are inlined.
async function templateFonts(cfg) {
  const t = getTemplate(cfg.template), map = new Map();
  const roles = Object.values((cfg.typography && cfg.typography.roles) || {}), files = new Set([...((t && t.fonts) || []).map((f) => f.file), ...roles.flatMap((r) => (BUNDLED[r.font] || []).map((x) => x[0]))]);
  await Promise.all([...files].map(async (file) => {
    const f = { file };
    try { map.set(f.file, await dataUri(await (await get(app(`fonts/${f.file.split('/').map(encodeURIComponent).join('/')}`))).blob())); } catch { /* system fallback */ }
  }));
  return (file) => map.get(file) || '';
}

import { confirmDialog } from '../files/dialogs.js';

export async function katexCss() {
  try {
    const base = app('vendor/katex/'), css = await (await get(new URL('katex.min.css', base))).text();
    const urls = [...new Set(css.match(/url\(fonts\/[^)]+\.woff2\)/g) || [])];
    const map = new Map(await Promise.all(urls.map(async (u) => [u, `url(${await dataUri(await (await get(new URL(u.slice(4, -1), base))).blob())})`])));
    return css.replace(/url\(fonts\/[^)]+\.woff2\)/g, (u) => map.get(u));
  } catch { return ''; }
}

const readImage = async (dir, rel) => {
  if (!dir) return null;
  const r = await api.readAsset(dir, rel), s = atob(r.data), bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return { mime: r.mime, bytes };
};

async function bibFor(d) {
  if (!d) return null;
  try {
    const b = await loadBibliography(resolveBibliographyPaths(d.text, d.path, '', getSetting('bibliography.defaultPath') || ''));
    return b.entryMap.size ? { entries: b.entryMap, style: getSetting('bibliography.style') || 'author-year' } : null;
  } catch { return null; }
}

export async function envFor(text, cfg, d) {
  const fence = /^\s*(`{3,}|~{3,})\s*(\S*)/gm, langs = [...text.matchAll(fence)].map((m) => m[2]);
  const [katex, hljs, mermaid, css, fontData, bibliography] = await Promise.all([
    text.includes('$') ? loadKatex().catch(() => null) : null,
    langs.some((l) => l && l !== 'mermaid') ? loadHljs().catch(() => null) : null,
    langs.includes('mermaid') ? loadMermaid().catch(() => null) : null,
    text.includes('$') ? katexCss() : '',
    templateFonts(cfg),
    bibFor(d),
  ]);
  return { profile: getSetting('markdown.defaultProfile'), anchorStrategy: getSetting('markdown.anchorStrategy'), katex, katexCss: css, hljs, mermaid, fontData, bibliography, assets: { mode: 'inline', read: readImage } };
}

export function docInput({ store, services: { documents: D } }) {
  const id = store.get().documents.activeId, e = id ? D.getEntry(id) : null;
  if (!e) return null;
  const { name, path } = e.doc, v = D.editorRun('view'), text = v ? v.state.doc.toString() : e.doc.text;
  return { id, name, path, text, baseDir: path ? path.replace(/[\\/][^\\/]*$/, '') : '' };
}

export async function exportPdf(ctx, cfgIn) {
    const { ui } = ctx, d = docInput(ctx);
    if (!d) return;
    const { id, name, path, text, baseDir } = d;
    const job = `pdf-${Date.now().toString(36)}`;
    let stopped = false;
    const t = ui.toast('Preparing PDF…', { timeout: 0 });
    t.append(ui.h('button', { class: 'lv-toast__btn', onclick: () => { stopped = true; api.cancelPdf(job).catch(() => {}); } }, 'Cancel'));
    const off = api.onProgress((p) => { if (p.id === job) t.firstChild.textContent = `${PHASE[p.phase] || 'Exporting'} PDF… ${p.pct}%`; });
    try {
      const cfg = cfgIn || templateConfig('editorial').config;
      const pub = await buildPublication([{ id, name, path, text, baseDir }], cfg, await envFor(text, cfg, d));
      const strictness = getSetting('export.preflightStrictness') || 'warn';
      const fw = fontWarnings(cfg, pub.html);
      const pf = runPreflight({ docs: [{ id, name, path, text, baseDir }], config: { ...cfg, preflightStrictness: strictness }, html: pub.html, buildWarnings: pub.warnings, fontWarningStrings: fw });
      const blockingCount = strictness === 'off' ? 0 : strictness === 'strict' ? pf.findings.length : pf.blockingCount;
      if (blockingCount > 0) {
        const msg = `${blockingCount} preflight issue${blockingCount === 1 ? '' : 's'} found (${(strictness === 'strict' ? pf.findings : pf.errors).map((e) => e.message.slice(0, 60)).join('; ')}). Export anyway?`;
        if (!(await confirmDialog(ctx, { title: 'Export Anyway?', text: msg, label: 'Export Anyway' }))) { t.remove(); return; }
      }
      const pat = getSetting('export.filenamePattern') || '{title}';
      const title = pat.replace(/\{title\}/g, pub.title || name).replace(/\{doc\}/g, name).replace(/\{author\}/g, cfg.metadata?.author || '').replace(/\{date\}/g, new Date().toISOString().slice(0, 10));
      const r = stopped ? { canceled: true } : await api.exportPdf({ id: job, title, html: pub.html });
      t.remove();
      if (r.canceled) { ui.toast('PDF export canceled.'); return; }
      if (!r.ok) throw new Error(r.error?.message || 'PDF export failed.');
      const mb = r.fileSize ? ` · ${(r.fileSize / 1048576).toFixed(1)} MB` : '';
      const warnCount = pub.warnings.length, warnStr = warnCount ? ` · ${warnCount} warning${warnCount === 1 ? '' : 's'} during build` : '';
      const subsetStr = r.embedded && r.embedded.subset.length ? `Fonts embedded (subset): ${r.embedded.subset.join(', ')}. ` : '';
      const notEmbedded = r.embedded && r.embedded.other.length ? `Not embedded: ${r.embedded.other.join(', ')}. ` : '';
      const done = ui.toast(`PDF saved: ${r.pages} page${r.pages === 1 ? '' : 's'}${mb}${warnStr}. ${subsetStr}${notEmbedded}`, { timeout: 14000 });
      done.append(ui.h('button', { class: 'lv-toast__btn', onclick: () => { done.remove(); reveal(r.path).catch(() => {}); } }, 'Show in Folder'));
      if (getSetting('export.openAfterExport')) openExternal(r.path).catch(() => {});
    } catch (err) {
      t.remove();
      ui.toast(`PDF export failed: ${err.message}`, { timeout: 8000 });
    } finally {
      off();
    }
  }

export async function exportHtml(ctx, cfgIn) {
  const { ui } = ctx, d = docInput(ctx);
  if (!d) return;
  const { id, name, path, text, baseDir } = d;
  const t = ui.toast('Preparing HTML…', { timeout: 0 });
  try {
    const cfg = cfgIn || htmlConfig();
    const pub = await buildPublication([{ id, name, path, text, baseDir }], cfg, await envFor(text, cfg, d));
    const pat = getSetting('export.filenamePattern') || '{title}';
    const title = pat.replace(/\{title\}/g, pub.title || name).replace(/\{doc\}/g, name).replace(/\{author\}/g, cfg.metadata?.author || '').replace(/\{date\}/g, new Date().toISOString().slice(0, 10));
    t.remove();
    const r = await writeExport({ kind: 'file', ext: 'html', defaultName: title, dir: destDir(baseDir), entries: [{ name: 'export.html', text: pub.html }] });
    if (r.canceled) { ui.toast('HTML export canceled.'); return; }
    const done = ui.toast(`HTML saved: ${r.path}`, { timeout: 12000 });
    done.append(
      ui.h('button', { class: 'lv-toast__btn', onclick: () => { done.remove(); reveal(r.path).catch(() => {}); } }, 'Show in Folder'),
      ui.h('button', { class: 'lv-toast__btn', onclick: () => { done.remove(); openExternal(r.path).catch(() => {}); } }, 'Open in Browser'),
    );
    if (getSetting('export.openAfterExport')) openExternal(r.path).catch(() => {});
    return { path: r.path };
  } catch (err) {
    t.remove();
    ui.toast(`HTML export failed: ${err.message}`, { timeout: 8000 });
  }
}

export { mountPagedFrame } from './paged-frame.js';

export function register(ctx) {
  const { store } = ctx;
  ctx.commands.register({ id: 'pub.export-pdf', title: 'Export as PDF', icon: 'file-output', group: 'Publishing', run: () => exportPdf(ctx), enabled: () => !!store.get().documents.activeId, reason: 'No document is open' });
  ctx.commands.register({ id: 'pub.html', title: 'Export as HTML', icon: 'globe', group: 'Publishing', run: () => exportHtml(ctx), enabled: () => !!store.get().documents.activeId, reason: 'No document is open' });
  ctx.commands.register({ id: 'pub.html-dialog', title: 'Export as HTML…', icon: 'globe', group: 'Publishing', run: () => store.dispatch({ type: 'ui/backstage', open: true, page: 'html-export' }), enabled: () => !!store.get().documents.activeId, reason: 'No document is open' });
  import('./docx.js').then(({ registerDocx }) => registerDocx(ctx));
  import('../export/index.js').then(({ registerExport }) => registerExport(ctx));
  // Dynamic import to avoid circular dep (html-dialog imports from this index)
  import('./html-dialog.js').then(({ htmlExportPage }) => {
    backstagePages.register({ id: 'html-export', title: 'HTML Export', icon: 'globe', render: () => htmlExportPage(ctx) });
  });
}
