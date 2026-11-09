// Citations and Bibliography feature:
// 1. Sources: frontmatter key bibliography: and workspace default
// 2. References -> Citations: Search Bibliography popover, Citation insert, Bibliography managed region, Manager dialog
// 3. Preview integration

import { resolveBibliographyPaths, loadBibliography } from './sources.js';
import { openBibSearchPopover } from './search-popover.js';
import { openCitationDialog } from './citation-dialog.js';
import { openManagerDialog } from './manager-dialog.js';
import { planBibliography, refreshBibliography } from '../../core/bibliography/citations.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';

export async function getDocBibliography(ctx, text, path) {
  const ws = ctx.store.get().workspace?.root || '';
  const def = ctx.settings.get('bibliography.defaultPath') || '';
  const paths = resolveBibliographyPaths(text, path, ws, def);
  return loadBibliography(paths);
}

export function register(ctx) {
  const { commands, store, settings, services: { documents }, ui: { toast } } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';

  const activeEntry = () => {
    const id = store.get().documents.activeId;
    return id ? documents.getEntry(id) : null;
  };

  const currentDocInfo = () => {
    const v = view();
    const e = activeEntry();
    const text = v ? v.state.doc.toString() : (e?.doc?.text || '');
    const path = e?.doc?.path || '';
    return { v, text, path };
  };

  const anchorFor = () => {
    const v = view();
    const a = document.activeElement;
    const c = v ? v.coordsAtPos(v.state.selection.main.head) : null;
    return a && a.closest('.ribbon, .tabrow') ? a : { x: c ? c.left : 80, y: c ? c.bottom : 80, restore: v?.contentDOM };
  };

  const insertText = (str) => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    v.dispatch({
      changes: { from, to, insert: str },
      selection: { anchor: from + str.length },
      userEvent: 'input.citation',
      scrollIntoView: true,
    });
    v.focus();
  };

  // 1. Citation insert dialog
  commands.register({
    id: 'ins.citation',
    title: 'Citation',
    icon: 'quote',
    group: 'Insert',
    portable: 'citation',
    enabled: ready,
    reason: NO_EDITOR,
    run: async () => {
      const { v, text, path } = currentDocInfo();
      if (!v) return;
      const sel = v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to).trim();
      const bib = await getDocBibliography(ctx, text, path);
      openCitationDialog(ctx, {
        entries: bib.entries,
        initialKey: sel.replace(/^[@\-[]+|[\]]+$/g, ''),
        onInsert: (cite) => insertText(cite),
      });
    },
  });

  // 2. Search Bibliography popover
  commands.register({
    id: 'ref.bib-search',
    title: 'Search Bibliography',
    icon: 'library',
    group: 'Citations',
    enabled: ready,
    reason: NO_EDITOR,
    run: async () => {
      const { text, path } = currentDocInfo();
      const bib = await getDocBibliography(ctx, text, path);
      openBibSearchPopover(anchorFor(), {
        entries: bib.entries,
        onSelect: (key) => insertText(`[@${key}]`),
      });
    },
  });

  // 3. Bibliography managed region
  commands.register({
    id: 'ref.bibliography',
    title: 'Bibliography',
    icon: 'book-marked',
    group: 'Citations',
    enabled: ready,
    reason: NO_EDITOR,
    run: async () => {
      const { v, text, path } = currentDocInfo();
      if (!v) return;
      const bib = await getDocBibliography(ctx, text, path);
      const style = settings.get('bibliography.style') || 'author-year';
      const pos = v.state.selection.main.head;
      const plan = planBibliography(text, { pos, entries: bib.entries, style });

      v.dispatch({
        changes: plan.change,
        userEvent: 'input.bibliography',
        scrollIntoView: true,
      });
      v.focus();
      toast('Bibliography updated.');
    },
  });

  // 4. Citation Manager dialog
  commands.register({
    id: 'ref.manager',
    title: 'Citation Manager',
    icon: 'library-big',
    group: 'Citations',
    enabled: ready,
    reason: NO_EDITOR,
    run: async () => {
      const { v, text, path } = currentDocInfo();
      const bib = await getDocBibliography(ctx, text, path);
      openManagerDialog(ctx, {
        docText: text,
        bibData: bib,
        onRefreshBib: () => {
          if (!v) return;
          const style = settings.get('bibliography.style') || 'author-year';
          const r = refreshBibliography(v.state.doc.toString(), { entries: bib.entries, style });
          if (r.changed) {
            v.dispatch({
              changes: { from: 0, to: v.state.doc.length, insert: r.text },
              userEvent: 'input.bibliography',
            });
            toast('Bibliography refreshed.');
          } else {
            // If no existing region, plan a new one at end of document
            const plan = planBibliography(v.state.doc.toString(), { pos: v.state.doc.length, entries: bib.entries, style });
            v.dispatch({
              changes: plan.change,
              userEvent: 'input.bibliography',
            });
            toast('Bibliography inserted.');
          }
        },
      });
    },
  });
}
