// Pure: link picker helpers (kinds, relative file paths, heading anchors, URL/email validation).
import { withIds } from '../toc/generate.js';

export const KINDS = Object.freeze([['link', 'Hyperlink'], ['file', 'File'], ['heading', 'Heading'], ['external', 'External URL'], ['email', 'Email']]);

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const norm = (p) => String(p).replace(/\\/g, '/');
const enc = (p) => p.split('/').map((s) => (s === '.' || s === '..' ? s : encodeURIComponent(s))).join('/');

// from/to: absolute file paths (from may be '' for an untitled document, then `to` is taken as already relative).
export function relPath(from, to) {
  const a = norm(from).split('/').slice(0, -1), b = norm(to).split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return enc([...a.slice(i).map(() => '..'), ...b.slice(i)].join('/'));
}

export function kindOf(url) {
  if (!url) return 'link';
  if (/^mailto:/i.test(url)) return 'email';
  if (url[0] === '#') return 'heading';
  if (SCHEME.test(url) || /^www\./i.test(url)) return /^(https?|ftp):/i.test(url) ? 'external' : 'link';
  return url.includes('#') ? 'heading' : 'file';
}

export const externalUrl = (u) => (SCHEME.test(u.trim()) ? u.trim() : 'https://' + u.trim());

export function validateExternal(u) {
  if (!u.trim()) return 'Enter a URL.';
  let x;
  try { x = new URL(externalUrl(u)); } catch { return 'That is not a valid URL.'; }
  if (!['http:', 'https:', 'ftp:'].includes(x.protocol)) return 'Use an http, https or ftp address.';
  return x.hostname.includes('.') || x.hostname === 'localhost' ? '' : 'The address needs a host name, for example example.com.';
}

export const validateEmail = (a) => (/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(a.trim()) ? '' : 'Enter a valid email address.');

export const emailUrl = (to, subject) => `mailto:${to.trim()}${subject.trim() ? '?subject=' + encodeURIComponent(subject.trim()) : ''}`;

export function parseMail(url) {
  const m = /^mailto:([^?]*)(?:\?(.*))?$/i.exec(url);
  if (!m) return { to: '', subject: '' };
  let subject = '';
  try { subject = new URLSearchParams(m[2] || '').get('subject') || ''; } catch { /* keep empty */ }
  return { to: decodeURIComponent(m[1]), subject };
}

// headings: [{level,text}] -> rows with the anchor id the renderer assigns under `strategy`.
export const headingIds = (headings, strategy) => withIds(headings.map((x) => ({ level: x.level, text: x.text })), strategy);
