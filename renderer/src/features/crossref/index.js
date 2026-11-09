// Cross-references feature:
// Commands Link to Section / Figure / Table / Equation opening pickers listing labelled targets
// and inserting [Figure 1](#fig-intro) with the computed number, reporting missing/duplicate labels.

import { openCrossrefPicker } from './picker.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';

export function register(ctx) {
  const { commands, store, services: { documents } } = ctx;
  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';

  const insertLink = (text) => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    v.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
      userEvent: 'input.crossref',
      scrollIntoView: true,
    });
    v.focus();
  };

  const openFor = (kind) => {
    const v = view();
    if (!v) return;
    const docText = v.state.doc.toString();
    const sel = v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to).trim();

    openCrossrefPicker(ctx, {
      initialKind: kind,
      text: docText,
      initialText: sel,
      onInsert: (link) => insertLink(link),
    });
  };

  commands.register({
    id: 'ref.figure',
    title: 'Figure',
    icon: 'image',
    group: 'Cross-References',
    enabled: ready,
    reason: NO_EDITOR,
    run: () => openFor('figure'),
  });

  commands.register({
    id: 'ref.table',
    title: 'Table',
    icon: 'table',
    group: 'Cross-References',
    enabled: ready,
    reason: NO_EDITOR,
    run: () => openFor('table'),
  });

  commands.register({
    id: 'ref.equation',
    title: 'Equation',
    icon: 'sigma',
    group: 'Cross-References',
    enabled: ready,
    reason: NO_EDITOR,
    run: () => openFor('equation'),
  });

  commands.register({
    id: 'ref.section',
    title: 'Section',
    icon: 'hash',
    group: 'Cross-References',
    enabled: ready,
    reason: NO_EDITOR,
    run: () => openFor('section'),
  });
}
