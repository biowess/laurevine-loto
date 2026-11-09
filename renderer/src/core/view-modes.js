// Pure: layout snapshots for Reading / Distraction-Free views.
export const snapshot = (ui) => ({
  mode: ui.mode,
  layout: {
    panels: { left: { ...ui.panels.left }, right: { ...ui.panels.right } },
    widths: { ...ui.widths }, statusBar: ui.statusBar, ribbonCollapsed: ui.ribbonCollapsed, ribbonTab: ui.ribbonTab,
  },
});

export const VIEWS = Object.freeze({ reading: 'reading', free: 'free' });
