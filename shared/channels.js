// IPC contract: the single source of truth for every channel.
// input(payload) returns null when valid, otherwise a message describing the problem.
// preload.cjs inlines the channel names; tools/check.mjs fails the build if they drift.
export const CH = Object.freeze({
  APP_INFO: 'app:info',
  APP_NOTICES: 'app:notices',
  APP_OPEN_PATH: 'app:openPath',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',
  SETTINGS_CHANGED: 'settings:changed',
  WINDOW_SET_THEME: 'window:setTheme',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggleMaximize',
  WINDOW_SET_FULL_SCREEN: 'window:setFullScreen',
  WINDOW_SET_ZOOM: 'window:setZoom',
  PRIVACY_CLEAR: 'privacy:clear',
  WINDOW_ARM_CLOSE_GUARD: 'window:armCloseGuard',
  WINDOW_CLOSE: 'window:close',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_REQUEST_CLOSE: 'window:requestClose',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_MAXIMIZED_CHANGED: 'window:maximizedChanged',
  WINDOW_CLOSE_REQUESTED: 'window:closeRequested',
  ASSETS_AUTHORIZE_ROOT: 'assets:authorizeRoot',
  CLIPBOARD_WRITE_TEXT: 'clipboard:writeText',
  CLIPBOARD_WRITE_RICH: 'clipboard:writeRich',
  CLIPBOARD_READ_TEXT: 'clipboard:readText',
  CLIPBOARD_READ_HTML: 'clipboard:readHtml',
  CLIPBOARD_READ_IMAGE: 'clipboard:readImage',
  SPELL_LANGUAGES: 'spell:languages',
  SPELL_SET_LANGUAGE: 'spell:setLanguage',
  SPELL_ADD_WORD: 'spell:addWord',
  SPELL_REMOVE_WORD: 'spell:removeWord',
  SPELL_WORDS: 'spell:words',
  SPELL_CONTEXT: 'spell:context',
  GRAMMAR_CHECK: 'grammar:check',
  GRAMMAR_CANCEL: 'grammar:cancel',
  DOC_OPEN: 'doc:open',
  DOC_OPEN_DIALOG: 'doc:openDialog',
  DOC_SAVE: 'doc:save',
  DOC_SAVE_AS: 'doc:saveAs',
  DOC_SAVE_COPY: 'doc:saveCopy',
  DOC_STAT: 'doc:stat',
  DOC_REVEAL: 'doc:reveal',
  DOC_OPEN_EXTERNAL: 'doc:openExternal',
  DOC_RENAME: 'doc:rename',
  RECENTS_LIST: 'recents:list',
  RECENTS_PIN: 'recents:pin',
  RECENTS_UNPIN: 'recents:unpin',
  RECENTS_REMOVE: 'recents:remove',
  RECENTS_CLEAR: 'recents:clear',
  TEMPLATES_LIST: 'templates:list',
  TEMPLATES_SAVE: 'templates:save',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DUPLICATE: 'templates:duplicate',
  TEMPLATES_DELETE: 'templates:delete',
  TEMPLATES_IMPORT: 'templates:import',
  TEMPLATES_EXPORT: 'templates:export',
  PALETTES_LIST: 'palettes:list',
  PALETTES_SAVE: 'palettes:save',
  PALETTES_UPDATE: 'palettes:update',
  PALETTES_DUPLICATE: 'palettes:duplicate',
  PALETTES_DELETE: 'palettes:delete',
  PALETTES_IMPORT: 'palettes:import',
  PALETTES_EXPORT: 'palettes:export',
  PRESETS_LIST: 'presets:list',
  PRESETS_SAVE: 'presets:save',
  PRESETS_UPDATE: 'presets:update',
  PRESETS_DUPLICATE: 'presets:duplicate',
  PRESETS_DELETE: 'presets:delete',
  PRESETS_IMPORT: 'presets:import',
  PRESETS_EXPORT: 'presets:export',
  PRESETS_EXPORT_BUNDLE: 'presets:exportBundle',
  SNIPPETS_LIST: 'snippets:list',
  SNIPPETS_SAVE: 'snippets:save',
  SNIPPETS_UPDATE: 'snippets:update',
  SNIPPETS_DUPLICATE: 'snippets:duplicate',
  SNIPPETS_DELETE: 'snippets:delete',
  SNIPPETS_IMPORT: 'snippets:import',
  SNIPPETS_EXPORT: 'snippets:export',
  WORKSPACE_OPEN: 'workspace:open',
  WORKSPACE_CLOSE: 'workspace:close',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_RECENT: 'workspace:recent',
  WORKSPACE_REMOVE: 'workspace:remove',
  WORKSPACE_LIST_FILES: 'workspace:listFiles',
  WORKSPACE_INDEX: 'workspace:index',
  WORKSPACE_INDEX_PROGRESS: 'workspace:indexProgress',
  SEARCH_START: 'search:start',
  SEARCH_CANCEL: 'search:cancel',
  SEARCH_RESULTS: 'search:results',
  TX_PREVIEW: 'tx:preview',
  TX_APPLY: 'tx:apply',
  TX_UNDO: 'tx:undo',
  TX_LIST: 'tx:list',
  FS_LIST_DIR: 'fs:listDir',
  FS_TREE_CHANGE: 'fs:treeChange',
  FS_CREATE_FILE: 'fs:createFile',
  FS_CREATE_FOLDER: 'fs:createFolder',
  FS_RENAME: 'fs:rename',
  FS_MOVE: 'fs:move',
  FS_COPY: 'fs:copy',
  FS_DELETE: 'fs:delete',
  FS_DUPLICATE: 'fs:duplicate',
  IMAGE_PICK: 'image:pick',
  IMAGE_PICK_DIR: 'image:pickDir',
  IMAGE_COPY: 'image:copy',
  IMAGE_SAVE: 'image:save',
  IMAGE_LIST: 'image:list',
  RECOVERY_LIST: 'recovery:list',
  RECOVERY_READ: 'recovery:read',
  RECOVERY_PUT: 'recovery:put',
  RECOVERY_DROP: 'recovery:drop',
  HISTORY_LIST: 'history:list',
  HISTORY_READ: 'history:read',
  HISTORY_RESTORE: 'history:restore',
  HISTORY_PIN: 'history:pin',
  HISTORY_DELETE: 'history:delete',
  HISTORY_STATS: 'history:stats',
  HISTORY_SNAPSHOT: 'history:snapshot',
  HISTORY_FILES: 'history:files',
  SESSION_GET: 'session:get',
  SESSION_SET: 'session:set',
  DOC_WATCH: 'doc:watch',
  DOC_UNWATCH: 'doc:unwatch',
  DOC_CHANGED: 'doc:changed',
  PDF_EXPORT: 'pdf:export',
  PDF_CANCEL: 'pdf:cancel',
  PDF_ASSET: 'pdf:asset',
  PDF_PROGRESS: 'pdf:progress',
  PDF_PRINT: 'pdf:print',
  PDF_PICK_DIR: 'pdf:pickDir',
  PANDOC_DETECT: 'pandoc:detect',
  PANDOC_TEST: 'pandoc:test',
  PANDOC_CANCEL: 'pandoc:cancel',
  PANDOC_EXPORT_DOCX: 'pandoc:exportDocx',
  PANDOC_EXPORT_RTF: 'pandoc:exportRtf',
  EXPORT_WRITE: 'export:write',
  EXPORT_EXISTS: 'export:exists',
  MIGRATION_PICK: 'migration:pick',
  MIGRATION_SCAN: 'migration:scan',
  MIGRATION_CANCEL: 'migration:cancel',
  MIGRATION_PROGRESS: 'migration:progress',
  MIGRATION_PICK_DEST: 'migration:pickDest',
  MIGRATION_COPY: 'migration:copy',
  MIGRATION_CONVERT: 'migration:convert',
  MIGRATION_REVERT: 'migration:revert',
  EXPORT_TREE: 'export:tree',
});

const noPayload = (payload) => (payload === undefined || payload === null ? null : 'expects no payload');

