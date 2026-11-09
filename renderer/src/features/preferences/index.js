import { backstagePages } from '../../ui/backstage/registry.js';
import { page } from '../../ui/backstage/page-kit.js';
import { uiActions } from '../../state/slices/ui.js';
import { setSetting, resetSetting } from '../../services/settings-client.js';
import * as recents from '../../services/recents-client.js';
import { clearFolder } from '../../services/privacy-client.js';
import * as workspace from '../../services/workspace-client.js';
import * as pandoc from '../../services/pandoc-client.js';
import { registerDefaultPages } from './pages.js';
import { mountEffects } from './effects.js';
import { prefsView, goto } from './view.js';

export { preferencePages } from './registry.js';

export function register(ctx) {
  const { commands, store } = ctx;
  registerDefaultPages();
  const def = (id, title, run, extra) => commands.register({ id, title, group: 'Preferences', run, ...extra });
  def('prefs.set', 'Change Setting', ({ id, value }) => setSetting(id, value));
  def('prefs.reset-setting', 'Reset Setting to Default', (id) => { if (typeof id !== 'string') throw new TypeError('A setting id is required.'); return resetSetting(id); });
  def('prefs.reset-category', 'Reset Section to Defaults', async (ids) => { for (const id of Array.isArray(ids) ? ids : []) await resetSetting(id); });
  def('prefs.goto', 'Go to Preferences Page', ({ page: p, key } = {}) => { goto(p, key); store.dispatch(uiActions.backstage(true, 'preferences')); });
  def('prefs.pandoc-detect', 'Detect Pandoc', () => pandoc.detect());

  def('prefs.pandoc-test', 'Test Pandoc', (id) => pandoc.test(id));
  def('custom.integrations', 'Integrations', () => { goto('integrations'); store.dispatch(uiActions.backstage(true, 'preferences')); }, { icon: 'plug', group: 'Tools' });
  def('prefs.pandoc-cancel', 'Cancel Pandoc Test', (id) => pandoc.cancel(id));
  mountEffects();
  const wipe = (id, title, note, act) => def(id, title, async () => {
    const ok = await new Promise((res) => ctx.ui.openDialog({ title, body: note, buttons: [{ label: 'Cancel' }, { label: 'Clear', primary: true, onClick: () => res(true) }], onClose: () => res(false) }));
    if (ok) await act();
  });
  wipe('prefs.clear-recents', 'Clear Recent Documents', 'Remove all recent documents? Pinned items are kept. This cannot be undone.', () => recents.clear());
  wipe('prefs.clear-history', 'Clear Document History', 'Delete all saved document history? This cannot be undone.', () => clearFolder('history'));
  wipe('prefs.clear-recovery', 'Clear Recovery Data', 'Delete all recovery copies of unsaved work? This cannot be undone.', () => clearFolder('recovery'));
  wipe('prefs.clear-index', 'Clear Search Index', 'Delete the cached search index? It is rebuilt from your files.', async () => { await clearFolder('indexes'); await workspace.index('rebuild').catch(() => {}); });
  let cur;
  backstagePages.register({
    id: 'preferences', title: 'Preferences', icon: 'settings',
    render: () => { cur = prefsView(); return page('Preferences', 'Appearance, editing and file behavior. Changes apply immediately.', cur.el); },
    after: () => cur.reveal(),
  });
}
