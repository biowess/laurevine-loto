import { openComparison } from './view.js';
import { mountEntry } from './entry.js';

const IDS = ['cmp.next', 'cmp.prev', 'cmp.mode-side', 'cmp.mode-inline', 'cmp.mode-preview', 'cmp.ignore-ws', 'cmp.fold-toggle', 'cmp.copy-left', 'cmp.copy-right', 'cmp.restore', 'cmp.open-left', 'cmp.open-right'];

export function register(ctx) {
  const { commands } = ctx;
  let v = null;
  const sync = () => IDS.forEach((id) => commands.invalidate(id));
  ctx.services.compare = (o) => {
    if (!o || typeof o.oldText !== 'string' || typeof o.newText !== 'string') return null;
    if (v) v.close();
    v = openComparison(ctx, { ...o, onState: sync, onClose: () => { v = null; sync(); } });
    return v;
  };
  const def = (id, title, icon, run, extra = {}) => commands.register({ id, title, icon, group: 'Compare', run, enabled: () => !!v, reason: 'Comparison is not open', ...extra });
  const mode = (id, title, icon, m) => def(id, title, icon, () => v.mode(m), { checked: () => !!v && v.state().mode === m });
  const hasChanges = () => !!v && v.count() > 0;
  def('cmp.next', 'Next Change', 'arrow-down', () => v.step(1), { shortcut: 'F7', enabled: hasChanges, reason: 'No changes' });
  def('cmp.prev', 'Previous Change', 'arrow-up', () => v.step(-1), { shortcut: 'Shift+F7', enabled: hasChanges, reason: 'No changes' });
  mode('cmp.mode-side', 'Side by Side', 'columns-2', 'side');
  mode('cmp.mode-inline', 'Inline', 'rows-2', 'inline');
  mode('cmp.mode-preview', 'Rendered Preview Comparison', 'eye', 'preview');
  def('cmp.ignore-ws', 'Ignore Whitespace', 'space', () => v.toggleWs(), { checked: () => !!v && v.state().ws });
  const hunk = (k) => ({ enabled: () => !!v && v.can(k) && v.state().cur >= 0 && v.state().mode !== 'preview', reason: 'Select a change in Side by Side or Inline view' });
  def('cmp.copy-left', 'Copy Change to Left', 'arrow-left-to-line', () => v.copy('left'), hunk('left'));
  def('cmp.copy-right', 'Copy Change to Right', 'arrow-right-to-line', () => v.copy('right'), hunk('right'));
  def('cmp.restore', 'Restore Saved Version', 'undo-2', () => v.restore(), { enabled: () => !!v && v.can('rs') && v.count() > 0, reason: 'Nothing to restore' });
  def('cmp.open-left', 'Open Left Side', 'file-text', () => v.openSide('left'), { enabled: () => !!v && v.can('ol'), reason: 'Not available' });
  def('cmp.open-right', 'Open Right Side', 'file-text', () => v.openSide('right'), { enabled: () => !!v && v.can('or'), reason: 'Not available' });
  def('cmp.fold-toggle', 'Expand or Collapse Unchanged', 'unfold-vertical', () => v.toggleFold(), { checked: () => !!v && v.state().all });
  mountEntry(ctx);
}
