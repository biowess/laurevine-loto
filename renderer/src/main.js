// Composition root: store -> settings -> commands -> services -> features -> shell.
import './commands/definitions/document.js';
import './commands/definitions/app.js';
import './commands/definitions/layout.js';
import './commands/definitions/editor.js';
import './commands/definitions/groups.js';
import { createContext, registerFeatures } from './features.js';
import { paintIcons } from './ui/kit/icons.js';
import { mountWindowChrome } from './ui/shell/window-chrome.js';
import { mountTitlebar } from './ui/shell/titlebar.js';
import { mountRibbon } from './ui/ribbon/ribbon.js';
import { mountDocTabs } from './ui/tabs/doc-tabs.js';
import { mountWorkArea } from './ui/shell/work-area.js';
import { mountLayoutState } from './ui/shell/layout-state.js';
import { mountGrips } from './ui/shell/grips.js';
import { mountResponsive } from './ui/shell/responsive.js';
import { mountTruncation } from './ui/kit/truncation.js';
import { mountKeys } from './ui/shell/keys.js';
import { mountEditor, editorMetrics, onEditorActivity } from './ui/editor/editor-pane.js';
import { mountModes, mountDivider } from './ui/editor/modes.js';
import { mountGroups } from './ui/editor/groups.js';
import { mountStatusBar } from './ui/shell/status-bar.js';
import { mountLiveRegions } from './ui/shell/live-regions.js';
import { mountBackstage } from './ui/backstage/frame.js';
import { openWelcome } from './services/documents.js';
import { store } from './state/store.js';
import { settingsActions } from './state/slices/settings.js';
import { loadSettings, getAllSettings, subscribeSettings } from './services/settings-client.js';

const SHELL = [
  ['window-chrome', mountWindowChrome], ['layout-state', mountLayoutState], ['modes', mountModes], ['titlebar', mountTitlebar], ['ribbon', mountRibbon], ['doc-tabs', mountDocTabs], ['work-area', mountWorkArea],
  ['live-regions', mountLiveRegions], ['grips', mountGrips], ['responsive', mountResponsive], ['truncation', mountTruncation], ['keys', mountKeys], ['editor', mountEditor], ['divider', mountDivider], ['groups', mountGroups], ['status-bar', () => { const sb = mountStatusBar(undefined, { metrics: editorMetrics }); onEditorActivity(sb.refresh); }],
  ['backstage', mountBackstage], ['studio', () => {
    let unmount = null;
    const check = (open) => {
      if (open && !unmount) {
        import('./features/studio/index.js').then((m) => {
          if (store.get().ui.studio.open && !unmount) unmount = m.mountStudio();
        }).catch((e) => console.error('[studio]', e));
      } else if (!open && unmount) {
        unmount();
        unmount = null;
        const el = document.getElementById('studio');
        if (el) { el.hidden = true; el.replaceChildren(); }
      }
    };
    store.subscribe((s) => s.ui.studio.open, check);
    check(store.get().ui.studio.open);
  }],
];

import { getAppInfo, onOpenPath } from './services/app-info.js';

async function boot() {
  await loadSettings();
  store.dispatch(settingsActions.apply(getAllSettings()));
  subscribeSettings((changed) => store.dispatch(settingsActions.apply(changed)));
  const ctx = createContext(); // store, settings, commands registry, services
  registerFeatures(ctx);
  const info = await getAppInfo().catch(() => ({}));
  if (info && info.pendingFiles && info.pendingFiles.length) {
    ctx.commands.execute('file.open-paths', info.pendingFiles);
  } else {
    openWelcome();
  }
  try {
    onOpenPath((p) => {
      if (p && p.paths && p.paths.length) ctx.commands.execute('file.open-paths', p.paths);
    });
  } catch {}
  paintIcons();
  for (const [name, mount] of SHELL) {
    try { mount(); } catch (e) { console.error('[shell]', name, e); }
  }
}


boot().catch((e) => console.error('[boot]', e));