const isObj = (p) => p !== null && typeof p === 'object' && !Array.isArray(p);
const settingKey = (k) => typeof k === 'string' && k.length > 0 && k.length <= 100;
const setInput = (p) => {
  if (!isObj(p)) return 'expects { key, value }';
  if (!settingKey(p.key)) return 'key must be a non-empty string';
  const t = typeof p.value;
  return (t === 'string' && p.value.length <= 50000) || t === 'boolean' || t === 'number' ? null : 'value must be a string (up to 50000 characters), number or boolean';
};
const resetInput = (p) => (p == null ? null : !isObj(p) ? 'expects { key? }' : p.key !== undefined && !settingKey(p.key) ? 'key must be a non-empty string' : null);

const themeInput = (p) => (isObj(p) && ['light', 'dark', 'system'].includes(p.theme) ? null : "expects { theme: 'light' | 'dark' | 'system' }");

const clipStr = (s) => typeof s === 'string' && s.length <= 5_000_000;
const spellLang = (p) => (isObj(p) && typeof p.language === 'string' && p.language.length <= 20 && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/.test(p.language) ? null : 'expects { language: BCP-47 code up to 20 characters }');
const spellWord = (p) => (isObj(p) && typeof p.word === 'string' && p.word.length >= 1 && p.word.length <= 100 && !/\s/.test(p.word) ? null : 'expects { word: 1-100 characters, no whitespace }');

const grammarIn = (p) => (isObj(p) && typeof p.text === 'string' && p.text.length > 0 && p.text.length <= 20000 ? null : 'expects { text: 1-20000 characters }');
const absStr = (s) => typeof s === 'string' && s.length > 0 && s.length <= 4096 && !s.includes('\0') && /^([a-zA-Z]:[\\/]|[\\/])/.test(s);
const docFmt = (p) => typeof p.text === 'string' && p.text.length <= 64_000_000
  && (p.encoding === undefined || ['utf-8', 'utf-16le', 'utf-16be'].includes(p.encoding))
  && (p.bom === undefined || typeof p.bom === 'boolean')
  && (p.eol === undefined || ['lf', 'crlf', 'cr', 'mixed'].includes(p.eol))
  && (p.dominantEol === undefined || ['lf', 'crlf', 'cr'].includes(p.dominantEol));
export const IPC_VERSION = 1;
const recKey = (k) => typeof k === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(k);
const recRead = (p) => (isObj(p) && recKey(p.key) ? null : 'expects { key }');
const recPut = (p) => (isObj(p) && recKey(p.key) && typeof p.name === 'string' && p.name.length <= 260 && (p.path === null || absStr(p.path)) && typeof p.text === 'string' && p.text.length <= 8_000_000 && Number.isInteger(p.caret) && p.caret >= 0 && typeof p.mode === 'string' && p.mode.length <= 20 ? null : 'expects { key, name, path|null, text, caret, mode }');
const recDrop = (p) => (isObj(p) && (p.all === true || (Array.isArray(p.keys) && p.keys.length <= 200 && p.keys.every(recKey))) ? null : 'expects { keys: [key] } or { all: true }');
const sessIn = (p) => (isObj(p) && isObj(p.session) && Array.isArray(p.session.docs) && p.session.docs.length <= 500 && p.session.docs.every((d) => isObj(d) && absStr(d.path)) && JSON.stringify(p.session).length <= 2_000_000 ? null : 'expects { session: { docs: [{ path, ... }], groups, active, root } }');
export const HISTORY_LABELS = Object.freeze(['Saved', 'Autosave', 'Before restore', 'Before replace', 'Before revert', 'Before reload', 'On close']);
const histRef = (p) => isObj(p) && ((p.path === undefined && typeof p.docId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(p.docId)) || (p.docId === undefined && absStr(p.path)));
const histId = (v) => typeof v === 'string' && /^[0-9a-z]{1,12}$/.test(v);
const histText = (s) => typeof s === 'string' && s.length <= 8_000_000;
const HREF = '{ path: absolute path } or { docId }';
const histList = (p) => (histRef(p) ? null : `expects ${HREF}`);
const histSel = (p) => (histRef(p) && histId(p.id) ? null : `expects ${HREF} plus id`);
const histRestore = (p) => (histSel(p) || (p.current === undefined || histText(p.current) ? null : 'current must be text up to 8 MB'));
const histPin = (p) => (histSel(p) || (p.pinned === undefined || typeof p.pinned === 'boolean' ? null : 'pinned must be a boolean'));
const histDel = (p) => (histRef(p) && (p.id === undefined || histId(p.id)) ? null : `expects ${HREF} plus id? (no id deletes the whole history)`);
const histStats = (p) => (p == null || histRef(p) ? null : `expects nothing or ${HREF}`);
const histSnap = (p) => (histRef(p) && histText(p.text) && HISTORY_LABELS.includes(p.label) ? null : `expects ${HREF} plus text and label (${HISTORY_LABELS.join(', ')})`);
const optStr = (v, n) => v === undefined || (typeof v === 'string' && v.length <= n);
const tplId = (p) => (isObj(p) && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100 ? null : 'expects { id: template id }');
const tplSave = (p) => (isObj(p) && typeof p.name === 'string' && p.name.length <= 100 && typeof p.text === 'string' && p.text.length <= 200000 && optStr(p.description, 400) && optStr(p.category, 100) ? null : 'expects { name, text, description?, category? }');
const tplUpdate = (p) => (tplId(p) || (optStr(p.name, 100) && optStr(p.description, 400) && optStr(p.category, 100) ? null : 'expects { id, name?, description?, category? }'));
const palSave = (p) => (isObj(p) && typeof p.name === 'string' && p.name.length <= 100 && isObj(p.palette) ? null : 'expects { name, palette }');
const palUpdate = (p) => (tplId(p) || (typeof p.name === 'string' && p.name.length <= 100 ? null : 'expects { id, name }'));
const presetSave = (p) => (isObj(p) && typeof p.name === 'string' && p.name.length <= 100 && isObj(p.config) ? null : 'expects { name, config }');
const presetUpdate = (p) => (tplId(p) || (typeof p.name === 'string' && p.name.length <= 100 && (p.config === undefined || isObj(p.config)) ? null : 'expects { id, name, config? }'));
const snipSave = (p) => (isObj(p) && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 100 && typeof p.trigger === 'string' && p.trigger.length > 0 && p.trigger.length <= 50 && typeof p.body === 'string' && p.body.length <= 50000 && optStr(p.scope, 100) ? null : 'expects { name, trigger, body, scope? }');
const snipUpdate = (p) => (tplId(p) || (typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 100 && typeof p.trigger === 'string' && p.trigger.length > 0 && p.trigger.length <= 50 && typeof p.body === 'string' && p.body.length <= 50000 && optStr(p.scope, 100) ? null : 'expects { id, name, trigger, body, scope? }'));
const PAL_ERR = 'or { ok: false, error: { code: E_NAME | E_EXISTS | E_NOENT | E_INVALID, message } }';
const TPL_ERR = 'or { ok: false, error: { code: E_NAME | E_EXISTS | E_READONLY | E_NOENT | E_SIZE, message } }';
const pathInput = (p) => (isObj(p) && absStr(p.path) ? null : 'expects { path: absolute path }');
const openInput = (p) => (pathInput(p) === null && (p.recent === undefined || typeof p.recent === 'boolean') ? null : 'expects { path: absolute path, recent?: boolean }');
const renameInput = (p) => (isObj(p) && absStr(p.path) && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 255 ? null : 'expects { path: absolute path, name: file name }');
const dirNameInput = (p) => (isObj(p) && absStr(p.dir) && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 255 ? null : 'expects { dir: absolute folder, name }');
const pathsInput = (p) => (isObj(p) && Array.isArray(p.paths) && p.paths.length > 0 && p.paths.length <= 500 && p.paths.every(absStr) ? null : 'expects { paths: 1-500 absolute paths }');
const destInput = (p) => (pathsInput(p) === null && (p.toDir === undefined || absStr(p.toDir)) ? null : 'expects { paths, toDir?: absolute folder }');
const FS_OPS_ERR = 'or { ok: false, error: { code: E_PATH|E_NOENT|E_ACCESS|E_BUSY|E_NAME|E_EXISTS|E_IO, message } }';
const FS_MULTI = `{ ok: true, canceled?, results: [{ from, path? | error: { code, message } }] } ${FS_OPS_ERR}: paths must be inside the active workspace; collisions get a " (2)" suffix, never overwrite`;
const watchIn = (p) => (isObj(p) && typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(p.id) && absStr(p.path) && /^[0-9a-f]{64}$/.test(p.hash) ? null : 'expects { id, path: absolute path, hash: sha256 hex }');
const unwatchIn = (p) => (isObj(p) && typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(p.id) ? null : 'expects { id }');
const saveInput = (p) => (isObj(p) && absStr(p.path) && docFmt(p) && (p.expectedHash == null || /^[0-9a-f]{64}$/.test(p.expectedHash)) ? null : 'expects { path, text, encoding?, bom?, eol?, dominantEol?, expectedHash? }');
const saveAsInput = (p) => (isObj(p) && docFmt(p) && (p.defaultPath === undefined || absStr(p.defaultPath)) ? null : 'expects { text, encoding?, bom?, eol?, dominantEol?, defaultPath? }');
const openDialogInput = (p) => (p == null || (isObj(p) && (p.defaultPath === undefined || absStr(p.defaultPath)) && (p.recent === undefined || typeof p.recent === 'boolean')) ? null : 'expects { defaultPath?, recent? }');
const DOC_ERR = 'or { ok: false, error: { code: E_PATH|E_NOTFILE|E_NOENT|E_ACCESS|E_BUSY|E_BINARY|E_TOOBIG|E_CONFLICT|E_NAME|E_EXISTS|E_IO, message } }';
const DOC_META = '{ path, mtimeMs, size, hash }';
const DOC_FULL = '{ path, text (LF), encoding: utf-8|utf-16le|utf-16be, bom, eol: lf|crlf|cr|mixed, dominantEol, mtimeMs, size, hash }';
const RECENTS_OUT = '{ items: [{ path, name, pinned, openedAt }] }: pinned first, then newest first';

