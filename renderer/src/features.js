import { store } from './state/store.js';
import * as commands from './commands/registry.js';
import { panels, runCommand, openPanel } from './ui/shell/panels.js';
import * as kit from './ui/shell/panel-kit.js';
import { h } from './ui/kit/dom.js';
import { icon } from './ui/kit/icons.js';
import { openDialog } from './ui/kit/dialog.js';
import { toast } from './ui/kit/toast.js';
import * as ipc from './services/ipc.js';
import { settingsApi } from './services/settings-client.js';
import { defineSettings, validateSetting } from '../../shared/settings-schema.js';
import * as explorer from './features/explorer/index.js';
import * as search from './features/search/index.js';
import * as backlinks from './features/backlinks/index.js';
import * as attachments from './features/attachments/index.js';
import * as outline from './features/outline/index.js';
import * as properties from './features/properties/index.js';
import * as preview from './features/preview/index.js';
import * as sync from './features/sync/index.js';
import * as navigate from './features/navigate/index.js';
import * as writing from './features/writing/index.js';
import * as views from './features/views/index.js';
import * as presentation from './features/presentation/index.js';
import * as editing from './features/editing/index.js';
import * as codeTools from './features/code-tools/index.js';
import * as table from './features/table/index.js';
import * as tableTransfer from './features/table/transfer.js';
import * as insertMd from './features/insert-md/index.js';
import * as toc from './features/toc/index.js';
import * as image from './features/image/index.js';
import * as clipboard from './features/clipboard/index.js';
import * as statistics from './features/statistics/index.js';
import * as find from './features/find/index.js';
import * as files from './features/files/index.js';
import * as templates from './features/templates/index.js';
import * as preferences from './features/preferences/index.js';
import * as palette from './features/palette/index.js';
import * as quickopen from './features/quickopen/index.js';
import * as keymap from './features/keymap/index.js';
import * as transactions from './features/transactions/index.js';
import * as links from './features/links/index.js';
import * as citations from './features/citations/index.js';
import * as crossref from './features/crossref/index.js';
import * as a11y from './features/a11y/index.js';
import * as problems from './features/problems/index.js';
import * as spellcheck from './features/spellcheck/index.js';
import * as proofread from './features/proofread/index.js';
import * as grammar from './features/grammar/index.js';
import * as recovery from './features/recovery/index.js';
import * as history from './features/history/index.js';
import * as publish from './features/publish/index.js';
import * as studio from './features/studio/index.js';
import * as collection from './features/collection/index.js';
import * as batch from './features/batch/index.js';
import * as comparison from './features/comparison/index.js';
import * as docUtilities from './features/doc-utilities/index.js';
import * as workspaceTools from './features/workspace-tools/index.js';
import * as ribbonCustom from './features/ribbon-custom/index.js';
import * as themes from './features/themes/index.js';
import * as snippets from './features/snippets/index.js';
import * as keyboard from './features/keyboard/index.js';
import * as session from './features/session/index.js';
import * as windowClient from './services/window-client.js';
import * as documents from './services/documents.js';
import * as assets from './services/assets-client.js';
import * as bus from './services/bus.js';
import { openMenu } from './ui/kit/menu.js';

export const FEATURES = Object.freeze({ explorer, search, backlinks, attachments, outline, properties, preview, sync, navigate, writing, views, presentation, editing, codeTools, table, tableTransfer, insertMd, toc, clipboard, statistics, find, files, templates, preferences, palette, quickopen, keymap, transactions, links, image, citations, crossref, a11y, problems, spellcheck, proofread, grammar, recovery, history, comparison, docUtilities, workspaceTools, ribbonCustom, themes, snippets, keyboard, session, publish, studio, collection, batch });

export const createContext = () => ({
  store, commands, panels,
  settings: { define: defineSettings, validate: validateSetting, ...settingsApi },
  services: { ipc, documents, assets, bus, window: windowClient },
  ui: { h, icon, kit, runCommand, openPanel, openDialog, toast, openMenu },
});

export function registerFeatures(ctx = createContext()) {
  const failed = [];
  for (const [name, f] of Object.entries(FEATURES)) {
    try { f.register(ctx); } catch (e) { failed.push(name); console.error('[features]', name, e); }
  }
  return failed;
}