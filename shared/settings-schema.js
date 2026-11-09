// Single source of truth for settings: key, type, default, bounds. Pure; persisted by main/services/settings.
const TYPES = ['boolean', 'number', 'string', 'enum'];
const defs = new Map();

export function defineSettings(feature, entries) {
  if (!/^[a-z][a-z0-9-]*$/.test(feature || '')) throw new TypeError(`settings: bad feature "${feature}"`);
  for (const [key, def] of Object.entries(entries || {})) {
    const id = `${feature}.${key}`;
    if (!def || !TYPES.includes(def.type) || def.default === undefined) throw new TypeError(`settings: bad definition "${id}"`);
    if (def.type === 'enum' && !(Array.isArray(def.values) && def.values.includes(def.default))) throw new TypeError(`settings: "${id}" default not in values`);
    defs.set(id, Object.freeze({ ...def, id }));
  }
}

export const listSettings = () => [...defs.values()];
export const getSettingDef = (id) => defs.get(id);
export const settingDefaults = () => Object.fromEntries([...defs].map(([id, d]) => [id, d.default]));

export function validateSetting(id, value) {
  const d = defs.get(id);
  if (!d) return { ok: false, error: `Unknown setting: ${id}` };
  const good = d.type === 'enum' ? d.values.includes(value)
    : d.type === 'number' ? Number.isFinite(value) && !(d.min > value) && !(d.max < value) && !(d.integer && !Number.isInteger(value))
      : d.type === 'string' ? typeof value === 'string' && !(d.maxLength < value.length)
        : typeof value === d.type;
  return good ? { ok: true, value } : { ok: false, error: `Invalid value for ${id}` };
}

defineSettings('problems', {
  squiggles: { type: 'boolean', default: true, category: 'Problems', label: 'Underline Problems in the Editor', description: 'Wavy underlines for validation and accessibility findings.' },
  disabled: { type: 'string', maxLength: 500, default: 'style-hints', category: 'Problems', label: 'Turned-Off Rule Groups', description: 'Comma-separated rule group ids.' },
  severity: { type: 'string', maxLength: 1000, default: '{}', category: 'Problems', label: 'Severity Overrides', description: 'JSON map of rule group id to error, warning or info.' },
});

