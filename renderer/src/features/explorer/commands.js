import { SORTS } from '../../core/explorer/tree.js';
import * as D from '../../services/doc-client.js';

export function mountCommands(ctx, ex) {
  const { commands, store, settings, ui } = ctx;
  const root = () => !!store.get().workspace.root, active = () => { const p = ex.activePath(); return !!p && ex.contains(p); };
  const def = (id, title, ic, run, extra = {}) => commands.register({ id, title, icon: ic, group: 'Explorer', run, ...extra });
  const need = { enabled: root, reason: 'No workspace is open' };
  def('file.open-folder', 'Open Folder…', 'folder-open', () => ex.open());
  def('workspace.open', 'Open Workspace…', 'folders', (p) => (typeof p === 'string' ? ex.open(p) : ex.pick()));
  def('workspace.close', 'Close Workspace', 'folder-x', () => ex.close(), need);
  def('explorer.refresh', 'Refresh Explorer', 'refresh-cw', () => ex.refresh(), need);
  def('explorer.reveal-active', 'Reveal Active File', 'locate-fixed', async () => {
    const p = ex.activePath();
    if (!p || !(await ex.reveal(p))) ui.toast('The active file is not in this workspace.');
  }, { enabled: active, reason: 'The active file is not in this workspace' });
  def('explorer.sort', 'Sort', 'arrow-down-a-z', () => ui.openMenu(document.querySelector('[data-cmd="explorer.sort"]') || { x: 40, y: 80 },
    SORTS.map(([v, l]) => ({ label: l, checked: () => settings.get('explorer.sortBy') === v, onSelect: () => settings.set('explorer.sortBy', v) }))), need);
  def('explorer.toggle-hidden', 'Show Hidden Files', 'eye', () => settings.set('explorer.showHidden', !settings.get('explorer.showHidden')), { ...need, checked: () => !!settings.get('explorer.showHidden') });
  def('explorer.open', 'Open', 'file-text', (p) => ex.openPath(p), need);
  def('explorer.open-side', 'Open to the Side', 'columns-2', (p) => ex.openPath(p, true), need);
  def('explorer.pin', 'Pin or Unpin', 'pin', (p) => ex.togglePin(p), need);
  def('explorer.new-file', 'New File', 'file-plus-2', (p) => ex.create('file', p), need);
  def('explorer.new-folder', 'New Folder', 'folder-plus', (p) => ex.create('folder', p), need);
  def('explorer.rename', 'Rename', 'pencil', (p) => ex.rename(p), need);
  def('explorer.duplicate', 'Duplicate', 'copy', (p) => ex.duplicate(p), need);
  def('explorer.delete', 'Delete', 'trash-2', (p) => ex.del(p), need);
  def('explorer.cut', 'Cut', 'scissors', (p) => ex.cut(p), need);
  def('explorer.copy', 'Copy', 'clipboard-copy', (p) => ex.copy(p), need);
  def('explorer.move-to', 'Move to…', 'folder-input', (p) => ex.moveTo('move', p), need);
  def('explorer.copy-to', 'Copy to…', 'folder-output', (p) => ex.moveTo('copy', p), need);
  def('explorer.paste', 'Paste', 'clipboard-paste', (p) => ex.paste(p), { enabled: () => root() && ex.hasClip(), reason: 'Nothing to paste' });
  def('explorer.copy-path', 'Copy Path', 'link', (p) => ex.copyPath(p, false), need);
  def('explorer.copy-rel-path', 'Copy Relative Path', 'link-2', (p) => ex.copyPath(p, true), need);
  def('explorer.find-in-folder', 'Find in Folder', 'search', () => ex.findIn(), need);
  def('explorer.reveal', 'Reveal in File Manager', 'folder-search', (p) => {
    const t = typeof p === 'string' ? p : store.get().workspace.selected;
    return t ? D.reveal(t).catch((e) => ui.toast((e && e.message) || 'The folder could not be shown.')) : undefined;
  }, need);
  const ids = ['workspace.close', 'explorer.refresh', 'explorer.reveal-active', 'explorer.sort', 'explorer.toggle-hidden', 'explorer.open', 'explorer.open-side', 'explorer.pin', 'explorer.reveal',
    'explorer.new-file', 'explorer.new-folder', 'explorer.rename', 'explorer.duplicate', 'explorer.delete', 'explorer.cut', 'explorer.copy', 'explorer.paste',
    'explorer.copy-path', 'explorer.copy-rel-path', 'explorer.find-in-folder', 'explorer.move-to', 'explorer.copy-to'];
  store.subscribe((s) => s.workspace.root, () => ids.forEach((id) => commands.invalidate(id)));
  store.subscribe((s) => s.documents.activeId, () => commands.invalidate('explorer.reveal-active'));
}
