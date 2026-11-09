import { app } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const pendingFiles = [];

export function addPendingFiles(paths) {
  if (Array.isArray(paths)) {
    for (const p of paths) if (typeof p === 'string' && !pendingFiles.includes(p)) pendingFiles.push(p);
  } else if (typeof paths === 'string' && !pendingFiles.includes(paths)) {
    pendingFiles.push(paths);
  }
}

export function getAppInfo() {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    userData: app.getPath('userData'),
    pendingFiles: pendingFiles.splice(0),
  };
}


const DOCS = { notices: 'THIRD_PARTY_NOTICES.md', license: 'LICENSE.txt', trademark: 'TRADEMARK.md' };

export async function getNotices(payload) {
  return { text: await readFile(path.join(app.getAppPath(), DOCS[payload?.doc] || DOCS.notices), 'utf8') };
}