defineSettings('explorer', {
  sortBy: { type: 'enum', values: ['name', 'modified', 'type'], default: 'name', category: 'Explorer', label: 'Sort Files by', description: 'Order of files and folders in the Explorer.' },
  showHidden: { type: 'boolean', default: false, category: 'Explorer', label: 'Show Hidden Files', description: 'List files and folders whose names start with a dot.' },
  confirmDelete: { type: 'boolean', default: true, category: 'Explorer', label: 'Confirm Before Deleting', description: 'Ask before moving files and folders to the trash.' },
  lastWorkspace: { type: 'string', maxLength: 4096, default: '', category: 'Explorer', label: 'Last Workspace', description: 'Folder reopened at launch.' },
  state: { type: 'string', maxLength: 20000, default: '{}', category: 'Explorer', label: 'Explorer State', description: 'Expanded folders and pinned items per workspace.' },
});
defineSettings('templates', {
  recent: { type: 'string', maxLength: 400, default: '', category: 'Templates', label: 'Recent Templates', description: 'Recently used template ids, comma separated.' },
  newAction: { type: 'enum', values: ['gallery', 'blank'], default: 'gallery', category: 'Templates', label: 'New Document Button', description: 'What the ribbon + and Create New do: open the template gallery or a blank document.' },
});
defineSettings('appearance', {
  theme: { type: 'enum', values: ['light', 'dark', 'system'], default: 'light', category: 'Appearance', label: 'Theme', description: 'Colour theme of the application.' },
  density: { type: 'enum', values: ['comfortable', 'compact'], default: 'comfortable', category: 'Appearance', label: 'Interface Density', description: 'Compact trims the height of the tab strip and the status bar.' },
  zoom: { type: 'number', integer: true, min: 50, max: 200, default: 100, category: 'Appearance', label: 'Interface Zoom (%)', description: 'Scale the whole window from 50 to 200 percent.' },
});
defineSettings('ui', {
  mode: { type: 'enum', values: ['source', 'split', 'preview', 'previewLeft', 'previewRight', 'focus'], default: 'split', category: 'Layout', label: 'Editor Mode', description: 'How the editor and preview are arranged.' },
  splitRatio: { type: 'number', min: 0.2, max: 0.8, default: 0.5, category: 'Layout', label: 'Split Ratio', description: 'Share of the width (or height when stacked) given to the source pane.' },
  groupRatio: { type: 'number', min: 0.2, max: 0.8, default: 0.5, category: 'Layout', label: 'Editor Group Ratio', description: 'Share of the space given to the first editor group when split.' },
  groupOrientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal', category: 'Layout', label: 'Editor Group Layout', description: 'Editor groups side by side (horizontal) or stacked (vertical).' },
  leftPanelOpen: { type: 'boolean', default: true, category: 'Layout', label: 'Left Sidebar', description: 'Show the left sidebar.' },
  rightPanelOpen: { type: 'boolean', default: false, category: 'Layout', label: 'Right Sidebar', description: 'Show the right sidebar.' },
  leftPanelWidth: { type: 'number', integer: true, min: 160, max: 420, default: 260, category: 'Layout', label: 'Left Sidebar Width', description: 'Width of the left sidebar in pixels.' },
  rightPanelWidth: { type: 'number', integer: true, min: 160, max: 420, default: 260, category: 'Layout', label: 'Right Sidebar Width', description: 'Width of the right sidebar in pixels.' },
  ribbonCollapsed: { type: 'boolean', default: false, category: 'Layout', label: 'Collapse Ribbon', description: 'Show only the ribbon tab names.' },
  leftPanelView: { type: 'string', maxLength: 40, default: 'files', category: 'Layout', label: 'Left Sidebar Panel', description: 'Panel shown in the left sidebar.' },
  rightPanelView: { type: 'string', maxLength: 40, default: 'outline', category: 'Layout', label: 'Right Sidebar Panel', description: 'Panel shown in the right sidebar.' },
  statusBarVisible: { type: 'boolean', default: true, category: 'Layout', label: 'Status Bar', description: 'Show the status bar.' },
  ribbonTab: { type: 'string', maxLength: 40, default: 'home', category: 'Layout', label: 'Ribbon Tab', description: 'Last selected ribbon tab.' },
});
defineSettings('editor', {
  lineNumbers: { type: 'boolean', default: true, category: 'Editor', label: 'Line Numbers', description: 'Show line numbers beside the source.' },
  wordWrap: { type: 'boolean', default: true, category: 'Editor', label: 'Word Wrap', description: 'Wrap long lines instead of scrolling sideways.' },
  showWhitespace: { type: 'boolean', default: false, category: 'Editor', label: 'Show Whitespace', description: 'Mark spaces and tabs in the source.' },
  tabSize: { type: 'number', integer: true, min: 1, max: 8, default: 4, category: 'Editor', label: 'Tab Size', description: 'Width of a tab character in columns.' },
  indentUnit: { type: 'enum', values: ['2-spaces', '4-spaces', 'tab'], default: '2-spaces', category: 'Editor', label: 'Indent with', description: 'What one level of indentation inserts.' },
  spellcheck: { type: 'boolean', default: true, category: 'Editor', label: 'Spellcheck', description: 'Use the system spellchecker in the source editor.' },
  spellWords: { type: 'string', maxLength: 50000, default: '[]', hidden: true, category: 'Editor', label: 'Custom Dictionary Words', description: 'JSON list of words added to the custom dictionary; re-applied at launch.' },
  spellLanguage: { type: 'string', maxLength: 20, default: '', category: 'Editor', label: 'Spellcheck Language', description: 'Spellchecker language code such as en-GB; empty uses the system language.' },
  autoPair: { type: 'boolean', default: false, category: 'Editor', label: 'Auto-Pair Brackets and Quotes', description: 'Type ( [ { " or ` and get the closing character too; typing it again steps over it.' },
  pasteMode: { type: 'enum', values: ['plain', 'smart'], default: 'plain', category: 'Editor', label: 'Paste Mode', description: 'Plain pastes text as is; smart converts copied web or rich content to Markdown.' },
  pasteUrlAsLink: { type: 'boolean', default: true, category: 'Editor', label: 'Paste URL over Selection as Link', description: 'Pasting a web address over selected text makes it a Markdown link.' },
  pasteTable: { type: 'enum', values: ['ask', 'auto', 'off'], default: 'ask', category: 'Editor', label: 'Paste Spreadsheet Data as Table', description: 'Ask offers to convert pasted spreadsheet or table data into a Markdown table; auto converts it; off pastes it as is.' },
  caretMarker: { type: 'boolean', default: true, category: 'Editor', label: 'Mark Caret Block in Preview', description: 'Show a subtle marker on the preview block that contains the source caret in split view.' },
  layoutWidth: { type: 'enum', values: ['full', 'centered', 'reading'], default: 'full', category: 'Editor', label: 'Writing Width', description: 'Full Width fills the pane, Centered Column is a fixed 80-character column, Reading Width is a narrower, roomier column set by Reading width.' },
  contentWidth: { type: 'number', integer: true, min: 20, max: 2000, default: 66, category: 'Editor', label: 'Reading Width', description: 'Measure of the Reading Width column, in the chosen unit.' },
  contentWidthUnit: { type: 'enum', values: ['ch', 'px'], default: 'ch', category: 'Editor', label: 'Reading Width Unit', description: 'Unit of the reading width.' },
  focusMode: { type: 'boolean', default: false, category: 'Editor', label: 'Focus Mode', description: 'Dim everything except the current paragraph or sentence.' },
  focusScope: { type: 'enum', values: ['paragraph', 'sentence'], default: 'paragraph', category: 'Editor', label: 'Focus Scope', description: 'What focus mode keeps bright.' },
  typewriter: { type: 'boolean', default: false, category: 'Editor', label: 'Typewriter Mode', description: 'Keep the caret line at a fixed vertical position.' },
  typewriterPosition: { type: 'number', integer: true, min: 20, max: 80, default: 50, category: 'Editor', label: 'Typewriter Position', description: 'Caret line position as a percentage of the editor height.' },
  syncScroll: { type: 'boolean', default: false, category: 'Editor', label: 'Synchronized Scrolling', description: 'Opt-in: keep the source and preview scrolled to the same place in split view. Off by default so the preview scrolls freely (double-click preview content to jump to its source).' },
  fontFamily: { type: 'enum', values: ['mono', 'sans', 'serif'], default: 'mono', category: 'Editor', label: 'Editor Font', description: 'Font family of the Markdown source.' },
  fontSize: { type: 'number', min: 8, max: 32, default: 12.5, category: 'Editor', label: 'Editor Font Size', description: 'Source text size in pixels.' },
  lineHeight: { type: 'number', min: 1.2, max: 2.4, default: 1.75, category: 'Editor', label: 'Editor Line Height', description: 'Source line height multiplier.' },
  caretStyle: { type: 'enum', values: ['line', 'thick', 'block'], default: 'line', category: 'Editor', label: 'Caret Style', description: 'Shape of the text cursor in the source.' },
});
defineSettings('preview', {
  theme: { type: 'enum', values: ['editorial', 'academic', 'manuscript', 'literary', 'journal', 'magazine', 'plain', 'modern', 'technical', 'business'], default: 'editorial', category: 'Preview', label: 'Preview Theme', description: 'Look of the rendered preview.' },
  fontFamily: { type: 'enum', values: ['theme', 'serif', 'palatino', 'sans', 'mono'], default: 'theme', category: 'Preview', label: 'Preview Font', description: 'Font family of the preview text.' },
  fontSize: { type: 'number', integer: true, min: 12, max: 28, default: 17, category: 'Preview', label: 'Preview Font Size', description: 'Preview text size in pixels.' },
  lineHeight: { type: 'number', min: 1.2, max: 2.2, default: 1.62, category: 'Preview', label: 'Preview Line Height', description: 'Preview line height multiplier.' },
  width: { type: 'enum', values: ['narrow', 'medium', 'wide', 'full'], default: 'medium', category: 'Preview', label: 'Preview Content Width', description: 'Width of the preview text column.' },
  images: { type: 'enum', values: ['fit', 'original'], default: 'fit', category: 'Preview', label: 'Image Scaling', description: 'Fit images to the column or show them at original size.' },
  tables: { type: 'enum', values: ['plain', 'ruled', 'striped'], default: 'plain', category: 'Preview', label: 'Table Appearance', description: 'Table style in the preview.' },
  codeDensity: { type: 'enum', values: ['compact', 'comfortable'], default: 'comfortable', category: 'Preview', label: 'Code Density', description: 'Spacing inside code blocks.' },
  codeWrap: { type: 'boolean', default: false, category: 'Preview', label: 'Wrap Code Lines', description: 'Wrap long lines in code blocks.' },
  codeLineNumbers: { type: 'boolean', default: false, category: 'Preview', label: 'Code Line Numbers', description: 'Number the lines of code blocks in the preview.' },
});
defineSettings('chars', {
  recent: { type: 'string', maxLength: 80, default: '', category: 'Insert', label: 'Recent Special Characters', description: 'Recently inserted special characters.' },
});

