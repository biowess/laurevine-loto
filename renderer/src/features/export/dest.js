import { getSetting } from '../../services/settings-client.js';

export const results = new Map();

export function destDir(baseDir) {
  const mode = getSetting('export.destination');
  return mode === 'same' ? baseDir || '' : mode === 'custom' ? getSetting('export.destinationDir') || '' : '';
}

export function stemFor(d, meta = {}) {
  const pat = getSetting('export.filenamePattern') || '{title}', base = d.name.replace(/\.[^.]+$/, '');
  return pat.replace(/\{title\}/g, meta.title || base).replace(/\{doc\}/g, base).replace(/\{author\}/g, meta.author || '').replace(/\{date\}/g, new Date().toISOString().slice(0, 10));
}