const imgPick = (p) => (p == null || (isObj(p) && (p.kind === undefined || p.kind === 'image' || p.kind === 'asset') && (p.defaultPath === undefined || absStr(p.defaultPath)) && (p.path === undefined || absStr(p.path)) && (p.media === undefined || p.media === 'audio' || p.media === 'video')) ? null : "expects { kind?: 'image'|'asset', defaultPath?, path? }");
const imgDir = (p) => (p == null || (isObj(p) && (p.defaultPath === undefined || absStr(p.defaultPath))) ? null : 'expects { defaultPath? }');
const imgCopy = (p) => (isObj(p) && absStr(p.src) && (p.kind === 'image' || p.kind === 'asset') && (p.docPath === undefined || absStr(p.docPath)) && optStr(p.dir, 200) && (p.destDir === undefined || absStr(p.destDir)) && (p.destDir !== undefined || p.docPath !== undefined) ? null : 'expects { src, kind: image|asset, docPath + dir? | destDir }');
const imgSave = (p) => (isObj(p) && typeof p.data === 'string' && p.data.length > 0 && p.data.length <= 70000000 && (p.ext === undefined || /^[a-z0-9]{3,4}$/i.test(p.ext)) && (p.docPath === undefined || absStr(p.docPath)) && optStr(p.dir, 200) && (p.destDir === undefined || absStr(p.destDir)) && (p.destDir !== undefined || p.docPath !== undefined) ? null : 'expects { data: base64 image up to 50 MB, ext?, docPath + dir? | destDir }');
const imgList = (p) => (isObj(p) && (p.paths === undefined || (Array.isArray(p.paths) && p.paths.length <= 500 && p.paths.every(absStr))) && (p.dirs === undefined || (Array.isArray(p.dirs) && p.dirs.length <= 8 && p.dirs.every(absStr))) ? null : 'expects { paths?: <=500 absolute files, dirs?: <=8 absolute folders }');
const IMG_ERR = 'or { ok: false, error: { code: E_PATH|E_NOENT|E_NOTFILE|E_TYPE|E_TOOBIG|E_ACCESS|E_BUSY|E_EXISTS|E_IO, message } }';

const jobId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(v);
const pdfExport = (p) => (isObj(p) && jobId(p.id) && typeof p.title === 'string' && p.title.length <= 300 && typeof p.html === 'string' && p.html.length > 0 && p.html.length <= 150000000 && (p.dir === undefined || absStr(p.dir)) && (p.name === undefined || (typeof p.name === 'string' && p.name.length <= 200)) && (p.overwrite === undefined || typeof p.overwrite === 'boolean') ? null : 'expects { id, title, html: publication HTML (images inlined), dir?: folder from pdf:pickDir, name?: file name, overwrite?: replace an existing file of that name }');
const pdfCancel = (p) => (isObj(p) && jobId(p.id) ? null : 'expects { id }');
const pdfAsset = (p) => (isObj(p) && absStr(p.baseDir) && typeof p.rel === 'string' && p.rel.length > 0 && p.rel.length <= 1000 && !p.rel.includes('\0') ? null : 'expects { baseDir: absolute folder, rel: relative image path }');
const pandocJob = (p) => (isObj(p) && jobId(p.id) ? null : 'expects { id }');
const docxExport = (p) => (isObj(p) && jobId(p.id) && typeof p.markdown === 'string' && p.markdown.length <= 40000000 && typeof p.defaultName === 'string' && p.defaultName.length <= 300 && (p.baseDir === undefined || p.baseDir === '' || absStr(p.baseDir)) && (p.toc === undefined || typeof p.toc === 'boolean') && (p.tocDepth === undefined || (Number.isInteger(p.tocDepth) && p.tocDepth >= 1 && p.tocDepth <= 6)) && (p.metadata === undefined || isObj(p.metadata)) && (p.style === undefined || p.style === null || isObj(p.style)) && (p.dir === undefined || p.dir === '' || absStr(p.dir)) && (p.batch === undefined || typeof p.batch === 'boolean') && (p.overwrite === undefined || typeof p.overwrite === 'boolean') && (!p.batch || absStr(p.dir)) ? null : 'expects { id, markdown, defaultName, batch?: save into dir (from pdf:pickDir) without a dialog, overwrite?, dir?: absolute folder, baseDir?: absolute folder, toc?, tocDepth?: 1-6, metadata?: { title, author, date }, style?: style spec | null }');
const EXPORT_EXT = ['png', 'svg', 'txt', 'html', 'md'];
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;
const exportEntry = (e) => isObj(e) && typeof e.name === 'string' && e.name.length > 0 && e.name.length <= 200 && !e.name.includes('\0') && !/^([a-zA-Z]:|[\\/])/.test(e.name) && !e.name.split(/[\\/]/).some((s) => s === '' || s === '.' || s === '..')
  && ((typeof e.text === 'string' && e.data === undefined && e.text.length <= 40000000) || (typeof e.data === 'string' && e.text === undefined && e.data.length <= 60000000 && B64.test(e.data)));
