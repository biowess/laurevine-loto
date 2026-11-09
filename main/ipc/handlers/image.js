import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { run } from './reply.js';
import { authorizeRoot } from '../../app/asset-protocol.js';
import { copyAsset, describeFile } from '../../services/fs/asset-copy.js';
import { saveImage } from '../../services/fs/asset-save.js';
import { listAssets } from '../../services/fs/asset-list.js';

const IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'];
const MEDIA = { audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'], video: ['mp4', 'webm', 'mov', 'ogv'] };
const show = (event, opts) => {
  const w = event?.sender ? BrowserWindow.fromWebContents(event.sender) : null;
  return w ? dialog.showOpenDialog(w, opts) : dialog.showOpenDialog(opts);
};

export const pick = ({ kind = 'image', defaultPath, path: given, media } = {}, event) => run(async () => {
  let file = given;
  if (!file) {
    const filters = kind === 'image' ? [{ name: 'Images', extensions: IMG }, { name: 'All Files', extensions: ['*'] }] : [...(media ? [{ name: media === 'audio' ? 'Audio' : 'Video', extensions: MEDIA[media] }] : []), { name: 'All Files', extensions: ['*'] }];
    const r = await show(event, { title: kind === 'image' ? 'Insert Image' : 'Insert Local Asset', defaultPath, filters, properties: ['openFile'] });
    if (r.canceled || !r.filePaths[0]) return { canceled: true };
    file = r.filePaths[0];
  }
  const f = await describeFile(file, kind);
  const preview = f.image && f.size <= 20 * 1024 * 1024 && await authorizeRoot('imgpick', path.dirname(f.path))
    ? `loto-asset://imgpick/${encodeURIComponent(f.name)}` : '';
  return { canceled: false, path: f.path, name: f.name, size: f.size, image: f.image, preview };
});

export const pickDir = ({ defaultPath } = {}, event) => run(async () => {
  const r = await show(event, { title: 'Choose Attachment Folder', defaultPath, properties: ['openDirectory', 'createDirectory'] });
  return r.canceled || !r.filePaths[0] ? { canceled: true } : { canceled: false, path: r.filePaths[0] };
});

export const copy = (payload) => run(() => copyAsset(payload));
export const save = (payload) => run(() => saveImage(payload));
export const list = (payload) => run(() => listAssets(payload));
