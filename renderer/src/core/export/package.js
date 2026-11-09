import { scanLines } from '../toc/headings.js';

const LINK = /(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^)\s]+)((?:\s+"[^"\n]*")?\))/g;
const IMG_EXT = /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const HTML_IMG = /<img\b/i;
const local = (s) => s !== '' && !/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[\\/#?~]/.test(s);
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const enc = (s) => encodeURI(s).replace(/[()]/g, (c) => (c === '(' ? '%28' : '%29'));

// -> { markdown, refs: [{ from, to }], warnings }. Pure: local images get package-relative `assets/<name>` paths; code and comments are untouched.
export function planPackage(text, { folder = 'assets' } = {}) {
  const refs = new Map(), used = new Set(), warnings = [];
  let html = 0;
  const lines = scanLines(String(text ?? '')).map(({ s, code, c }) => {
    if (code || c) return s;
    if (HTML_IMG.test(s)) html++;
    return s.replace(LINK, (all, head, raw, tail) => {
      const u = raw.startsWith('<') ? raw.slice(1, -1) : raw, m = /^([^?#]*)([?#].*)?$/.exec(u), p = m[1];
      if (!local(p) || !IMG_EXT.test(p)) return all;
      const from = dec(p).replace(/^\.\//, '');
      if (from.includes('\0')) return all;
      let to = refs.get(from);
      if (!to) {
        const base = from.split(/[\\/]/).pop().replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_');
        let name = base, k = 1;
        while (used.has(name.toLowerCase())) name = base.replace(/(\.[^.]*)?$/, (e) => `-${++k}${e || ''}`);
        used.add(name.toLowerCase());
        to = `${folder}/${name}`;
        refs.set(from, to);
      }
      return `${head}${enc(to)}${m[2] || ''}${tail}`;
    });
  });
  if (html) warnings.push({ kind: 'html-image', message: `${html} HTML image tag${html === 1 ? '' : 's'} keep${html === 1 ? 's' : ''} the original path and ${html === 1 ? 'is' : 'are'} not copied into the package.`, line: 0, level: 'warn' });
  return { markdown: lines.join('\n'), refs: [...refs].map(([from, to]) => ({ from, to })), warnings };
}