const exportTree = (p) => (isObj(p) && absStr(p.dir) && Array.isArray(p.entries) && p.entries.length >= 1 && p.entries.length <= 3000 && p.entries.every(exportEntry) && Array.isArray(p.overwrite) && p.overwrite.length <= 3000 && p.overwrite.every((n) => typeof n === 'string' && n.length <= 200) ? null : 'expects { dir: folder from pdf:pickDir, entries: [{ name: relative path, text | data: base64 }] (1-3000), overwrite: [names allowed to be replaced] }');
const exportExists = (p) => (isObj(p) && absStr(p.dir) && Array.isArray(p.names) && p.names.length <= 3000 && p.names.every((n) => exportEntry({ name: n, text: '' })) ? null : 'expects { dir: folder from pdf:pickDir, names: [relative path] }');
const migrationPick = (p) => (p == null || (isObj(p) && (p.kind === undefined || p.kind === 'folder' || p.kind === 'zip')) ? null : "expects { kind?: 'folder'|'zip' }");
const migrationDest = (p) => (p == null || (isObj(p) && (p.mode === undefined || p.mode === 'copy' || p.mode === 'new')) ? null : "expects { mode?: 'copy'|'new' }");
const migrationCopy = (p) => (isObj(p) && absStr(p.source) && absStr(p.dest) && (p.mode === 'copy' || p.mode === 'new') && (p.convert === undefined || typeof p.convert === 'boolean') && (p.name === undefined || (typeof p.name === 'string' && p.name.length <= 100)) ? null : 'expects { source, dest: absolute paths chosen with migration:pick and migration:pickDest, mode: copy|new, convert?: boolean, name?: string }');
const migrationRoot = (p) => (isObj(p) && absStr(p.root) ? null : 'expects { root: absolute folder returned by migration:copy }');
const migrationScan = (p) => (isObj(p) && absStr(p.path) ? null : 'expects { path: absolute source chosen with migration:pick }');
const exportWrite = (p) => (isObj(p) && ['file', 'zip', 'folder'].includes(p.kind) && typeof p.defaultName === 'string' && p.defaultName.length <= 300 && (p.dir === undefined || p.dir === '' || absStr(p.dir)) && Array.isArray(p.entries) && p.entries.length >= 1 && p.entries.length <= 500 && p.entries.every(exportEntry) && (p.kind !== 'file' || (EXPORT_EXT.includes(p.ext) && p.entries.length === 1)) ? null : 'expects { kind: file|zip|folder, defaultName, dir?: absolute folder, ext?: png|svg|txt|html|md (file only), entries: [{ name: relative path, text | data: base64 }] (1-500) }');
const pdfPrint = (p) => (isObj(p) && typeof p.html === 'string' && p.html.length > 0 && p.html.length <= 150000000 ? null : 'expects { html: publication HTML (images inlined) }');

