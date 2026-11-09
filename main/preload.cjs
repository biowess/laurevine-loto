'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Sandboxed preloads cannot import ES modules: these lists mirror shared/channels.js.
// tools/check.mjs fails the build when they differ.
const INVOKE_CHANNELS = ['app:info', 'app:notices', 'settings:getAll', 'settings:set', 'settings:reset', 'window:setTheme', 'window:toggleMaximize', 'window:minimize', 'window:requestClose', 'window:isMaximized', 'window:setFullScreen', 'window:armCloseGuard', 'window:close', 'window:setZoom', 'privacy:clear', 'assets:authorizeRoot', 'clipboard:writeText', 'clipboard:writeRich', 'clipboard:readText', 'clipboard:readImage', 'clipboard:readHtml', 'doc:open', 'doc:openDialog', 'doc:save', 'doc:saveAs', 'doc:saveCopy', 'doc:stat', 'doc:reveal', 'doc:openExternal', 'doc:rename', 'templates:list', 'templates:save', 'templates:update', 'templates:duplicate', 'templates:delete', 'templates:import', 'templates:export', 'palettes:list', 'palettes:save', 'palettes:update', 'palettes:duplicate', 'palettes:delete', 'palettes:import', 'palettes:export', 'presets:list', 'presets:save', 'presets:update', 'presets:duplicate', 'presets:delete', 'presets:import', 'presets:export', 'presets:exportBundle', 'snippets:list', 'snippets:save', 'snippets:update', 'snippets:duplicate', 'snippets:delete', 'snippets:import', 'snippets:export', 'recovery:list', 'recovery:read', 'recovery:put', 'session:get', 'doc:watch', 'doc:unwatch', 'session:set', 'recovery:drop', 'history:list', 'history:read', 'history:restore', 'history:pin', 'history:delete', 'history:stats', 'history:files', 'history:snapshot', 'recents:list', 'recents:pin', 'recents:unpin', 'recents:remove', 'recents:clear', 'workspace:open', 'workspace:close', 'workspace:list', 'workspace:remove', 'workspace:listFiles', 'workspace:index', 'search:start', 'search:cancel', 'tx:preview', 'tx:apply', 'tx:undo', 'tx:list', 'workspace:recent', 'fs:listDir', 'fs:createFile', 'fs:createFolder', 'fs:rename', 'fs:move', 'fs:copy', 'fs:delete', 'image:pick', 'image:save', 'image:list', 'image:pickDir', 'image:copy', 'spell:languages', 'spell:setLanguage', 'spell:addWord', 'spell:removeWord', 'spell:words', 'grammar:check', 'grammar:cancel', 'pdf:export', 'pdf:cancel', 'pdf:pickDir', 'pdf:asset', 'pdf:print', 'pandoc:detect', 'pandoc:test', 'pandoc:exportRtf', 'export:write', 'export:exists', 'export:tree', 'migration:pick', 'migration:scan', 'migration:cancel', 'migration:pickDest', 'migration:copy', 'migration:convert', 'migration:revert', 'pandoc:exportDocx', 'pandoc:cancel', 'fs:duplicate'];
const EVENT_CHANNELS = ['settings:changed', 'window:closeRequested', 'window:maximizedChanged', 'workspace:indexProgress', 'search:results', 'spell:context', 'pdf:progress', 'doc:changed', 'fs:treeChange', 'app:openPath', 'migration:progress'];

const invoke = (channel, payload) => (INVOKE_CHANNELS.includes(channel)
  ? ipcRenderer.invoke(channel, payload)
  : Promise.reject(new Error(`IPC channel not allowed: ${String(channel)}`)));

const on = (channel, listener) => {
  if (!EVENT_CHANNELS.includes(channel)) throw new Error(`IPC event not allowed: ${String(channel)}`);
  if (typeof listener !== 'function') throw new TypeError('listener must be a function');
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

const pathForFile = (f) => { try { return webUtils.getPathForFile(f) || ''; } catch { return ''; } };

contextBridge.exposeInMainWorld('loto', Object.freeze({ invoke, on, pathForFile }));
