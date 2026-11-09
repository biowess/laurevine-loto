import { serializeGroups, restoreGroups } from '../documents/groups.js';

// What Backstage remembers on entry: active document, selection, scroll, mode, groups, panel layout.
export const capture = (s, view) => ({
  active: s.documents.activeId, tabs: s.documents.tabs.map((t) => t.id),
  groups: serializeGroups(s.editorGroups), mode: s.ui.mode, splitRatio: s.ui.splitRatio,
  layout: { panels: s.ui.panels, widths: s.ui.widths, statusBar: s.ui.statusBar, ribbonCollapsed: s.ui.ribbonCollapsed, ribbonTab: s.ui.ribbonTab },
  view,
});

// Opening a document while in Backstage keeps that document; otherwise everything is restored exactly.
export function plan(snap, s) {
  const ids = s.documents.tabs.map((t) => t.id);
  const keep = s.documents.activeId !== snap.active || !ids.includes(snap.active) || ids.some((i) => !snap.tabs.includes(i));
  const same = JSON.stringify(serializeGroups(s.editorGroups)) === JSON.stringify(snap.groups);
  return {
    layout: snap.layout, mode: snap.mode, splitRatio: snap.splitRatio, active: snap.active,
    groups: keep || same ? null : restoreGroups(snap.groups, ids),
    view: keep ? null : snap.view,
  };
}