export const INVOKE_CHANNELS = Object.freeze({
  [CH.APP_INFO]: Object.freeze({
    input: noPayload,
    output: '{ name, version, platform, electron, chromium, node, userData }: all strings (userData: the app data folder)',
  }),
  [CH.APP_NOTICES]: Object.freeze({
    input: (p) => (p == null || (isObj(p) && (p.doc === undefined || ['notices', 'license', 'trademark'].includes(p.doc))) ? null : "expects { doc?: 'notices'|'license'|'trademark' }"),
    output: '{ text }: contents of THIRD_PARTY_NOTICES.md (default), LICENSE.txt or TRADEMARK.md at the application root',
  }),
  [CH.SETTINGS_GET_ALL]: Object.freeze({ input: noPayload, output: '{ values }: setting id -> effective value' }),
  [CH.SETTINGS_SET]: Object.freeze({ input: setInput, output: '{ ok: true, values } or { ok: false, error }' }),
  [CH.SETTINGS_RESET]: Object.freeze({ input: resetInput, output: '{ ok: true, values } or { ok: false, error }; no key resets all' }),
  [CH.WINDOW_SET_THEME]: Object.freeze({ input: themeInput, output: '{ applied: boolean }: sets nativeTheme and the title bar overlay colours' }),
  [CH.WINDOW_TOGGLE_MAXIMIZE]: Object.freeze({ input: noPayload, output: '{ maximized: boolean }: maximizes or restores the calling window' }),
  [CH.WINDOW_MINIMIZE]: Object.freeze({ input: noPayload, output: '{}: minimizes the calling window' }),
  [CH.WINDOW_REQUEST_CLOSE]: Object.freeze({ input: noPayload, output: '{}: asks the calling window to close; the close guard may ask the renderer first' }),
  [CH.WINDOW_IS_MAXIMIZED]: Object.freeze({ input: noPayload, output: '{ maximized: boolean }: whether the calling window is maximized or full screen' }),
  [CH.WINDOW_SET_FULL_SCREEN]: Object.freeze({
    input: (p) => (isObj(p) && typeof p.value === 'boolean' ? null : 'expects { value: boolean }'),
    output: '{ fullScreen: boolean }: enters or leaves full screen for the calling window',
  }),
  [CH.WINDOW_ARM_CLOSE_GUARD]: Object.freeze({ input: noPayload, output: '{}: from now on closing the calling window asks the renderer first (window:closeRequested)' }),
  [CH.WINDOW_CLOSE]: Object.freeze({ input: noPayload, output: '{}: closes the calling window without asking again' }),
  [CH.WINDOW_SET_ZOOM]: Object.freeze({
    input: (p) => (isObj(p) && typeof p.factor === 'number' && p.factor >= 0.5 && p.factor <= 2 ? null : 'expects { factor: number from 0.5 to 2 }'),
    output: '{ factor }: sets the zoom factor of the calling window',
  }),
  [CH.PRIVACY_CLEAR]: Object.freeze({
    input: (p) => (isObj(p) && (p.what === 'history' || p.what === 'recovery' || p.what === 'indexes') ? null : "expects { what: 'history' | 'recovery' | 'indexes' }"),
    output: '{ cleared: number }: files and folders removed from that userData folder',
  }),
  [CH.ASSETS_AUTHORIZE_ROOT]: Object.freeze({
    input: (p) => (isObj(p) && typeof p.id === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(p.id) && typeof p.path === 'string' && p.path.length > 0 && p.path.length <= 4096 ? null : 'expects { id: lowercase id, path: absolute folder }'),
    output: '{ authorized: boolean }: registers the folder as a read-only loto-asset:// root',
  }),
  [CH.CLIPBOARD_WRITE_TEXT]: Object.freeze({
    input: (p) => (isObj(p) && clipStr(p.text) ? null : 'expects { text: string up to 5 MB }'),
    output: '{}: puts plain text on the system clipboard',
  }),
  [CH.CLIPBOARD_WRITE_RICH]: Object.freeze({
    input: (p) => (isObj(p) && clipStr(p.html) && clipStr(p.text) ? null : 'expects { html: string, text: string } up to 5 MB each'),
    output: '{}: puts text/html and text/plain on the system clipboard',
  }),
  [CH.CLIPBOARD_READ_TEXT]: Object.freeze({ input: noPayload, output: '{ text }: plain text on the clipboard, "" if none' }),
  [CH.CLIPBOARD_READ_IMAGE]: Object.freeze({ input: noPayload, output: '{ data }: base64 PNG of the image on the clipboard, "" if none' }),
  [CH.CLIPBOARD_READ_HTML]: Object.freeze({ input: noPayload, output: '{ html }: text/html on the clipboard (unsanitised; the renderer sanitises), "" if none' }),
  [CH.DOC_OPEN]: Object.freeze({ input: openInput, output: `{ ok: true, doc: ${DOC_FULL} } ${DOC_ERR}; adds the file to recents unless recent is false` }),
  [CH.DOC_OPEN_DIALOG]: Object.freeze({ input: openDialogInput, output: `{ ok: true, canceled, docs: [${DOC_FULL}], errors: [{ path, code, message }] }: native multi-select open; adds files to recents unless recent is false` }),
  [CH.DOC_SAVE]: Object.freeze({ input: saveInput, output: `{ ok: true, ...${DOC_META} } ${DOC_ERR}; E_CONFLICT when expectedHash differs from the file on disk` }),
  [CH.DOC_SAVE_AS]: Object.freeze({ input: saveAsInput, output: `{ ok: true, canceled: true } or { ok: true, canceled: false, ...${DOC_META} } ${DOC_ERR}; adds the file to recents` }),
  [CH.DOC_SAVE_COPY]: Object.freeze({ input: saveAsInput, output: `{ ok: true, canceled: true } or { ok: true, canceled: false, ...${DOC_META} } ${DOC_ERR}; recents unchanged` }),
  [CH.DOC_STAT]: Object.freeze({ input: pathInput, output: `{ ok: true, exists: false } or { ok: true, exists: true, mtimeMs, size, birthtimeMs } ${DOC_ERR}` }),
  [CH.DOC_REVEAL]: Object.freeze({ input: pathInput, output: `{ ok: true } ${DOC_ERR}: shows the file in the OS file manager` }),
  [CH.DOC_OPEN_EXTERNAL]: Object.freeze({ input: pathInput, output: `{ ok: true } ${DOC_ERR}: opens a file inside the active workspace with the OS default application; executable types are refused` }),
  [CH.DOC_RENAME]: Object.freeze({ input: renameInput, output: `{ ok: true, path } ${DOC_ERR}: renames the file inside its folder, never overwrites; recents follow the new path` }),
  [CH.TEMPLATES_LIST]: Object.freeze({ input: noPayload, output: '{ ok: true, items: [{ id, name, description, category, builtin, text }] }: built-in templates plus *.md files in userData/templates (read only, max 200 KB each)' }),
  [CH.TEMPLATES_SAVE]: Object.freeze({ input: tplSave, output: `{ ok: true, id } ${TPL_ERR}: creates userData/templates/<name>.md (never overwrites) and its description and category` }),
  [CH.TEMPLATES_UPDATE]: Object.freeze({ input: tplUpdate, output: `{ ok: true, id } ${TPL_ERR}: renames and/or edits details of a user template; built-ins are refused` }),
  [CH.TEMPLATES_DUPLICATE]: Object.freeze({ input: tplId, output: `{ ok: true, id } ${TPL_ERR}: copies any template as a new user template` }),
  [CH.TEMPLATES_DELETE]: Object.freeze({ input: tplId, output: `{ ok: true } ${TPL_ERR}: moves a user template to the OS trash` }),
  [CH.TEMPLATES_IMPORT]: Object.freeze({ input: noPayload, output: '{ ok: true, ids, skipped }: native open dialog; each chosen file becomes a user template (renamed when the name is taken)' }),
  [CH.TEMPLATES_EXPORT]: Object.freeze({ input: tplId, output: `{ ok: true, canceled } ${TPL_ERR}: native save dialog, writes the template text` }),
  [CH.PALETTES_LIST]: Object.freeze({ input: noPayload, output: '{ ok: true, items: [{ id, name, palette }] }: valid *.json palettes in userData/palettes (max 20 KB each)' }),
  [CH.PALETTES_SAVE]: Object.freeze({ input: palSave, output: `{ ok: true, id } ${PAL_ERR}: creates userData/palettes/<name>.json from a validated palette (never overwrites)` }),
  [CH.PALETTES_UPDATE]: Object.freeze({ input: palUpdate, output: `{ ok: true, id } ${PAL_ERR}: renames a saved palette` }),
  [CH.PALETTES_DUPLICATE]: Object.freeze({ input: tplId, output: `{ ok: true, id } ${PAL_ERR}: copies a saved palette as "<name> copy"` }),
  [CH.PALETTES_DELETE]: Object.freeze({ input: tplId, output: `{ ok: true } ${PAL_ERR}: moves a saved palette to the OS trash` }),
  [CH.PALETTES_IMPORT]: Object.freeze({ input: noPayload, output: '{ ok: true, ids, skipped }: native open dialog; each valid palette JSON becomes a saved palette (renamed when the name is taken)' }),
  [CH.PALETTES_EXPORT]: Object.freeze({ input: tplId, output: `{ ok: true, canceled } ${PAL_ERR}: native save dialog, writes the palette JSON` }),
  [CH.PRESETS_LIST]: Object.freeze({ input: noPayload, output: '{ ok: true, items: [{ id, name, config, starter }] }: valid *.json export presets in userData/presets' }),
  [CH.PRESETS_SAVE]: Object.freeze({ input: presetSave, output: `{ ok: true, id } ${PAL_ERR}: creates userData/presets/<name>.json from a validated ExportConfig (never overwrites)` }),
  [CH.PRESETS_UPDATE]: Object.freeze({ input: presetUpdate, output: `{ ok: true, id } ${PAL_ERR}: renames or updates a saved preset` }),
  [CH.PRESETS_DUPLICATE]: Object.freeze({ input: tplId, output: `{ ok: true, id } ${PAL_ERR}: copies a saved preset as "<name> copy"` }),
  [CH.PRESETS_DELETE]: Object.freeze({ input: tplId, output: `{ ok: true } ${PAL_ERR}: moves a saved preset to the OS trash` }),
  [CH.PRESETS_IMPORT]: Object.freeze({ input: noPayload, output: '{ ok: true, ids, skipped }: native open dialog; imports single or bundle preset JSON' }),
  [CH.PRESETS_EXPORT]: Object.freeze({ input: tplId, output: `{ ok: true, canceled } ${PAL_ERR}: native save dialog, writes single preset JSON` }),
  [CH.PRESETS_EXPORT_BUNDLE]: Object.freeze({ input: noPayload, output: '{ ok: true, canceled }: native save dialog, writes bundle JSON of all presets' }),
  [CH.SNIPPETS_LIST]: Object.freeze({ input: noPayload, output: '{ ok: true, items: [{ id, name, trigger, body, scope }] }: valid *.json snippets in userData/snippets' }),
  [CH.SNIPPETS_SAVE]: Object.freeze({ input: snipSave, output: `{ ok: true, id } ${PAL_ERR}: creates userData/snippets/<name>.json (never overwrites)` }),
  [CH.SNIPPETS_UPDATE]: Object.freeze({ input: snipUpdate, output: `{ ok: true, id } ${PAL_ERR}: renames or updates a saved snippet` }),
  [CH.SNIPPETS_DUPLICATE]: Object.freeze({ input: tplId, output: `{ ok: true, id } ${PAL_ERR}: copies a saved snippet as "<name> copy"` }),
  [CH.SNIPPETS_DELETE]: Object.freeze({ input: tplId, output: `{ ok: true } ${PAL_ERR}: moves a saved snippet to the OS trash` }),
  [CH.SNIPPETS_IMPORT]: Object.freeze({ input: noPayload, output: '{ ok: true, ids, skipped }: native open dialog; imports snippet JSON' }),
  [CH.SNIPPETS_EXPORT]: Object.freeze({ input: tplId, output: `{ ok: true, canceled } ${PAL_ERR}: native save dialog, writes single snippet JSON` }),
  [CH.RECOVERY_LIST]: Object.freeze({ input: noPayload, output: '{ ok: true, items: [{ key, name, path|null, size, savedAt, mode, caret }] }: snapshots left by an unclean exit (empty after a clean one)' }),
  [CH.RECOVERY_READ]: Object.freeze({ input: recRead, output: '{ ok: true, snapshot: { key, name, path, text, caret, mode, size, savedAt } | null }' }),
  [CH.RECOVERY_PUT]: Object.freeze({ input: recPut, output: '{ ok: true, skipped }: atomic write to userData/recovery; documents over 8 MB are skipped; at most 100 files / 50 MB (oldest evicted)' }),
  [CH.SESSION_GET]: Object.freeze({ input: noPayload, output: '{ ok: true, session: { docs: [{ path, pinned, anchor, head, scroll, mode }], active, groups, root } | null }: the last saved session' }),
  [CH.DOC_WATCH]: Object.freeze({ input: watchIn, output: `{ ok: true }: watches the open document's file (replaces any watch with the same id); changes arrive as doc:changed ${DOC_ERR}` }),
  [CH.DOC_UNWATCH]: Object.freeze({ input: unwatchIn, output: '{ ok: true }' }),
  [CH.SESSION_SET]: Object.freeze({ input: sessIn, output: '{ ok: true }: stores the session (titled documents only, at most 500) in userData/session.json' }),
  [CH.RECOVERY_DROP]: Object.freeze({ input: recDrop, output: '{ ok: true }: deletes the given snapshots, or all of them' }),
  [CH.HISTORY_LIST]: Object.freeze({ input: histList, output: '{ ok: true, versions: [{ id, at, size, label, pinned }] } newest first' }),
  [CH.HISTORY_READ]: Object.freeze({ input: histSel, output: '{ ok: true, version, text } or E_NOENT' }),
  [CH.HISTORY_RESTORE]: Object.freeze({ input: histRestore, output: '{ ok: true, version, text }: never writes the document; when `current` is given it is first kept as "Before restore"' }),
  [CH.HISTORY_PIN]: Object.freeze({ input: histPin, output: '{ ok: true, version }: pinned versions are never pruned' }),
  [CH.HISTORY_DELETE]: Object.freeze({ input: histDel, output: '{ ok: true, removed }: one version, or the whole history of the file when id is omitted' }),
  [CH.HISTORY_STATS]: Object.freeze({ input: histStats, output: '{ ok: true, files, versions, pinned, bytes, oldest }: all history, or one file' }),
  [CH.HISTORY_FILES]: Object.freeze({ input: noPayload, output: '{ ok: true, files: [{ path, versions, last }] }: saved files that have history (path is the normalised history key)' }),
  [CH.HISTORY_SNAPSHOT]: Object.freeze({ input: histSnap, output: '{ ok: true, skipped, id? }: identical content is not stored twice; Autosave snapshots are kept only on a meaningful time or size change' }),
  [CH.RECENTS_LIST]: Object.freeze({ input: noPayload, output: RECENTS_OUT }),
  [CH.RECENTS_PIN]: Object.freeze({ input: pathInput, output: RECENTS_OUT }),
  [CH.RECENTS_UNPIN]: Object.freeze({ input: pathInput, output: RECENTS_OUT }),
  [CH.RECENTS_REMOVE]: Object.freeze({ input: pathInput, output: RECENTS_OUT }),
  [CH.RECENTS_CLEAR]: Object.freeze({ input: noPayload, output: `${RECENTS_OUT}; pinned entries are kept` }),
  [CH.WORKSPACE_OPEN]: Object.freeze({
    input: (p) => (p == null || (isObj(p) && (p.path === undefined || absStr(p.path))) ? null : 'expects { path?: absolute folder }'),
    output: `{ ok: true, canceled: true } or { ok: true, canceled: false, workspace: { id, root, name, assetRoot } } ${DOC_ERR}: no path opens the native folder dialog; replaces the window's active workspace, registers the root as loto-asset root \`assetRoot\` and in workspaces.json`,
  }),
  [CH.WORKSPACE_CLOSE]: Object.freeze({ input: noPayload, output: '{ ok: true }: closes the window\'s active workspace and its watcher' }),
  [CH.WORKSPACE_LIST]: Object.freeze({ input: noPayload, output: '{ items: [{ id, root, name, lastOpened }] }: every remembered workspace, newest first' }),
  [CH.WORKSPACE_REMOVE]: Object.freeze({ input: (p) => (isObj(p) && absStr(p.root) ? null : 'expects { root: absolute folder }'), output: '{ items: [{ id, root, name, lastOpened }] }: the remembered workspaces after removing `root` from the list (the folder is untouched)' }),
  [CH.WORKSPACE_LIST_FILES]: Object.freeze({
    input: (p) => (p == null || (isObj(p) && (p.showHidden === undefined || typeof p.showHidden === 'boolean') && (p.refresh === undefined || typeof p.refresh === 'boolean')) ? null : 'expects { showHidden?: boolean, refresh?: boolean }'),
    output: `{ ok: true, root, files: [relative path with /], truncated } ${DOC_ERR}: every file of the active workspace (breadth first, max 20000, depth 16; ignored names never listed, symlinks not followed); cached 15 s unless refresh`,
  }),
  [CH.WORKSPACE_INDEX]: Object.freeze({
    input: (p) => {
      if (!isObj(p) || !['status', 'files', 'headings', 'backlinks', 'tags', 'rebuild', 'cancel', 'integrity', 'broken', 'missing-files', 'unused-assets', 'orphaned-assets', 'external-links', 'check-url'].includes(p.op)) return 'expects { op: status|files|headings|backlinks|tags|rebuild|cancel|integrity|broken|missing-files|unused-assets|orphaned-assets|external-links|check-url, path?, url? }';
      const rel = (s) => typeof s === 'string' && s.length > 0 && s.length <= 4096 && !s.includes('\0') && !/^([a-zA-Z]:|[\\/])/.test(s) && !s.split(/[\\/]/).includes('..');
      if (p.op === 'backlinks') return rel(p.path) ? null : 'backlinks expects { path: workspace-relative file }';
      if (p.op === 'check-url') return typeof p.url === 'string' && p.url.length > 0 && p.url.length <= 2048 ? null : 'check-url expects { url: string }';
      return p.path === undefined || (p.op === 'headings' && rel(p.path)) ? null : 'path must be a workspace-relative file (headings, backlinks only)';
    },
    output: `{ ok: true, ... } ${DOC_ERR}: queries the active workspace index; status -> { status: { state: idle|indexing|ready|canceled|error, requestId, phase, done, total, files, built, truncated, cached, error, skipped: [{ path, size }] } }; files -> { files: [{ path, size, mtimeMs }], truncated }; headings -> { files: [{ path, headings: [{ level, text, line }] }], truncated? } (one file with path, max 5000 rows otherwise); backlinks -> { path, seeds: [{ from, line, kind: link|wiki, target, anchor }] }; tags -> { tags: [{ tag, count }] }; rebuild and cancel -> { status }; integrity -> { brokenLinks, missingFiles, unusedAttachments, orphanedAssets, externalLinks }; check-url -> { ok, status, statusText }. Paths are relative with /; content of files over 10 MB is never scanned and appears in status.skipped`,
  }),
  [CH.SEARCH_START]: Object.freeze({
    input: (p) => {
      const list = (a) => a === undefined || (Array.isArray(a) && a.length <= 20 && a.every((s) => typeof s === 'string' && s.length > 0 && s.length <= 200 && !s.includes('\0')));
      const bool = (b) => b === undefined || typeof b === 'boolean';
      return isObj(p) && typeof p.query === 'string' && p.query.length > 0 && p.query.length <= 1000
        && (p.scopes === undefined || (Array.isArray(p.scopes) && p.scopes.length > 0 && p.scopes.every((s) => ['content', 'filenames', 'frontmatter', 'code'].includes(s))))
        && bool(p.caseSensitive) && bool(p.wholeWord) && bool(p.regex) && list(p.include) && list(p.exclude) && (p.max === undefined || (Number.isInteger(p.max) && p.max >= 1 && p.max <= 5000))
        ? null : 'expects { query, scopes?: content|filenames|frontmatter|code[], caseSensitive?, wholeWord?, regex?, include?: glob[], exclude?: glob[], max?: 1-5000 }';
    },
    output: `{ ok: true, id } ${DOC_ERR}: searches the active workspace in a worker; a new search cancels the running one; results stream as search:results events. Scopes (default content) are disjoint: content = body text outside frontmatter and fenced code, frontmatter, code = fenced code blocks, filenames = file names (any file type). Globs (* ** ?) match relative paths; a name without / matches at any depth; folders match as prefixes; hidden and ignored names are skipped. Content of files over 10 MB is not searched`,
  }),
  [CH.SEARCH_CANCEL]: Object.freeze({ input: noPayload, output: '{ ok: true }: cancels the running search of the window (it then receives { id, done: true, canceled: true })' }),
  [CH.TX_PREVIEW]: Object.freeze({
    input: (p) => (isObj(p) && Array.isArray(p.ops) && p.ops.length >= 1 && p.ops.length <= 500 && (p.label === undefined || (typeof p.label === 'string' && p.label.length <= 120))
      && p.ops.every((o) => isObj(o) && ['write', 'create', 'delete', 'rename'].includes(o.op) && absStr(o.path) && (o.op === 'rename' ? absStr(o.newPath) : o.op === 'delete' ? o.text === undefined : typeof o.text === 'string'))
      ? null : 'expects { ops: [{ op: write|create|delete|rename, path: absolute, newPath?: absolute, text? }] (1-500), label?: string }'),
    output: `{ ok: true, id, entries: [{ op, path, before, after }] } or { ok: false, error: { code: E_PATH|E_NOENT|E_NOTFILE|E_EXISTS|E_BINARY|E_TOOBIG|E_IO, message } }: journals the plan and backups in userData/transactions/<id>; writes nothing to the workspace; paths must be inside the active workspace`,
  }),
  [CH.TX_APPLY]: Object.freeze({
    input: (p) => (isObj(p) && typeof p.id === 'string' && /^[a-z0-9]+-[0-9a-f]{8}$/.test(p.id) ? null : 'expects { id }'),
    output: '{ ok: true, id, status, results: [{ op, path, status: applied|skipped|failed, reason?: changed, error? }] } or { ok: false, error }: atomic writes; files changed since the preview are skipped and reported; E_CONFLICT if already applied',
  }),
  [CH.TX_UNDO]: Object.freeze({
    input: (p) => (isObj(p) && typeof p.id === 'string' && /^[a-z0-9]+-[0-9a-f]{8}$/.test(p.id) ? null : 'expects { id }'),
    output: '{ ok: true, id, status, results: [{ op, path, status: restored|skipped|failed, reason?: changed, error? }] } or { ok: false, error }: restores only files still matching the post-apply hash; E_CONFLICT if nothing to undo',
  }),
  [CH.TX_LIST]: Object.freeze({ input: noPayload, output: '{ ok: true, items: [{ id, label, createdAt, status: previewed|applying|applied|undone|skipped, bytes, count }] }: transactions of the active workspace, newest first' }),
  [CH.WORKSPACE_RECENT]: Object.freeze({ input: noPayload, output: '{ items: [{ id, root, name, lastOpened }] }: the 10 most recently opened workspaces' }),
  [CH.FS_LIST_DIR]: Object.freeze({
    input: (p) => (isObj(p) && absStr(p.path) && (p.showHidden === undefined || typeof p.showHidden === 'boolean') && (p.sort === undefined || ['name', 'modified', 'type'].includes(p.sort)) && (p.foldersFirst === undefined || typeof p.foldersFirst === 'boolean')
      ? null : 'expects { path: absolute folder, showHidden?: boolean, sort?: name|modified|type, foldersFirst?: boolean }'),
    output: `{ ok: true, entries: [{ name, path, dir, icon: folder|markdown|image|pdf|media|data|file, size, mtimeMs, hidden, symlink, expandable }], truncated } ${DOC_ERR}: one level inside the active workspace; .git, node_modules and OS junk are never listed`,
  }),
  [CH.FS_CREATE_FILE]: Object.freeze({ input: dirNameInput, output: `{ ok: true, path } ${FS_OPS_ERR}: creates an empty file in a workspace folder; a taken name gets a " (2)" suffix` }),
  [CH.FS_CREATE_FOLDER]: Object.freeze({ input: dirNameInput, output: `{ ok: true, path } ${FS_OPS_ERR}: creates a folder in a workspace folder; a taken name gets a " (2)" suffix` }),
  [CH.FS_RENAME]: Object.freeze({ input: renameInput, output: `{ ok: true, path } ${FS_OPS_ERR}: renames a file or folder inside its folder, never overwrites` }),
  [CH.FS_MOVE]: Object.freeze({ input: destInput, output: `${FS_MULTI}; without toDir a native folder dialog picks the target (canceled: true if dismissed); cross-device moves are verified copy + delete` }),
  [CH.FS_COPY]: Object.freeze({ input: destInput, output: `${FS_MULTI}; without toDir a native folder dialog picks the target` }),
  [CH.FS_DELETE]: Object.freeze({ input: pathsInput, output: `{ ok: true, canceled, results: [{ from, error? }] } ${FS_OPS_ERR}: moves items to the OS trash after confirmation unless explorer.confirmDelete is off` }),
  [CH.IMAGE_PICK]: Object.freeze({ input: imgPick, output: `{ ok: true, canceled: true } or { ok: true, canceled: false, path, name, size, image, preview } ${IMG_ERR}: native file dialog (or describes \`path\`); preview is a loto-asset URL for images up to 20 MB` }),
  [CH.IMAGE_SAVE]: Object.freeze({ input: imgSave, output: `{ ok: true, path, name } ${IMG_ERR}: writes pasted image bytes as image-<timestamp>.<ext> into the document's asset folder or an existing \`destDir\`; never overwrites` }),
  [CH.IMAGE_LIST]: Object.freeze({ input: imgList, output: `{ ok: true, items: [{ path, name, exists, size, mtime, type: image|audio|video|pdf|<ext>, thumb }] } ${IMG_ERR}: stats the files and lists the plain files of the folders (no recursion, no dotfiles, 300 per folder); image thumb is a loto-asset URL` }),
  [CH.IMAGE_PICK_DIR]: Object.freeze({ input: imgDir, output: `{ ok: true, canceled: true } or { ok: true, canceled: false, path } ${IMG_ERR}: native folder dialog` }),
  [CH.IMAGE_COPY]: Object.freeze({ input: imgCopy, output: `{ ok: true, path, name } ${IMG_ERR}: copies into the document's asset folder (relative \`dir\`, {doc} = document name, no absolute or .. paths) or an existing \`destDir\`; collision-safe names, never overwrites` }),
  [CH.SPELL_LANGUAGES]: Object.freeze({ input: noPayload, output: '{ available: [code], current: [code] }: spellchecker languages of the platform (empty on macOS, which uses the system checker) and the active ones; also starts forwarding misspelling context menus as spell:context' }),
  [CH.SPELL_SET_LANGUAGE]: Object.freeze({ input: spellLang, output: '{ applied }: makes the language the only spellchecker language; false when the platform does not offer it' }),
  [CH.SPELL_ADD_WORD]: Object.freeze({ input: spellWord, output: '{ done }: adds the word to the custom dictionary' }),
  [CH.SPELL_REMOVE_WORD]: Object.freeze({ input: spellWord, output: '{ done }: removes the word from the custom dictionary' }),
  [CH.SPELL_WORDS]: Object.freeze({ input: noPayload, output: '{ words: [string] }: the custom dictionary' }),
  [CH.GRAMMAR_CHECK]: Object.freeze({ input: grammarIn, output: '{ ok: true, matches: [{ offset, length, message, rule, type, replacements }] } or { ok: false, error: { code: E_OFF|E_URL|E_SIZE|E_HTTP|E_TIMEOUT|E_CANCEL|E_DATA|E_NET, message } }: the only channel that sends text over the network; POSTs it to the grammar.url endpoint read from settings in main, only while grammar.enabled; one request per window, 8 s timeout, 1 MB response cap, 200 matches' }),
  [CH.GRAMMAR_CANCEL]: Object.freeze({ input: noPayload, output: '{ done }: aborts the window\'s running grammar request' }),
  [CH.PDF_EXPORT]: Object.freeze({ input: pdfExport, output: '{ ok: true, canceled: true } | { ok: true, path, pages, fonts: [family], outline: native|pdf-lib|none }: native Save dialog first (skipped when dir from pdf:pickDir is given: saved there under a free name), then a hidden sandboxed window paginates with Paged.js and prints; progress as pdf:progress; temp files are removed on success, failure and cancel; or { ok: false, error: { code, message } }' }),
  [CH.PDF_CANCEL]: Object.freeze({ input: pdfCancel, output: '{ ok: true }: aborts the export job of that id (no file is left behind)' }),
  [CH.PDF_PICK_DIR]: Object.freeze({ input: noPayload, output: '{ ok: true, canceled: true } | { ok: true, dir }: native folder picker; the folder becomes a valid pdf:export dir for this window' }),
  [CH.PDF_ASSET]: Object.freeze({ input: pdfAsset, output: '{ ok: true, mime, data: base64 } or { ok: false, error: { code: E_PATH|E_TOOBIG|E_IO, message } }: one image inside baseDir or the active workspace, 25 MB max, for inlining into a publication' }),
  [CH.PDF_PRINT]: Object.freeze({ input: pdfPrint, output: '{ ok: true } | { ok: true, canceled: true } | { ok: false, error: { code, message } }: opens a hidden window that paginates the HTML with Paged.js, then calls webContents.print to send it to the OS print dialog; temp files removed afterwards' }),
  [CH.PANDOC_DETECT]: Object.freeze({ input: noPayload, output: '{ ok: true, found, status: ready|too-old|broken|invalid-path|not-found, path, source: setting|auto, version, supported, minVersion, capabilities: { sandbox, input, output, key } | null, message }: finds Pandoc from integrations.pandocPath or PATH and common folders, then runs --version and format and sandbox probes (execFile, no shell, 10 s each)' }),
  [CH.PANDOC_TEST]: Object.freeze({ input: pandocJob, output: '{ ok: true, passed, message, ms, info } or { ok: false, error: { code, message } }: detects again, then converts a fixed Markdown sample to HTML through stdin and checks the result; cancelable with pandoc:cancel; time limit from integrations.pandocTimeout' }),
  [CH.PANDOC_EXPORT_RTF]: Object.freeze({ input: docxExport, output: '{ ok: true, canceled: true } | { ok: true, path, size, pandocVersion, messages: [string] }: native Save dialog first, then Pandoc (no shell, no filters, network blocked) converts the normalised Markdown to RTF; temp files removed on success, failure and cancel; cancelable with pandoc:cancel; or { ok: false, error: { code: E_PANDOC|E_ARGS, message } }' }),
  [CH.EXPORT_WRITE]: Object.freeze({ input: exportWrite, output: '{ ok: true, canceled: true } | { ok: true, path, size, files }: Save dialog (file, zip) or folder dialog (folder) first; entry names are relative and checked in main; existing files are only replaced after the OS confirmation, package folders get a free name; or { ok: false, error: { code: E_TOOBIG|E_ARGS|E_PATH|E_IO, message } }' }),
  [CH.EXPORT_EXISTS]: Object.freeze({ input: exportExists, output: '{ ok: true, exists: [names] }: which of the relative names already exist under a folder chosen with pdf:pickDir; E_PATH for other folders' }),
  [CH.EXPORT_TREE]: Object.freeze({ input: exportTree, output: '{ ok: true, path, files, size } : writes the entries under a pdf:pickDir folder; a name that already exists is replaced only when listed in overwrite, otherwise nothing is written and E_EXISTS names the file; or { ok: false, error: { code: E_TOOBIG|E_PATH|E_EXISTS|E_ARGS|E_IO, message } }' }),
  [CH.MIGRATION_PICK]: Object.freeze({ input: migrationPick, output: '{ ok: true, canceled: true } | { ok: true, path, kind: folder|zip, name }: native folder or ZIP dialog; only a source chosen here can be scanned by this window' }),
  [CH.MIGRATION_SCAN]: Object.freeze({ input: migrationScan, output: "{ ok: true, canceled: true } | { ok: true, id, report }: read-only scan in a worker (ZIP is extracted to a temp folder with zip-slip, size and entry limits; links and the source are never followed or modified; .obsidian is read as data only and plugins are never run); report = { source: { name, fromZip, kinds }, totals, attachmentTypes, links, externalHosts, frontmatter, wikiDocuments, callouts, embeds, unsupported, broken, brokenTotal, unreferenced, unreferencedTotal, obsidian, skipped, warnings }; progress as migration:progress; or { ok: false, error: { code: E_PATH|E_NOENT|E_NOTFILE|E_IO, message } }" }),
  [CH.MIGRATION_CANCEL]: Object.freeze({ input: noPayload, output: '{ ok: true }: stops the window\'s running scan (its migration:scan call resolves with canceled: true) and removes the temp folder' }),
  [CH.MIGRATION_PICK_DEST]: Object.freeze({ input: migrationDest, output: '{ ok: true, canceled: true } | { ok: true, path, name, empty }: native folder dialog (with Create Folder); only a destination chosen here can receive a copy from this window' }),
  [CH.MIGRATION_COPY]: Object.freeze({ input: migrationCopy, output: "{ ok: true, canceled: true } | { ok: true, root, name, copied, skipped, bytes, logFile, logTotal, log: [{ op, path, reason? }], tx: null | { ids, files, links, skipped, samples } }: copies documents and attachments with relative paths into a new subfolder of dest (mode copy) or into the empty dest (mode new, which also writes .laurevine/workspace.json and registers it); never overwrites, never writes to the source, ZIPs with unsafe entry names are rejected whole (E_PATH); convert journals wiki-link conversion as an unapplied transaction on the copy only; cancel with migration:cancel", }),
  [CH.MIGRATION_CONVERT]: Object.freeze({ input: migrationRoot, output: '{ ok: true, done, skipped, failed }: applies the journaled conversion transaction(s) of a copy made in this window; files changed since the preview are skipped' }),
  [CH.MIGRATION_REVERT]: Object.freeze({ input: migrationRoot, output: '{ ok: true, done, skipped, failed }: restores the files of the applied conversion that still match the post-apply hash' }),
  [CH.PANDOC_EXPORT_DOCX]: Object.freeze({ input: docxExport, output: '{ ok: true, canceled: true } | { ok: true, path, size, reference: generated|default, pandocVersion, messages: [string] }: native Save dialog first, then Pandoc (no shell, no filters, network blocked) converts the normalised Markdown with an optional reference document built from the style spec; temp files removed on success, failure and cancel; cancelable with pandoc:cancel; or { ok: false, error: { code: E_PANDOC|E_ARGS, message } }' }),
  [CH.PANDOC_CANCEL]: Object.freeze({ input: pandocJob, output: '{ ok: true, canceled }: stops the running Pandoc job of that id in this window' }),
  [CH.FS_DUPLICATE]: Object.freeze({ input: pathInput, output: `{ ok: true, path } ${FS_OPS_ERR}: copies next to the original as "name copy"` }),
});

