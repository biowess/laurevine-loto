import { DEFAULT_LAYOUT, mergeLayout, sameLayout } from '../../core/layout-state.js';

export const MODES = ['source', 'split', 'preview', 'previewLeft', 'previewRight', 'focus'];
export const THEMES = ['light', 'dark', 'system'];
const str = (v) => typeof v === 'string' && v.length > 0;

const initial = {
  panels: { left: { open: true, view: 'files' }, right: { open: false, view: 'outline' } },
  ribbonTab: 'home', mode: 'split', theme: 'light', splitRatio: 0.5,
  widths: { ...DEFAULT_LAYOUT.widths }, statusBar: true, ribbonCollapsed: false,
  backstage: { open: false, page: 'info' }, studio: { open: false, preset: null },
};

function reducer(s = initial, a) {
  switch (a.type) {
    case 'ui/panel': {
      const p = s.panels[a.panel];
      if (!p) return s;
      const view = str(a.view) ? a.view : p.view;
      const open = typeof a.open === 'boolean' ? a.open : view !== p.view ? true : !p.open;
      if (open === p.open && view === p.view) return s;
      return { ...s, panels: { ...s.panels, [a.panel]: { open, view } } };
    }
    case 'ui/ribbonTab': return str(a.tab) && a.tab !== s.ribbonTab ? { ...s, ribbonTab: a.tab } : s;
    case 'ui/layout': { const n = mergeLayout(s, a.layout); return sameLayout(s, n) ? s : n; }
    case 'ui/mode': return MODES.includes(a.mode) && a.mode !== s.mode ? { ...s, mode: a.mode } : s;
    case 'ui/splitRatio': { const r = Math.min(0.8, Math.max(0.2, a.ratio)); return Number.isFinite(r) && r !== s.splitRatio ? { ...s, splitRatio: r } : s; }
    case 'ui/theme': return THEMES.includes(a.theme) && a.theme !== s.theme ? { ...s, theme: a.theme } : s;
    case 'ui/backstage': {
      const open = !!a.open, page = str(a.page) ? a.page : s.backstage.page;
      return open === s.backstage.open && page === s.backstage.page ? s : { ...s, backstage: { open, page } };
    }
    case 'ui/studio': {
      const open = !!a.open, preset = str(a.preset) ? a.preset : open ? s.studio.preset : null;
      return open === s.studio.open && preset === s.studio.preset ? s : { ...s, studio: { open, preset } };
    }
    default: return s;
  }
}

const layout = (l) => ({ type: 'ui/layout', layout: l });

export const uiActions = {
  panel: (panel, o = {}) => ({ type: 'ui/panel', panel, ...o }),
  ribbonTab: (tab) => ({ type: 'ui/ribbonTab', tab }),
  mode: (mode) => ({ type: 'ui/mode', mode }),
  splitRatio: (ratio) => ({ type: 'ui/splitRatio', ratio }),
  layout,
  width: (side, px) => layout({ widths: { [side]: px } }),
  statusBar: (v) => layout({ statusBar: !!v }),
  ribbonCollapsed: (v) => layout({ ribbonCollapsed: !!v }),
  theme: (theme) => ({ type: 'ui/theme', theme }),
  backstage: (open, page) => ({ type: 'ui/backstage', open, page }),
  studio: (open, preset) => ({ type: 'ui/studio', open, preset }),
};

export const ui = { initial, reducer };
