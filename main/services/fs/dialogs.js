import { BrowserWindow, dialog } from 'electron';

const FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
  { name: 'Text', extensions: ['txt', 'text'] },
  { name: 'All Files', extensions: ['*'] },
];

const parent = (event) => (event?.sender ? BrowserWindow.fromWebContents(event.sender) : null);

export async function pickOpen(event, { defaultPath } = {}) {
  const win = parent(event);
  const opts = { title: 'Open', defaultPath, filters: FILTERS, properties: ['openFile', 'multiSelections'] };
  const r = await (win ? dialog.showOpenDialog(win, opts) : dialog.showOpenDialog(opts));
  return r.canceled ? [] : r.filePaths;
}

export async function pickSave(event, { defaultPath, title = 'Save As' } = {}) {
  const win = parent(event);
  const opts = { title, defaultPath, filters: FILTERS, properties: ['showOverwriteConfirmation'] };
  const r = await (win ? dialog.showSaveDialog(win, opts) : dialog.showSaveDialog(opts));
  return r.canceled || !r.filePath ? null : r.filePath;
}
