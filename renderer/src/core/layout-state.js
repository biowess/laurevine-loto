export const WIDTH = Object.freeze({ min: 160, max: 420, def: 260 });
export const LAYOUT_KEYS = Object.freeze([
  'ui.leftPanelOpen', 'ui.rightPanelOpen', 'ui.leftPanelView', 'ui.rightPanelView', 'ui.leftPanelWidth', 'ui.rightPanelWidth',
  'ui.statusBarVisible', 'ui.ribbonCollapsed', 'ui.ribbonTab',
]);
export const DEFAULT_LAYOUT = Object.freeze({
  panels: { left: { open: true, view: 'files' }, right: { open: false, view: 'outline' } },
  widths: { left: WIDTH.def, right: WIDTH.def }, statusBar: true, ribbonCollapsed: false, ribbonTab: 'home',
});

const str = (v) => typeof v === 'string' && v.length > 0 && v.length <= 40;
const bool = (v, d) => (typeof v === 'boolean' ? v : d);

export const clampWidth = (v, d = WIDTH.def) => (Number.isFinite(v) ? Math.round(Math.max(WIDTH.min, Math.min(WIDTH.max, v))) : d);

// Merge a partial layout into a ui state; every field is validated, invalid parts keep the current value.
export function mergeLayout(s, p = {}) {
  const side = (k) => { const o = s.panels[k], q = (p.panels && p.panels[k]) || {}; return { open: bool(q.open, o.open), view: str(q.view) ? q.view : o.view }; };
  const w = (k) => (p.widths && k in p.widths ? clampWidth(p.widths[k], s.widths[k]) : s.widths[k]);
  return {
    ...s, panels: { left: side('left'), right: side('right') }, widths: { left: w('left'), right: w('right') },
    statusBar: bool(p.statusBar, s.statusBar), ribbonCollapsed: bool(p.ribbonCollapsed, s.ribbonCollapsed), ribbonTab: str(p.ribbonTab) ? p.ribbonTab : s.ribbonTab,
  };
}

export function settingsFromLayout(l) {
  return {
    'ui.leftPanelOpen': l.panels.left.open, 'ui.rightPanelOpen': l.panels.right.open,
    'ui.leftPanelView': l.panels.left.view, 'ui.rightPanelView': l.panels.right.view,
    'ui.leftPanelWidth': l.widths.left, 'ui.rightPanelWidth': l.widths.right,
    'ui.statusBarVisible': l.statusBar, 'ui.ribbonCollapsed': l.ribbonCollapsed, 'ui.ribbonTab': l.ribbonTab,
  };
}

export const sameLayout = (a, b) => {
  const x = settingsFromLayout(a), y = settingsFromLayout(b);
  return LAYOUT_KEYS.every((k) => x[k] === y[k]);
};

// get(key) reads a setting; viewOk(side, id) says whether a panel exists. Anything invalid falls back to the default.
export function layoutFromSettings(get, viewOk = () => true) {
  const D = DEFAULT_LAYOUT, g = (k) => { try { return get(k); } catch { return undefined; } };
  const view = (side, k) => { const v = g(k); return str(v) && viewOk(side, v) ? v : D.panels[side].view; };
  const width = (k, d) => clampWidth(g(k), d);
  return {
    panels: {
      left: { open: bool(g('ui.leftPanelOpen'), D.panels.left.open), view: view('left', 'ui.leftPanelView') },
      right: { open: bool(g('ui.rightPanelOpen'), D.panels.right.open), view: view('right', 'ui.rightPanelView') },
    },
    widths: { left: width('ui.leftPanelWidth', D.widths.left), right: width('ui.rightPanelWidth', D.widths.right) },
    statusBar: bool(g('ui.statusBarVisible'), D.statusBar), ribbonCollapsed: bool(g('ui.ribbonCollapsed'), D.ribbonCollapsed),
    ribbonTab: str(g('ui.ribbonTab')) ? g('ui.ribbonTab') : D.ribbonTab,
  };
}
