// Pure: link detection at a selection, URL validation and one-shot link build/replace for the link dialog.
import { rng } from './changes.js';
import { findLinks } from './link.js';
import { para } from './smart.js';

const SCHEMES = ['http', 'https', 'mailto', 'tel', 'ftp'];
const DEST = /^\s*(<[^>]*>|\S*)(?:\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*$/;
const WORD = /[\p{L}\p{N}_]/u;
const unesc = (s) => s.replace(/\\([\\[\]])/g, '$1');

export function validateUrl(u) {
  const v = u.trim();
  if (!v) return 'Enter a URL.';
  if (/[\u0000-\u001f]/.test(v)) return 'The URL contains control characters.';
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(v.replace(/[\u0000-\u0020]/g, ''));
  return m && !SCHEMES.includes(m[1].toLowerCase()) ? 'Use http, https, mailto, tel, ftp or a relative link.' : '';
}

export function linkAt(text, sel) {
  const { from, to } = rng(sel), [o] = para(text, from, to), a = from - o, b = to - o;
  const l = findLinks(text.slice(o, para(text, from, to)[1])).find((x) => x.s <= a && b <= x.e);
  if (!l) return null;
  const inner = text.slice(o + l.label[1] + 2, o + l.e - 1), m = DEST.exec(inner);
  return {
    s: o + l.s, e: o + l.e, label: unesc(text.slice(o + l.label[0], o + l.label[1])),
    url: m ? m[1].replace(/^<|>$/g, '') : inner.trim(), title: m ? (m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1') : '',
  };
}

// Dialog defaults: existing link, else the selection (or word at the caret) as label; a URL-like selection becomes the URL.
export function linkDefaults(text, sel) {
  const hit = linkAt(text, sel);
  if (hit) return { ...hit, edit: true };
  let { from, to } = rng(sel);
  if (from === to) {
    while (from > 0 && WORD.test(text[from - 1])) from--;
    while (to < text.length && WORD.test(text[to])) to++;
  }
  const s = text.slice(from, to), url = /^(?:[a-z][a-z0-9+.-]*:\/\/|mailto:|www\.)\S+$/i.test(s.trim());
  return { s: from, e: to, label: url ? '' : s, url: url ? s.trim() : '', title: '', edit: false };
}

export function linkChange(range, { url, label, title }) {
  const u = url.trim().replace(/[ ()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const t = title.trim() ? ` "${title.trim().replace(/["\\]/g, '\\$&')}"` : '';
  const md = `[${(label.trim() || url.trim()).replace(/[\\[\]]/g, '\\$&')}](${u}${t})`;
  return { changes: [{ from: range.s, to: range.e, insert: md }], selections: [{ anchor: range.s + md.length, head: range.s + md.length }] };
}
