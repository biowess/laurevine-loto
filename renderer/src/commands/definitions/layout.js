import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { DEFAULT_LAYOUT } from '../../core/layout-state.js';
import { register } from '../registry.js';

const ui = () => store.get().ui;
const send = (a) => { store.dispatch(a); };

register({ id: 'view.left-sidebar', title: 'Left Sidebar', icon: 'panel-left', group: 'Panels', checked: () => ui().panels.left.open, run: () => send(uiActions.panel('left')) });
register({ id: 'view.status-bar', title: 'Toggle Status Bar', icon: 'panel-bottom', group: 'Panels', checked: () => ui().statusBar, run: () => send(uiActions.statusBar(!ui().statusBar)) });
register({
  id: 'view.toggle-ribbon', title: 'Toggle Ribbon', icon: 'chevron-up', group: 'Display', shortcut: 'Ctrl+F1',
  checked: () => ui().ribbonCollapsed, run: () => send(uiActions.ribbonCollapsed(!ui().ribbonCollapsed)),
});
register({ id: 'view.reset-workspace', title: 'Reset Workspace Layout', icon: 'rotate-ccw', group: 'Display', run: () => send(uiActions.layout(DEFAULT_LAYOUT)) });
