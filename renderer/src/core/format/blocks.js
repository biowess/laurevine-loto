import { splitFrontmatter } from '../markdown/frontmatter.js';
import { isDelimiter, splitRow } from '../table/parse.js';

export const FENCE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
export const LIST = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;
export const THEMATIC = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
export const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const HTML = /^ {0,3}<(?:\/?[A-Za-z][\w:-]*(?:[\s/>]|$)|[?!])/;
const RAW = /^ {0,3}<(pre|script|style|textarea)(?:[\s>]|$)/i;

export const cols = (s, ts = 4) => {
  let w = 0;
  for (const c of s) w = c === '\t' ? w + ts - (w % ts) : w + 1;
  return w;
};
export const lead = (s) => /^[ \t]*/.exec(s)[0];
export const width = (s) => cols(lead(s));
export const trimEnd = (s, keep) => {
  const t = s.replace(/[ \t]+$/, '');
  return keep && t && / {2,}$/.test(s) ? t + '  ' : t;
};

export function splitEol(t) {
  const crlf = (t.match(/\r\n/g) || []).length;
  const lf = (t.match(/\n/g) || []).length - crlf + (t.match(/\r(?!\n)/g) || []).length;
  return { body: t.replace(/\r\n?/g, '\n'), eol: crlf && crlf >= lf ? 'crlf' : 'lf' };
}
export const joinEol = (t, eol) => (eol === 'crlf' ? t.replace(/\n/g, '\r\n') : t);
export function splitKeep(src) {
  const p = src.split(/(\r\n|\r|\n)/);
  return { lines: p.filter((_, i) => !(i & 1)), terms: p.filter((_, i) => i & 1) };
}
export const joinKeep = (lines, terms) => lines.map((l, i) => l + (terms[i] ?? '')).join('');

const fenceOpen = (s, list) => {
  const m = FENCE.exec(s);
  return m && (list || cols(m[1]) < 4) && !(m[2][0] === '`' && m[3].includes('`')) ? m : null;
};
const closes = (l, ch, n) => {
  const m = FENCE.exec(l);
  return !!m && m[2][0] === ch && m[2].length >= n && !m[3].trim();
};
const endFence = (lines, i, f) => {
  let j = i + 1;
  while (j < lines.length && !closes(lines[j], f[2][0], f[2].length)) j++;
  return Math.min(j, lines.length - 1);
};
const endMath = (lines, i) => (/\$\$/.test(lines[i].replace(/^\s*\$\$/, '')) ? i : lines.findIndex((l, n) => n > i && l.includes('$$')));
const endComment = (lines, i, from) => {
  for (let j = i; j < lines.length; j++) if (lines[j].indexOf('-->', j === i ? from : 0) >= 0) return j;
  return lines.length - 1;
};
const endsTable = (l) => !l.trim() || ATX.test(l) || /^\s*(?:>|<!--)/.test(l) || FENCE.test(l) || THEMATIC.test(l) || LIST.test(l);

// LF text -> { lines, kinds[i], blocks[{k,a,b,sub}] }; k: fm | blank | code(fence|indent) | math | html | comment | table | text (one block per line).
export function classify(text) {
  const lines = text.split('\n'), n = lines.length, kinds = new Array(n).fill('text'), blocks = [];
  const add = (k, a, b, sub) => {
    for (let i = a; i <= b; i++) kinds[i] = k;
    blocks.push({ k, a, b, sub });
    return b + 1;
  };
  const fm = splitFrontmatter(text).raw;
  let i = fm ? add('fm', 0, fm.split('\n').length - (fm.endsWith('\n') ? 2 : 1)) : 0;
  let list = false, blank = true;
  while (i < n) {
    const s = lines[i], w = width(s);
    if (!s.trim()) { i = add('blank', i, i); blank = true; continue; }
    const was = blank, cm = s.lastIndexOf('<!--'), f = fenceOpen(s, list);
    blank = false;
    if (f) { i = add('code', i, endFence(lines, i, f), 'fence'); continue; }
    if (s.trimStart().startsWith('<!--')) { i = add('comment', i, endComment(lines, i, s.indexOf('<!--') + 4)); continue; }
    if (/^\s*\$\$/.test(s)) {
      const j = endMath(lines, i);
      if (j >= 0) { i = add('math', i, j); continue; }
    }
    if (was && HTML.test(s)) {
      const r = RAW.exec(s), re = r && new RegExp('</' + r[1], 'i');
      let j = i;
      if (r) while (j < n - 1 && !re.test(lines[j])) j++;
      else while (j + 1 < n && lines[j + 1].trim()) j++;
      i = add('html', i, j);
      continue;
    }
    if (!list && was && w >= 4) {
      let j = i;
      for (let k = i + 1; k < n && (!lines[k].trim() || width(lines[k]) >= 4); k++) if (lines[k].trim()) j = k;
      i = add('code', i, j, 'indent');
      continue;
    }
    if (s.includes('|') && i + 1 < n && isDelimiter(lines[i + 1]) && !ATX.test(s) && !LIST.test(s) && !/^\s*>/.test(s) && splitRow(s).length === splitRow(lines[i + 1]).length) {
      let j = i + 2;
      while (j < n && !endsTable(lines[j])) j++;
      i = add('table', i, j - 1);
      continue;
    }
    if (THEMATIC.test(s) || ATX.test(s)) list = false;
    else if (LIST.test(s)) list = true;
    else if (was && w < 2) list = false;
    i = add('text', i, i);
    if (cm >= 0 && s.indexOf('-->', cm + 4) < 0) {
      const e = endComment(lines, i, 0);
      if (e >= i) i = add('comment', i, e);
    }
  }
  return { lines, kinds, blocks };
}
