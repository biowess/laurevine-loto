// Bootstrap only: wires the single-purpose modules together.
import { app, BrowserWindow } from 'electron';
import { APP_ID } from '../shared/constants.js';
import { registerAppProtocol, registerPrivilegedSchemes } from './app/protocol.js';
import { applySecurityPolicy } from './app/security.js';
import { registerAssetProtocol } from './app/asset-protocol.js';
import { installMenu } from './app/menu.js';
import { createMainWindow, focusMainWindow, getMainWindow } from './app/window-manager.js';
import { openSplash } from './app/splash.js';
import { registerIpc } from './ipc/registry.js';
import { initSettings } from './services/settings/index.js';
import { initWindowState } from './app/window-state.js';
import { initTheme } from './services/theme.js';
import { initRecovery } from './services/recovery/index.js';

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { CH } from '../shared/channels.js';
import { addPendingFiles } from './services/app-info.js';

const dev = process.argv.includes('--dev');

function parseArgsFiles(argv, cwd = process.cwd()) {
  const files = [];
  const args = (argv || []).slice(app.isPackaged ? 1 : 2);
  for (const arg of args) {
    if (!arg || arg.startsWith('-')) continue;
    const resolved = path.isAbsolute(arg) ? path.normalize(arg) : path.resolve(cwd, arg);
    try {
      if (existsSync(resolved) && statSync(resolved).isFile()) files.push(resolved);
    } catch {}
  }
  return files;
}

function dispatchFiles(files) {
  if (!files || !files.length) return;
  const win = getMainWindow();
  if (win && win.webContents && !win.webContents.isLoading()) {
    win.webContents.send(CH.APP_OPEN_PATH, { paths: files });
  } else {
    addPendingFiles(files);
  }
}

registerPrivilegedSchemes();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);
  app.on('second-instance', (_event, argv, cwd) => {
    focusMainWindow();
    const files = parseArgsFiles(argv, cwd);
    if (files.length) dispatchFiles(files);
  });
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    dispatchFiles([filePath]);
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow({ dev });
  });

  app.whenReady()
    .then(async () => {
      const splash = await openSplash();
      addPendingFiles(parseArgsFiles(process.argv));
      await initSettings();
      await initWindowState();
      await initRecovery();
      initTheme();
      registerAppProtocol();
      registerAssetProtocol();
      registerIpc();
      applySecurityPolicy();
      installMenu({ dev });
      createMainWindow({ dev, splash });
    })
    .catch((err) => {
      console.error('[main] startup failed:', err);
      app.quit();
    });
}
