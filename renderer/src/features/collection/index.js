import { listFiles } from '../../services/workspace-client.js';
import { getSetting, setSetting } from '../../services/settings-client.js';
import { workspaceState } from '../../core/publish/collection-run.js';
import { openBuilder } from './builder.js';
import { runBatch } from './runner.js';

const KEY = 'export.collection';

function persist(root, state) {
  const slim = { root, ...state, items: state.items.filter((i) => i.include || i.title) };
  const json = JSON.stringify(slim);
  if (json.length <= 30000) setSetting(KEY, json).catch(() => {});
}

async function load(ctx) {
  const r = await listFiles({ showHidden: false }).catch(() => null);
  if (!r || !r.root) { ctx.ui.toast('Open a workspace folder first.'); return null; }
  let saved = null;
  try { saved = JSON.parse(getSetting(KEY) || 'null'); } catch { saved = null; }
  return { root: r.root, state: workspaceState(r.files, saved && saved.root === r.root ? saved : null) };
}

async function open(ctx, o = {}) {
  const loaded = await load(ctx);
  if (!loaded) return;
  const { root, state } = loaded;
  if (o.mode) state.mode = o.mode;
  if (o.selectAll) { state.items.forEach((i) => { i.include = true; }); state.order = 'filename'; }
  const go = (s) => { persist(root, s); runBatch(ctx, root, s); };
  if (o.run && state.items.some((i) => i.include)) { go(state); return; }
  openBuilder(ctx, root, state, { onRun: go, onChange: (s) => persist(root, s) });
}

export function register(ctx) {
  const reg = (id, title, icon, run) => ctx.commands.register({ id, title, icon, group: 'Publishing', run });
  reg('pub.collection', 'Collection Builder', 'library', () => open(ctx));
  reg('pub.export-multi', 'Export Multiple Documents', 'files', () => open(ctx));
  reg('pub.export-selected', 'Export Selected Documents', 'files', () => open(ctx, { mode: 'separate', run: true }));
  reg('pub.export-workspace', 'Export Workspace', 'file-output', () => open(ctx, { selectAll: true }));
  reg('pub.collection-pdf', 'Generate PDF Collection', 'library', () => open(ctx, { mode: 'combined', run: true }));
}