defineSettings('code', {
  recentLangs: { type: 'string', maxLength: 120, default: '', category: 'Code', label: 'Recent Code Languages', description: 'Recently chosen fenced code languages, comma separated.' },
});
defineSettings('toc', {
  maintenance: { type: 'enum', values: ['manual', 'auto'], default: 'manual', category: 'Markdown', label: 'Table of Contents Maintenance', description: 'Manual refreshes with the Refresh commands; Automatic refreshes every TOC after headings change, only between its HTML comment markers, as one undo step.' },
});
defineSettings('images', {
  strategy: { type: 'enum', values: ['original', 'assets', 'custom'], default: 'assets', category: 'Markdown', label: 'Image Storage', labels: { original: 'Original Assets', assets: 'Document Assets', custom: 'Custom Folder' }, description: 'Insert Image: reference the original file, copy it to the document asset folder, or copy it to an attachment folder.' },
  assetDir: { type: 'string', maxLength: 120, default: 'assets', category: 'Markdown', label: 'Document Asset Folder', description: 'Folder next to the document for copied images, for example assets or {doc}.assets ({doc} is the document name).' },
  attachDir: { type: 'string', maxLength: 1000, default: '', category: 'Markdown', label: 'Attachment Folder', description: 'Last folder chosen for copied images and assets.' },
  alwaysAsk: { type: 'boolean', default: false, category: 'Markdown', label: 'Always Ask Where to Store Pasted Images', description: 'Show the storage dialog for every pasted or dropped image instead of reusing the choice remembered for the workspace.' },
  wsStrategies: { type: 'string', maxLength: 4000, default: '', category: 'Markdown', label: 'Remembered Image Storage', description: 'JSON map of workspace folder to its remembered image storage choice.' },
});
defineSettings('markdown', {
  defaultProfile: { type: 'enum', values: ['commonmark', 'gfm', 'extended', 'knowledge'], default: 'gfm', category: 'Markdown', label: 'Default Profile', description: 'Markdown profile used for documents without their own choice.' },
  anchorStrategy: { type: 'enum', values: ['github', 'gitlab', 'pandoc', 'simple', 'ascii'], default: 'github', category: 'Markdown', label: 'Heading Anchors', description: 'How heading ids are made. GitHub (portable) keeps accents and non-Latin letters; GitLab collapses hyphens; Pandoc starts at the first letter; Simple and ASCII strip accents and non-Latin text. Only GitHub is portable.' },
  wikiLinks: { type: 'boolean', default: false, category: 'Markdown', label: 'Wiki-Links and Embeds', description: 'Recognize [[Note]] links and ![[file]] embeds in every profile. Always on in the Knowledge profile.' },
  htmlPassthrough: { type: 'boolean', default: false, category: 'Markdown', label: 'Allow Inline HTML', description: 'Render HTML written in Markdown. It is always sanitised; scripts never run.' },
});
defineSettings('files', {
  newExtension: { type: 'enum', values: ['md', 'markdown', 'txt'], default: 'md', category: 'Files', label: 'New File Extension', description: 'Extension for new untitled documents and Explorer files without one.' },
  defaultEncoding: { type: 'enum', values: ['utf-8', 'utf-8-bom', 'utf-16le', 'utf-16be'], default: 'utf-8', category: 'Files', label: 'Encoding for New Files', description: 'Encoding used when a new document is first saved.' },
  defaultEol: { type: 'enum', values: ['lf', 'crlf'], default: 'lf', category: 'Files', label: 'Line Endings for New Files', description: 'Line endings used when a new document is first saved.' },
  autosave: { type: 'enum', values: ['off', 'delay', 'blur'], default: 'off', category: 'Files', label: 'Autosave', description: 'Off, after a pause in typing, or when the window loses focus. Only saved files are autosaved; untitled documents never are.' },
  autosaveDelay: { type: 'number', min: 5, max: 600, integer: true, default: 30, category: 'Files', label: 'Autosave Delay (seconds)', description: 'Idle time before a document is autosaved.' },
  onExternalChange: { type: 'enum', values: ['ask', 'reload'], default: 'ask', category: 'Files', label: 'When a File Changes on Disk', description: 'Ask shows a banner. Reload reloads unmodified documents automatically (a history snapshot is taken first); modified documents always ask.' },
});
defineSettings('recovery', {
  interval: { type: 'number', min: 1, max: 300, integer: true, default: 2, category: 'Recovery', label: 'Recovery Copy Interval (seconds)', description: 'Delay after a change before a recovery copy of the unsaved document is written.' },
  keepDays: { type: 'number', min: 1, max: 90, integer: true, default: 14, category: 'Recovery', label: 'Keep Recovery Copies (days)', description: 'Copies left by an unclean exit older than this are deleted instead of offered.' },
});
defineSettings('history', {
  maxVersions: { type: 'number', min: 1, max: 1000, integer: true, default: 50, category: 'History', label: 'Versions Kept Per File', description: 'Oldest unpinned versions beyond this number are deleted.' },
  keepLatest: { type: 'number', min: 1, max: 100, integer: true, default: 5, category: 'History', label: 'Latest Versions Always Kept', description: 'The newest versions of a file are never pruned by age or size.' },
  maxAgeDays: { type: 'number', min: 1, max: 3650, integer: true, default: 90, category: 'History', label: 'Keep Versions (days)', description: 'Unpinned versions older than this are deleted.' },
  maxMB: { type: 'number', min: 1, max: 5000, integer: true, default: 200, category: 'History', label: 'Total History Size (MB)', description: 'When history exceeds this size, the oldest unpinned versions are deleted first.' },
  autosaveSeconds: { type: 'number', min: 10, max: 3600, integer: true, default: 300, category: 'History', label: 'Autosave Snapshot Interval (seconds)', description: 'An autosave is added to history after this long since the latest version.' },
  autosaveDelta: { type: 'number', min: 1, max: 100000, integer: true, default: 200, category: 'History', label: 'Autosave Snapshot Size Change (bytes)', description: 'An autosave is also added when the document size changed by at least this much.' },
});
defineSettings('session', {
  restore: { type: 'enum', values: ['last', 'empty'], default: 'last', category: 'Recovery', label: 'On Startup', description: 'Reopen the documents of the last session, or start empty.' },
});
defineSettings('palette', {
  recent: { type: 'string', maxLength: 600, default: '', category: 'Palette', label: 'Recent Commands', description: 'Recently run palette command ids, comma separated.' },
});
defineSettings('keymap', {
  overrides: { type: 'string', maxLength: 8000, default: '{}', category: 'Keymap', label: 'Keyboard Shortcut Overrides', description: 'JSON of command ids to shortcuts; edit it in Preferences > Keyboard Shortcuts.' },
});
defineSettings('accessibility', {
  reducedMotion: { type: 'boolean', default: false, category: 'Accessibility', label: 'Reduce Motion', description: 'Turn off animations and transitions, whatever the system setting.' },
  focusRing: { type: 'boolean', default: false, category: 'Accessibility', label: 'Enhanced Focus Ring', description: 'Draw a thicker, higher-contrast outline around the focused control.' },
});
defineSettings('stats', {
  readingWpm: { type: 'number', integer: true, min: 80, max: 600, default: 230, category: 'Editor', label: 'Reading Speed', description: 'Words per minute used for reading time.' },
  excludeFrontmatter: { type: 'boolean', default: true, category: 'Editor', label: 'Exclude Frontmatter From Statistics', description: 'Leave the YAML block at the top out of word counts.' },
  excludeCode: { type: 'boolean', default: false, category: 'Editor', label: 'Exclude Code Blocks From Statistics', description: 'Leave fenced code out of word counts.' },
});
defineSettings('tools', {
  preview: { type: 'boolean', default: false, category: 'Editor', label: 'Preview Document Utilities', description: 'Show a before and after comparison with Apply and Cancel before Formatter, Trailing Space, Indentation and Empty Headings change the document.' },
});
defineSettings('transactions', {
  keep: { type: 'number', integer: true, min: 1, max: 200, default: 20, category: 'Files', label: 'Transactions to Keep', description: 'Number of multi-file change journals kept for undo.' },
  maxMB: { type: 'number', integer: true, min: 10, max: 5000, default: 200, category: 'Files', label: 'Transaction Storage (MB)', description: 'Oldest journals are removed beyond this size.' },
});
defineSettings('links', {
  updateReferences: { type: 'enum', values: ['always ask', 'never', 'always apply'], default: 'always ask', category: 'Markdown', label: 'Update Internal References', description: 'When files or attachments are renamed or moved: ask with a review dialog, never update references, or always apply automatically.' },
});
defineSettings('bibliography', {
  defaultPath: { type: 'string', maxLength: 1000, default: '', category: 'Integrations', control: 'path', label: 'Default Bibliography', description: 'Workspace default bibliography file (BibTeX .bib or CSL JSON .json).' },
  style: { type: 'enum', values: ['author-year', 'numbered'], default: 'author-year', category: 'Integrations', label: 'Citation Style', description: 'Default citation formatting style.' },
});
defineSettings('grammar', {
  enabled: { type: 'boolean', default: false, hidden: true, category: 'Privacy', label: 'Online Grammar Check', description: 'Send the checked paragraph to the grammar endpoint. Turned on only through the disclosure dialog.' },
  url: { type: 'string', maxLength: 300, default: '', hidden: true, category: 'Privacy', label: 'Grammar Endpoint URL', description: 'LanguageTool-compatible check URL, e.g. https://host/v2/check. Plain http only for this computer.' },
  language: { type: 'string', maxLength: 20, default: 'en-US', hidden: true, category: 'Privacy', label: 'Grammar Language', description: 'Language code sent to the endpoint, e.g. en-US, fr or auto.' },
  optOut: { type: 'string', maxLength: 20000, default: '[]', hidden: true, category: 'Privacy', label: 'Documents Excluded From Grammar Check', description: 'JSON list of document paths.' },
});
defineSettings('integrations', {
  pandocPath: { type: 'string', maxLength: 1000, default: '', category: 'Integrations', label: 'Pandoc Path', description: 'Full path to the Pandoc program, or the folder that contains it. Leave empty to find Pandoc automatically.' },
  pandocTimeout: { type: 'number', min: 5, max: 600, integer: true, default: 60, category: 'Integrations', label: 'Pandoc Time Limit (seconds)', description: 'A Pandoc run that takes longer than this is stopped.' },
  externalLinkCheck: { type: 'boolean', default: false, category: 'Integrations', label: 'Check External Links', description: 'Check reachability of external links in your documents. Network requests are sent to target URLs.' },
  externalLinkTimeout: { type: 'number', min: 1, max: 30, integer: true, default: 5, category: 'Integrations', label: 'Link Check Timeout (seconds)', description: 'Maximum seconds to wait for each external link response.' },
});
defineSettings('user', {
  name: { type: 'string', maxLength: 80, default: '', category: 'Profile', label: 'Your Name', description: 'Used as the author of new documents.' },
});
defineSettings('ribbon', {
  layout: { type: 'string', maxLength: 30000, default: '', hidden: true, category: 'Layout', label: 'Ribbon Layout', description: 'JSON of the customized ribbon: tab, group and command visibility, order and custom groups.' },
  quickAccess: { type: 'string', maxLength: 4000, default: '["file.save"]', hidden: true, category: 'Layout', label: 'Quick Access Toolbar', description: 'JSON list of command ids shown in the title bar.' },
});
defineSettings('themes', {
  library: { type: 'string', maxLength: 80000, default: '', hidden: true, category: 'Appearance', label: 'Custom Themes', description: 'JSON of the custom themes: name, light or dark base and the design token values that differ from the built-in theme.' },
  light: { type: 'string', maxLength: 40, default: 'light', hidden: true, category: 'Appearance', label: 'Light Theme', description: 'Id of the theme used when the application is light.' },
  dark: { type: 'string', maxLength: 40, default: 'dark', hidden: true, category: 'Appearance', label: 'Dark Theme', description: 'Id of the theme used when the application is dark.' },
  preview: { type: 'string', maxLength: 40, default: '', hidden: true, category: 'Preview', label: 'Custom Preview Theme', description: 'Id of a custom theme applied to the preview and reading view. Empty uses the preview theme preset.' },
});
defineSettings('export', {
  defaultPreset: { type: 'string', maxLength: 60, default: 'Academic Style', category: 'Export', label: 'Default Preset', description: 'Export preset used when opening Export Studio.' },
  destination: { type: 'enum', values: ['ask', 'same', 'custom'], default: 'ask', category: 'Export', label: 'Default Destination Folder', description: 'Ask each time, save in the same folder as the document, or use a custom folder.' },
  destinationDir: { type: 'string', maxLength: 500, default: '', category: 'Export', label: 'Custom Destination Folder', description: 'Folder offered first when the default destination is a custom folder.' },
  filenamePattern: { type: 'string', maxLength: 200, default: '{title}', category: 'Export', label: 'Filename Pattern Tokens', description: 'Supported tokens: {title}, {date}, {author}, {doc}.' },
  openAfterExport: { type: 'boolean', default: false, category: 'Export', label: 'Open After Export', description: 'Open the exported PDF automatically in the system viewer.' },
  preflightStrictness: { type: 'enum', values: ['strict', 'warn', 'off'], default: 'warn', category: 'Export', label: 'Preflight Strictness', description: 'Strict blocks on any finding; Warn blocks only on errors; Off allows export without preflight blocking.' },
  embedFonts: { type: 'enum', values: ['subset', 'all', 'none'], default: 'subset', category: 'Export', label: 'Embed-Fonts Policy', description: 'Subset embedded fonts, embed complete fonts, or do not embed fonts.' },
  collection: { type: 'string', maxLength: 30000, default: '', hidden: true, category: 'Export', label: 'Collection Builder State', description: 'JSON of the last collection (selection, order, mode, presets).' },
  batch: { type: 'string', maxLength: 1000, default: '', hidden: true, category: 'Export', label: 'Batch Export State', description: 'JSON of the last batch export format and folder name.' },
  lastPresets: { type: 'string', maxLength: 8000, default: '{}', category: 'Export', label: 'Remembered Document Presets', description: 'JSON map of document path or id to last-used preset.' },
  htmlPalette: { type: 'enum', values: ['antique', 'parchment', 'rosewood', 'clay', 'moss', 'sage', 'mist', 'harbour', 'paper', 'graphite', 'antique-night', 'walnut', 'deep-sea', 'forest-night', 'charcoal'], default: 'antique', category: 'Export', label: 'HTML Default Palette', description: 'Color palette used by default for HTML exports.' },
  docxToc: { type: 'enum', values: ['marker', 'always', 'never'], default: 'marker', category: 'Export', label: 'DOCX Table of Contents', description: 'Add a Word contents when the document has a contents marker, always, or never.' },
  docxStyle: { type: 'boolean', default: true, category: 'Export', label: 'DOCX Uses Export Styles', description: 'Build a Word reference document from the export palette and typography; falls back to Pandoc defaults.' },
  docxPalette: { type: 'enum', values: ['paper', 'sepia', 'ink', 'contrast', 'midnight', 'oxford', 'burgundy', 'forest', 'olive', 'slate', 'terracotta', 'monochrome', 'neutral'], default: 'paper', category: 'Export', label: 'DOCX Default Palette', description: 'Colour palette used for headings and links in DOCX exports (light palettes only).' },
  htmlToc: { type: 'enum', values: ['sidebar', 'none'], default: 'sidebar', category: 'Export', label: 'HTML Table of Contents', description: 'Show a navigable table of contents beside exported HTML pages.' },
  htmlHeadingFont: { type: 'string', maxLength: 60, default: 'Lora', category: 'Export', label: 'HTML Heading Font', description: 'Bundled font used for headings in HTML exports.' },
  htmlBodyFont: { type: 'string', maxLength: 60, default: 'Source Sans 3', category: 'Export', label: 'HTML Body Font', description: 'Bundled font used for body text in HTML exports.' },
  htmlWatermark: { type: 'boolean', default: true, category: 'Export', label: 'HTML Credit Line', description: 'Add a small Laurevine Loto credit at the bottom of exported pages.' },
});


