import { listFiles } from '../../services/workspace-client.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { expandSelection } from '../../core/publish/batch-plan.js';
import { markdownFiles } from '../../core/publish/collection-run.js';
import { openBatchBuilder } from './builder.js';
import { runExport } from './run.js';

const KEY = 'export.batch';

async function open(ctx, o = {}) {
  const r = await listFiles({ showHidden: false }).catch(() => null);
  if (!r || !r.root) { ctx.ui.toast('Open a workspace folder first.'); return; }
  const md = markdownFiles(r.files);
  if (!md.length) { ctx.ui.toast('This workspace has no Markdown documents to export.'); return; }
  let saved = null;
  try { saved = JSON.parse(getSetting(KEY) || 'null'); } catch { saved = null; }
  const format = o.format || (saved && saved.format) || 'pdf', name = (saved && saved.name) || r.root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || 'Export';
  let files = md;
  if (o.paths) {
    files = expandSelection(o.paths, r.root, md);
    if (!files.length) { ctx.ui.toast('The selection has no Markdown documents.'); return; }
  }
  openBatchBuilder(ctx, r.root, md, { format, name, files }, (run) => {
    setSetting(KEY, JSON.stringify({ format: run.format, name: run.name })).catch(() => {});
    runExport(ctx, r.root, run);
  });
}

export function register(ctx) {
  const reg = (id, title, icon, run) => ctx.commands.register({ id, title, icon, group: 'Publishing', run });
  reg('tool.batch-export', 'Batch Export', 'package', () => open(ctx));
  reg('pub.build-site', 'Build HTML Publication', 'globe', () => open(ctx, { format: 'site' }));
  reg('pub.export-paths', 'Export…', 'file-output', (p) => open(ctx, { paths: Array.isArray(p) ? p : typeof p === 'string' ? [p] : undefined }));
}