// Main-to-renderer push events: name -> { output }.
export const EVENT_CHANNELS = Object.freeze({
  [CH.SETTINGS_CHANGED]: Object.freeze({ output: '{ values }: only the settings whose effective value changed' }),
  [CH.WINDOW_MAXIMIZED_CHANGED]: Object.freeze({ output: '{ maximized: boolean }: the window was maximized, restored or changed full screen' }),
  [CH.WINDOW_CLOSE_REQUESTED]: Object.freeze({ output: 'no payload: the user tried to close the window; the renderer answers with window:close or stays open' }),
  [CH.WORKSPACE_INDEX_PROGRESS]: Object.freeze({ output: '{ requestId, state, phase: walk|scan|"", done, total, files }: throttled to about 10 per second while the active workspace is indexed' }),
  [CH.SEARCH_RESULTS]: Object.freeze({ output: '{ id, items: [{ path, scope, line (0 for filenames), col, len, text (window of the line), from, to (inside text) }] } batches while searching, then { id, done: true, total, files, truncated, notice?, error?, canceled? }; at most 5000 results (truncated with a notice); an invalid regex ends with error' }),
  [CH.SPELL_CONTEXT]: Object.freeze({ output: '{ word, suggestions: [string] }: the user right-clicked a misspelled word (Chromium suggestions, at most 6)' }),
  [CH.PDF_PROGRESS]: Object.freeze({ output: '{ id, phase: prepare|fonts|paginate|print|outline|save, pct }: progress of a pdf:export job' }),
  [CH.DOC_CHANGED]: Object.freeze({ output: '{ id, type: modified|renamed|deleted|unreadable|restored, path, hash?, from?, to?, attempt? }: external change of a watched open document' }),
  [CH.FS_TREE_CHANGE]: Object.freeze({ output: '{ root, dirs: [absolute folder] }: debounced; the folders of the active workspace whose listing changed' }),
  [CH.APP_OPEN_PATH]: Object.freeze({ output: '{ paths: [string] }: opens documents requested by OS file association or second instance' }),
  [CH.MIGRATION_PROGRESS]: Object.freeze({ output: '{ id, files, documents, bytes }: progress of a migration:scan; { phase: copy, done, total, bytes } during migration:copy' }),
});

