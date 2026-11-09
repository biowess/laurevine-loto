// Pure: portable relative paths (forward slashes, URL-encoded) and image/link Markdown.
const posix = (p) => String(p).replace(/\\/g, '/');
const DRIVE = /^[a-zA-Z]:\//;
const segs = (p) => posix(p).split('/').filter((s) => s && s !== '.');
const enc = (s) => encodeURIComponent(s).replace(/[()!'*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
export const mediaKind = (name) => (/\.(mp3|wav|ogg|m4a|flac)$/i.test(name) ? 'audio' : /\.(mp4|webm|mov|ogv)$/i.test(name) ? 'video' : null);

// Relative path from a folder to a file (null across Windows drives).
export function relPath(fromDir, to) {
  const a = posix(fromDir), b = posix(to), w = DRIVE.test(a) || DRIVE.test(b);
  if (w && (!DRIVE.test(a) || !DRIVE.test(b) || a[0].toLowerCase() !== b[0].toLowerCase())) return null;
  const x = segs(a), y = segs(b), eq = (m, n) => (w ? m.toLowerCase() === n.toLowerCase() : m === n);
  let i = 0;
  while (i < x.length && i < y.length - 1 && eq(x[i], y[i])) i++;
  return [...Array(x.length - i).fill('..'), ...y.slice(i)].join('/');
}

export const encodePath = (rel) => rel.split('/').map((s) => (s === '..' || s === '.' ? s : enc(s))).join('/');

export function fileUrl(abs) {
  const s = posix(abs);
  return `file://${s.startsWith('/') ? '' : '/'}${s.split('/').map((x, i) => (i === 0 && /^[a-zA-Z]:$/.test(x) ? x : enc(x))).join('/')}`;
}

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Sanitiser-safe <audio>/<video> player with a relative src.
export const mediaHtml = (tag, url, label = '', title = '') => `<${tag} controls preload="metadata" src="${attr(url)}"${title.trim() ? ` title="${attr(title.trim())}"` : ''}>${attr(label)}</${tag}>`;

// kind 'link' makes [label](url); a width makes an <img> (Markdown has no size syntax).
export function imageMd({ alt = '', url, title = '', width = 0, kind = 'image' }) {
  const t = String(title).trim().replace(/\r?\n/g, ' '), a = String(alt).replace(/\r?\n/g, ' ');
  if (kind === 'link') return `[${a.replace(/([\\[\]])/g, '\\$1')}](${url}${t ? ` "${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : ''})`;
  if (width > 0) return `<img src="${attr(url)}" alt="${attr(a)}"${t ? ` title="${attr(t)}"` : ''} width="${Math.round(width)}">`;
  return `![${a.replace(/([\\[\]])/g, '\\$1')}](${url}${t ? ` "${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : ''})`;
}
