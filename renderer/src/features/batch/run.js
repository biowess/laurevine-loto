import { buildPublication } from '../../core/publish/index.js';
import { templateConfig } from '../../core/publish/templates/index.js';
import { prepareDocx } from '../../core/docx/normalize.js';
import { plainText } from '../../core/export/plain-text.js';
import { imageRefs } from '../../core/publish/site.js';
import { outputNames } from '../../core/publish/batch-plan.js';
import { abs, dirOf, summarize } from '../../core/publish/collection-run.js';
import { PALETTES } from '../../../../shared/export-config.js';
import { styleFromConfig } from '../../../../shared/docx-style.js';
import { envFor } from '../publish/index.js';
import { presetState } from '../studio/presets-page.js';
import { confirmDialog } from '../files/dialogs.js';
import { buildSite, b64 } from './site-build.js';
import * as PC from '../../services/presets-client.js';
import * as api from '../../services/pdf-client.js';
import * as pandoc from '../../services/pandoc-client.js';
import { exportExists, exportTree, readPath, reveal } from '../../services/doc-client.js';
import { getSetting } from '../../services/settings-client.js';

const MAX_SHOWN = 20;
const noExt = (s) => s.replace(/\.[^./]+$/, '');

async function commit(ctx, dir, entries, confirmed) {
  const { exists } = await exportExists(dir, entries.map((e) => e.name));
  const extra = exists.filter((n) => !confirmed.has(n));
  if (extra.length && !(await confirmDialog(ctx, { title: 'Replace existing files?', text: `${extra.length} more file${extra.length === 1 ? '' : 's'} already exist (${extra.slice(0, 3).join(', ')}${extra.length > 3 ? ', …' : ''}). Replace ${extra.length === 1 ? 'it' : 'them'}?`, label: 'Replace' }))) return null;
  return exportTree(dir, entries, exists);
}

