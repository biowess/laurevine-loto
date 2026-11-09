import { createPanels } from './panel.js';
import { createSearch } from './view.js';
import { registerOps } from './ops.js';
import { reveal } from './reveal.js';
export { recordOp, undoOp } from './ops.js';

const NO_RESULTS = 'No search results';

export function register(ctx) {
  const { commands, panels, settings } = ctx;
  let s = null;
  commands.registerAll('Search', [['search.replace-file', 'Replace in File', 'replace']]);
  const flag = (key, label, description, def = true) => ({ type: 'boolean', default: def, category: 'Search', label, description });
  settings.define('search', {
    matchCase: { type: 'boolean', default: false },
    ignoreGlobs: { type: 'string', default: '', maxLength: 500, category: 'Search', label: 'Ignore globs', description: 'Comma-separated globs left out of every workspace search, for example drafts/**, *.tmp.' },
    maxResults: { type: 'number', default: 5000, min: 100, max: 5000, integer: true, category: 'Search', label: 'Maximum results', description: 'Searches stop at this many results and say so.' },
    scopeContent: flag('c', 'Search content by default', 'Text outside frontmatter and code blocks.'),
    scopeFilenames: flag('f', 'Search file names by default', 'File names of every file type.'),
    scopeFrontmatter: flag('m', 'Search frontmatter by default', 'The metadata block at the top of a document.'),
    scopeCode: flag('k', 'Search code blocks by default', 'Fenced code blocks.'),
  });
  const def = (id, title, icon, run, extra) => commands.register({ id, title, icon, group: 'Search', run, ...extra });
  const on = (get) => ({ checked: () => !!s && get(s.S) });
  const hits = { enabled: () => !!s && s.has(), reason: NO_RESULTS };
  def('search.match-case', 'Match Case', 'case-sensitive', () => s.toggle('cs'), on((x) => x.cs));
  def('search.whole-word', 'Whole Word', 'whole-word', () => s.toggle('ww'), on((x) => x.ww));
  def('search.regex', 'Use Regex', 'regex', () => s.toggle('rx'), on((x) => x.rx));
  def('search.scope', 'Toggle Search Scope', 'filter', (k) => s.scope(k));
  def('search.scope-workspace', 'Search Workspace', 'folder-tree', () => s.setMode('workspace'), on((x) => x.mode === 'workspace'));
  def('search.scope-file', 'Search This File', 'file-text', () => s.setMode('file'), on((x) => x.mode === 'file'));
  def('search.open', 'Open Search Result', 'corner-down-right', (it) => it && s.open(it));
  def('search.reveal', 'Reveal Location', 'corner-down-right', (it) => it && reveal(ctx, it));
  def('search.show-refs', 'Show References in Search', 'text-search', (p) => p && Array.isArray(p.items) && s.showRefs(String(p.label || 'References'), p.items));
  def('search.toggle-group', 'Collapse or Expand File Results', 'chevron-down', (p) => typeof p === 'string' && s.toggleGroup(p));
  def('search.collapse-all', 'Collapse All Results', 'chevrons-down-up', () => s.collapseAll(), hits);
  def('search.replace-file', 'Replace in File', 'replace', () => s.replace(false), hits);
  def('search.replace-all', 'Replace All', 'replace', () => s.replace(true), hits);
  def('tool.replace-files', 'Find and Replace Across Files', 'files', () => s.focusReplace(), { group: 'Workspace Tools', aliases: ['replace in files'] });
  registerOps(ctx);
  def('search.clear', 'Clear Search', 'x', () => s.clear());
  def('search.next', 'Next Search Result', 'arrow-down', () => s.step(1), { shortcut: 'F4', ...hits });
  def('search.prev', 'Previous Search Result', 'arrow-up', () => s.step(-1), { shortcut: 'Shift+F4', ...hits });
  def('search.focus', 'Find in Workspace', 'search', () => s.focus(), { shortcut: 'Ctrl+Shift+F' });
  s = createSearch(ctx);
  return createPanels(ctx, s).map((p) => panels.register(p));
}