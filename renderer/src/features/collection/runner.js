import { buildPublication } from '../../core/publish/index.js';
import { templateConfig } from '../../core/publish/templates/index.js';
import { mergeCollection, orderItems } from '../../core/publish/collection.js';
import { abs, bibliographyWarnings, dirOf, issueText, rebaseImages, safeName, summarize, summaryLine, toCollection } from '../../core/publish/collection-run.js';
import { envFor } from '../publish/index.js';
import { stemFor } from '../export/dest.js';
import { presetState } from '../studio/presets-page.js';
import { loadBibliography, resolveBibliographyPaths } from '../citations/sources.js';
import * as PC from '../../services/presets-client.js';
import * as api from '../../services/pdf-client.js';
import { readPath, reveal } from '../../services/doc-client.js';
import { getSetting } from '../../services/settings-client.js';

const PHASE = { prepare: 'Preparing', fonts: 'Loading fonts', paginate: 'Paginating', print: 'Printing', outline: 'Adding outline', save: 'Saving' };
const MAX_SHOWN = 20;

export async function runBatch(ctx, root, state) {
  const { h, openDialog, toast } = ctx.ui;
  const pick = await api.pickPdfDir().catch((e) => { toast(`Could not choose a folder: ${e.message}`); return null; });
  if (!pick || pick.canceled) return;
  const dir = pick.dir;
  const pr = await PC.list().catch(() => null);
  const cfgs = new Map(((pr && pr.items) || []).map((p) => [p.name, p.config]));
  const fallback = templateConfig('editorial').config;
  const resolve = (name) => { const n = name || state.preset || presetState.name; return { name: n, config: cfgs.get(n) || fallback, missing: !cfgs.has(n) }; };
  const style = getSetting('bibliography.style') || 'author-year';

  let canceled = false, finished = false, current = null;
  const status = h('div', { class: 'col-run__status', role: 'status' }, 'Reading documents…');
  const bar = h('progress', { class: 'col-run__bar', max: 100, value: 0 });
  const rows = h('ol', { class: 'col-run__list' });
  const stop = () => { canceled = true; status.textContent = 'Canceling…'; if (current) api.cancelPdf(current).catch(() => {}); };
  const dlg = openDialog({
    title: 'Generating PDFs', icon: 'file-output', width: 560, body: [status, bar, rows],
    buttons: [{ label: 'Cancel', onClick: () => { stop(); return false; } }],
    onClose: () => { if (!finished) stop(); },
  });

  const c = toCollection(state), texts = {}, readErr = new Map();
  for (const i of c.items.filter((x) => x.include)) {
    if (canceled) break;
    try {
      const r = await readPath(abs(root, i.path));
      if (!r || !r.doc) throw new Error('no content');
      texts[i.path] = r.doc.text;
    } catch (e) { readErr.set(i.path, e.message); }
  }
  const ordered = orderItems(c, texts).filter((i) => i.include);
  const jobs = state.mode === 'combined' ? [{ name: state.name.trim() || 'Collection', combined: true }] : ordered.map((i) => ({ name: i.path, item: i }));
  const stEls = jobs.map((j) => h('span', { class: 'col-run__st' }, 'Waiting'));
  jobs.forEach((j, n) => rows.append(h('li', null, h('span', { class: 'col-run__name' }, j.name), stEls[n])));
  const setSt = (n, t) => { stEls[n].textContent = t; };

  async function bibsFor(path, text, r) {
    try {
      const b = await loadBibliography(resolveBibliographyPaths(text, abs(root, path), root, ''));
      r.warnings.push(...b.errors);
      return b;
    } catch { return null; }
  }

  async function build(job, cfg, r) {
    if (!job.combined) {
      const p = job.item.path, t = texts[p];
      if (t == null) throw new Error(readErr.get(p) || 'The document could not be read.');
      const env = await envFor(t, cfg), b = await bibsFor(p, t, r);
      if (b && b.entries.length) env.bibliography = { entries: b.entryMap, style };
      const base = abs(root, dirOf(p)).replace(/\/$/, '');
      return { docs: [{ id: 'doc', name: p.split('/').pop(), path: abs(root, p), text: t, baseDir: base }], env, stem: (pub) => stemFor({ name: p.split('/').pop() }, { title: pub.title, author: cfg.metadata && cfg.metadata.author }) };
    }
    const rebased = {}, bibs = {};
    for (const i of ordered) {
      if (texts[i.path] == null) continue;
      rebased[i.path] = rebaseImages(texts[i.path], i.path);
      const b = await bibsFor(i.path, texts[i.path], r);
      if (b) bibs[i.path] = b.entries;
    }
    const strategy = cfg.html && cfg.html.anchorStrategy && cfg.html.anchorStrategy !== 'auto' ? cfg.html.anchorStrategy : getSetting('markdown.anchorStrategy') || 'github';
    const m = mergeCollection(c, { texts: rebased, strategy, bibliographies: bibs, style });
    r.warnings.push(...m.issues.map(issueText), ...bibliographyWarnings(m.bibliography));
    if (!m.documents.length) throw new Error('None of the selected documents could be read.');
    const text = `---\ntitle: ${JSON.stringify(job.name)}\n---\n\n${m.markdown}`, env = await envFor(text, cfg);
    env.bibliography = m.bibliography.entries.length ? { entries: new Map(m.bibliography.entries.map((e) => [e.id, e])), style } : null;
    return { docs: [{ id: 'collection', name: job.name, path: '', text, baseDir: root }], env, stem: () => job.name };
  }

  async function runJob(job, n) {
    const r = { name: job.name, status: 'failed', warnings: [] };
    try {
      setSt(n, 'Preparing…');
      const pre = resolve(job.item && state.presets[job.item.path]);
      if (pre.missing) r.warnings.push(`Preset “${pre.name}” was not found; the Editorial template was used.`);
      const { docs, env, stem } = await build(job, pre.config, r);
      const pub = await buildPublication(docs, pre.config, env);
      r.warnings.push(...pub.warnings.map((w) => w.message || String(w)));
      if (canceled) { r.status = 'canceled'; return r; }
      const id = `pdf-${Date.now().toString(36)}-${n}`, off = api.onProgress((p) => {
        if (p.id !== id) return;
        setSt(n, `${PHASE[p.phase] || 'Exporting'} ${p.pct}%`);
        bar.value = Math.round(((n + p.pct / 100) / jobs.length) * 100);
      });
      current = id;
      let res;
      try { res = await api.exportPdf({ id, title: pub.title || job.name, html: pub.html, dir, name: safeName(stem(pub)) }); } finally { off(); current = null; }
      if (res.canceled) r.status = 'canceled';
      else if (!res.ok) throw new Error(res.error?.message || 'PDF export failed.');
      else Object.assign(r, { status: 'ok', path: res.path, pages: res.pages });
    } catch (e) {
      r.error = e && e.message ? e.message : 'The export failed.';
    }
    return r;
  }

  const results = [];
  for (let n = 0; n < jobs.length; n++) {
    let r;
    if (canceled) r = { name: jobs[n].name, status: 'canceled', warnings: [] };
    else {
      status.textContent = `Document ${n + 1} of ${jobs.length}…`;
      r = await runJob(jobs[n], n);
    }
    results.push(r);
    setSt(n, r.status === 'ok' ? `${r.pages} page${r.pages === 1 ? '' : 's'}` : r.status === 'failed' ? 'Failed' : 'Canceled');
    bar.value = Math.round(((n + 1) / jobs.length) * 100);
  }
  finished = true;
  dlg.close();
  showSummary(ctx, results);
}