export async function runExport(ctx, root, o) {
  const { h, openDialog } = ctx.ui, { format, dir, files } = o;
  let canceled = false, finished = false, current = null;
  const status = h('div', { class: 'col-run__status', role: 'status' }, 'Reading documents…'), bar = h('progress', { class: 'col-run__bar', max: 100, value: 0 });
  const stop = () => { canceled = true; status.textContent = 'Canceling…'; if (current) api.cancelPdf(current).catch(() => {}); };
  const dlg = openDialog({ title: 'Exporting', icon: 'package', width: 480, body: [status, bar], buttons: [{ label: 'Cancel', onClick: () => { stop(); return false; } }], onClose: () => { if (!finished) stop(); } });
  const results = [], texts = {}, errs = {}, outs = new Map(outputNames(files, format, o.name).filter((x) => x.src).map((x) => [x.src, x.out]));
  const ok = (name, extra = {}) => results.push({ name, status: 'ok', warnings: [], ...extra });
  const fail = (name, e) => results.push({ name, status: 'failed', warnings: [], error: e && e.message ? e.message : 'The export failed.' });
  const tick = (n) => { bar.value = Math.round((n / files.length) * 100); status.textContent = `Document ${Math.min(n + 1, files.length)} of ${files.length}…`; };
  try {
    for (const p of files) {
      try { const r = await readPath(abs(root, p)); if (!r || !r.doc) throw new Error('no content'); texts[p] = r.doc.text; } catch (e) { errs[p] = e.message; }
    }
    const fileFmt = format === 'html' || format === 'text';
    if (format === 'site') {
      const s = await buildSite({ root, name: o.name, files, texts, step: tick });
      status.textContent = 'Writing files…';
      const w = canceled ? null : await commit(ctx, dir, s.entries, o.confirmed);
      if (w) ok(`${s.pages} page${s.pages === 1 ? '' : 's'} (${w.files} files)`, { warnings: s.warnings });
      else results.push({ name: 'Publication', status: 'canceled', warnings: [] });
    } else if (fileFmt || format === 'package') {
      const entries = [], rows = [];
      for (const [n, p] of files.entries()) {
        if (canceled) break;
        tick(n);
        if (texts[p] == null) { fail(p, new Error(errs[p] || 'The document could not be read.')); continue; }
        const row = { name: p, warnings: [] };
        try {
          if (format === 'package') {
            entries.push({ name: outs.get(p), text: texts[p] });
            for (const img of imageRefs(texts[p], p)) {
              try { entries.push({ name: `${outs.get(p).split('/')[0]}/${img}`, data: (await api.readAsset(root, img)).data }); } catch { row.warnings.push(`Image not copied: ${img}`); }
            }
          } else if (format === 'text') entries.push({ name: outs.get(p), text: plainText(texts[p], { profile: getSetting('markdown.defaultProfile'), anchorStrategy: getSetting('markdown.anchorStrategy') }).text });
          else {
            const cfg = templateConfig('editorial').config;
            const pub = await buildPublication([{ id: 'doc', name: p.split('/').pop(), path: abs(root, p), text: texts[p], baseDir: abs(root, dirOf(p)).replace(/\/$/, '') }], cfg, await envFor(texts[p], cfg));
            entries.push({ name: outs.get(p), text: pub.html });
            row.warnings = pub.warnings.map((x) => x.message || String(x));
          }
          rows.push(row);
        } catch (e) { fail(p, e); }
      }
      const w = entries.length && !canceled ? await commit(ctx, dir, [...new Map(entries.map((e) => [e.name, e])).values()], o.confirmed) : null;
      for (const r of rows) results.push({ ...r, status: w ? 'ok' : 'canceled' });
    } else {
      const pr = format === 'pdf' ? await PC.list().catch(() => null) : null, cfgs = new Map(((pr && pr.items) || []).map((x) => [x.name, x.config]));
      const pdfCfg = cfgs.get(o.preset || presetState.name) || templateConfig('editorial').config;
      const pal = getSetting('export.docxPalette') || 'paper', base = templateConfig('editorial').config, dcfg = { ...base, palette: { ...base.palette, preset: pal, ...PALETTES[pal] } };
      for (const [n, p] of files.entries()) {
        if (canceled) { results.push({ name: p, status: 'canceled', warnings: [] }); continue; }
        tick(n);
        if (texts[p] == null) { fail(p, new Error(errs[p] || 'The document could not be read.')); continue; }
        const id = `bx-${Date.now().toString(36)}-${n}`, bd = abs(root, dirOf(p)).replace(/\/$/, ''), stem = noExt(outs.get(p));
        try {
          let r;
          current = id;
          if (format === 'pdf') {
            const pub = await buildPublication([{ id: 'doc', name: p.split('/').pop(), path: abs(root, p), text: texts[p], baseDir: bd }], pdfCfg, await envFor(texts[p], pdfCfg));
            r = await api.exportPdf({ id, title: pub.title || stem, html: pub.html, dir, name: stem, overwrite: o.confirmed.has(outs.get(p)) });
          } else {
            const prep = prepareDocx(texts[p], { config: dcfg }), mode = getSetting('export.docxToc') || 'marker';
            r = await pandoc.exportDocx({ id, markdown: prep.markdown, defaultName: stem, baseDir: bd, dir, batch: true, overwrite: o.confirmed.has(outs.get(p)), toc: mode === 'always' || (mode === 'marker' && prep.toc), tocDepth: prep.tocDepth, metadata: prep.metadata, style: getSetting('export.docxStyle') !== false ? styleFromConfig(dcfg) : null });
          }
          current = null;
          if (r.canceled) results.push({ name: p, status: 'canceled', warnings: [] });
          else if (!r.ok) fail(p, new Error(r.error?.message || 'PDF export failed.'));
          else ok(p, { path: r.path, warnings: (r.messages || []).slice(0, 5) });
        } catch (e) { current = null; fail(p, e); }
      }
    }
  } catch (e) { fail('Export', e); }
  finished = true;
  dlg.close();
  summary(ctx, results, dir);
}

function summary(ctx, results, dir) {
  const { h, openDialog } = ctx.ui, s = summarize(results);
  const item = (r) => h('li', { class: `col-sum__item is-${r.status}` }, h('strong', null, r.name), ` — ${r.status === 'ok' ? 'done' : r.status}`,
    r.error ? h('div', { class: 'col-sum__err' }, r.error) : null,
    r.warnings.length ? h('ul', { class: 'col-sum__warn' }, ...r.warnings.slice(0, MAX_SHOWN).map((w) => h('li', null, w)), r.warnings.length > MAX_SHOWN ? h('li', null, `…and ${r.warnings.length - MAX_SHOWN} more`) : null) : null);
  openDialog({ title: 'Export Summary', icon: 'package', width: 660, cls: 'col-dlg', body: h('div', { class: 'col-sum' }, h('p', { class: 'col-sum__line' }, `${s.ok} done${s.failed ? `, ${s.failed} failed` : ''}${s.canceled ? `, ${s.canceled} canceled` : ''} · ${s.warnings} warning${s.warnings === 1 ? '' : 's'}`), h('ul', { class: 'col-sum__list' }, ...results.map(item))),
    buttons: [{ label: 'Show in Folder', primary: true, onClick: () => { reveal(dir).catch(() => {}); return false; } }, { label: 'Close' }] });
}
