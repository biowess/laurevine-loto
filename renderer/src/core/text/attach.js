// Pure: local media/asset references in Markdown, their absolute paths, usage counts and image-node edits.
import { imageMd, encodePath, relPath } from './image-link.js';

const MD = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*(<[^>\n]*>|[^)\s]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\)/g;
const TAG = /<(img|audio|video|source)\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
const un = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const attrOf = (tag, n) => { const m = new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag); return m ? un(m[1] ?? m[2]) : ''; };
const WIN = /^[a-zA-Z]:[\\/]/;
export const isLocal = (u) => !!u && (WIN.test(u) || /^file:/i.test(u) || !/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(u));
const ASSET = /\.(png|jpe?g|gif|webp|avif|bmp|svg|mp3|wav|ogg|m4a|flac|mp4|webm|mov|ogv|pdf|zip|docx?|xlsx?|pptx?|csv|txt)$/i;

// References: { kind: 'md'|'html', image, from, to, url, alt, title, width }. Remote and anchor URLs are skipped.
export function refs(text) {
  const out = [];
  for (const m of text.matchAll(MD)) {
    const url = m[3].replace(/^<|>$/g, '');
    if (isLocal(url) && (m[1] || ASSET.test(url.replace(/[?#].*$/, '')))) out.push({ kind: 'md', image: !!m[1], from: m.index, to: m.index + m[0].length, url, alt: m[2].replace(/\\([\\[\]])/g, '$1'), title: (m[4] || '').replace(/\\(["\\])/g, '$1'), width: 0 });
  }
  for (const m of text.matchAll(TAG)) {
    const url = un(m[2] ?? m[3]);
    if (isLocal(url)) out.push({ kind: 'html', image: m[1].toLowerCase() === 'img', from: m.index, to: m.index + m[0].length, url, alt: attrOf(m[0], 'alt'), title: attrOf(m[0], 'title'), width: parseInt(attrOf(m[0], 'width'), 10) || 0 });
  }
  return out.sort((a, b) => a.from - b.from);
}

export const imageAt = (text, pos) => refs(text).find((r) => r.image && r.from <= pos && pos <= r.to) || null;

const posix = (p) => p.replace(/\\/g, '/');
function norm(p) {
  const lead = /^\//.test(p) ? '/' : '', out = [];
  for (const s of p.split('/')) { if (s === '..') { if (out.length && !/^[a-zA-Z]:$/.test(out[out.length - 1])) out.pop(); } else if (s && s !== '.') out.push(s); }
  return lead + out.join('/');
}

// Absolute path (forward slashes) a document in `dir` means by `url`.
export function resolveUrl(dir, url) {
  let u = String(url).trim().replace(/[?#].*$/, '').replace(/^file:\/\/\/?(?=[a-zA-Z]:)/i, '').replace(/^file:\/\//i, '');
  try { u = decodeURIComponent(u); } catch { /* keep raw */ }
  u = posix(u);
  return norm(/^\/|^[a-zA-Z]:\//.test(u) ? u : `${posix(dir)}/${u}`);
}

export const pathKey = (p) => { const s = norm(posix(p)); return WIN.test(s) ? s.toLowerCase() : s; };

// Map of pathKey -> number of references in `text` for a document in `dir`.
export function usage(text, dir) {
  const m = new Map();
  for (const r of refs(text)) { const k = pathKey(resolveUrl(dir, r.url)); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

export const rebuild = (r, patch) => imageMd({ alt: r.alt, url: r.url, title: r.title, width: r.width, ...patch });
export const urlFor = (dir, file) => { const rel = relPath(dir, file); return rel ? encodePath(rel) : null; };
export const humanSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