function showSummary(ctx, results) {
  const { h, openDialog } = ctx.ui, s = summarize(results), first = results.find((r) => r.status === 'ok');
  const item = (r) => h('li', { class: `col-sum__item is-${r.status}` },
    h('strong', null, r.name), ` — ${r.status === 'ok' ? `${r.pages} page${r.pages === 1 ? '' : 's'}` : r.status === 'failed' ? 'failed' : 'canceled'}`,
    r.path ? h('button', { type: 'button', class: 'btn col-sum__show', onclick: () => reveal(r.path).catch(() => {}) }, 'Show in Folder') : null,
    r.error ? h('div', { class: 'col-sum__err' }, r.error) : null,
    r.warnings.length ? h('ul', { class: 'col-sum__warn' }, ...r.warnings.slice(0, MAX_SHOWN).map((w) => h('li', null, w)), r.warnings.length > MAX_SHOWN ? h('li', null, `…and ${r.warnings.length - MAX_SHOWN} more`) : null) : null);
  openDialog({
    title: 'PDF export summary', icon: 'file-output', width: 660, cls: 'col-dlg',
    body: h('div', { class: 'col-sum' }, h('p', { class: 'col-sum__line' }, summaryLine(s)), h('ul', { class: 'col-sum__list' }, ...results.map(item))),
    buttons: [...(first ? [{ label: 'Show in Folder', primary: true, onClick: () => { reveal(first.path).catch(() => {}); return false; } }] : []), { label: 'Close', primary: !first }],
  });
}
