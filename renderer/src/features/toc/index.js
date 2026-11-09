// Contents: ins.toc dialog, Refresh commands, and automatic refresh (debounced, one undoable transaction, outside markers untouched).
import { refreshChanges, tocAt } from '../../core/toc/edit.js';
import { findRegions } from '../../core/toc/region.js';
import { openTocDialog } from './dialog.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';

export function register(ctx) {
  const { commands, store, settings, services: { documents }, ui: { toast } } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';
  const strategy = () => settings.get('markdown.anchorStrategy');
  const run = (v, changes) => v.dispatch({ changes, userEvent: 'input.toc' });

  commands.register({
    id: 'ins.toc', title: 'Contents', icon: 'list-tree', group: 'Insert', portable: 'toc', enabled: ready, reason: NO_EDITOR,
    run: () => {
      const v = view();
      if (!v) return;
      openTocDialog(ctx, {
        text: v.state.doc.toString(), pos: v.state.selection.main.head, strategy: strategy(), maintenance: settings.get('toc.maintenance'),
        onApply: (plan, m) => {
          settings.set('toc.maintenance', m);
          const ev = view();
          if (ev) { run(ev, plan.change); ev.focus(); }
        },
      });
    },
  });

  const refresh = (all) => {
    const v = view();
    if (!v) return;
    const text = v.state.doc.toString(), at = all ? null : tocAt(text, v.state.selection.main.head);
    const only = at ? at.id : findRegions(text).regions.length === 1 ? findRegions(text).regions[0].id : undefined;
    if (!all && only === undefined) return toast('Place the caret inside a table of contents, or use Refresh All TOCs.');
    const r = refreshChanges(text, { strategy: strategy(), id: all ? undefined : only });
    const bad = r.problems.find((p) => !p.region) || r.problems[0];
    if (bad && !r.changes.length) return toast(`${bad.message} (line ${bad.line + 1})`);
    if (!r.changes.length) return toast('Tables of contents are up to date.');
    run(v, r.changes);
    if (r.warnings[0]) toast(r.warnings[0]);
  };
  const def = (id, title, all) => commands.register({ id, title, icon: 'refresh-cw', group: 'Insert', enabled: ready, reason: NO_EDITOR, run: () => refresh(all) });
  def('toc.refresh', 'Refresh Table of Contents', false);
  def('toc.refresh-all', 'Refresh All TOCs', true);

  let timer = 0;
  const auto = () => {
    const v = view(), id = store.get().documents.activeId;
    if (!v || !ready() || v.composing || settings.get('toc.maintenance') !== 'auto') return;
    const text = v.state.doc.toString();
    if (!text.includes('laurevine:toc:start')) return;
    const r = refreshChanges(text, { strategy: strategy(), skipPos: v.state.selection.main.head });
    if (r.changes.length && id && v.state.doc.toString() === text) run(v, r.changes);
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(auto, 700); };
  documents.onDocChange(later);
  settings.subscribe(later);
}
