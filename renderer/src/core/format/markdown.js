import { classify, splitEol, joinEol, trimEnd, width, lead, cols, ATX, LIST, THEMATIC, FENCE } from './blocks.js';
import { parseTable } from '../table/parse.js';
import { serializeTable } from '../table/serialize.js';

export const FORMAT_DEFAULTS = Object.freeze({ bullet: '-', listIndent: 2, renumber: true, wrap: 0, fence: '`', spacing: true, maxBlank: 1, tables: true, eol: 'keep' });

const TOKEN = /`[^`]*`|!?\[\[[^\]]*\]\]|!?\[[^\]]*\]\([^)]*\)|\S+/g;
const MARK = /^(?:[-+*>:|]|#{1,6}|\d{1,9}[.)]|=+|-+)$/;
const NOWRAP = /^\s*>|^\s*(?:\[[^\]]+\]:|\*\[|:\s|=+\s*$|-+\s*$)|\||  $|\\$/;
const SETEXT = /^ {0,3}(?:=+|-+)[ \t]*$/;

function wrap(lines, max) {
  const out = [];
  let cur = '';
  for (const t of lines.join(' ').match(TOKEN) || []) {
    if (!cur) cur = t;
    else if (cur.length + 1 + t.length <= max || MARK.test(t)) cur += ' ' + t;
    else { out.push(cur); cur = t; }
  }
  if (cur) out.push(cur);
  return out;
}

function fence(L, o, place) {
  const op = FENCE.exec(L[0]), ch = op[2][0], n = op[2].length;
  const end = L.length > 1 ? FENCE.exec(L[L.length - 1]) : null;
  if (!(end && end[2][0] === ch && end[2].length >= n && !end[3].trim())) return L.map(place);
  const want = o.fence === 'keep' || (o.fence === '`' && op[3].includes('`')) ? ch : o.fence;
  let len = n;
  if (want !== ch) {
    const re = want === '`' ? /^\s*(`+)/ : /^\s*(~+)/;
    len = Math.max(3, 1 + Math.max(0, ...L.slice(1, -1).map((l) => (re.exec(l) || [, ''])[1].length)));
  }
  const ind = lead(place(L[0])), bar = want.repeat(len);
  return [ind + bar + op[3].trim(), ...L.slice(1, -1).map(place), ind + bar];
}

export function formatMarkdown(text, options = {}) {
  const o = { ...FORMAT_DEFAULTS, ...options }, src = String(text ?? '');
  const { body, eol } = splitEol(src), { lines, blocks } = classify(body);
  const max = Math.max(0, o.wrap | 0), res = [], stack = [];
  let fmLen = 0, want = false, blanks = 0, prev = 'blank', para = [];

  const emit = (arr, spaced = false) => {
    if ((spaced || want) && res.length > fmLen && res[res.length - 1] !== '') res.push('');
    res.push(...arr);
    want = spaced;
    blanks = 0;
  };
  const flush = () => {
    if (!para.length) return;
    const setext = para.length > 1 && SETEXT.test(para[para.length - 1]);
    emit(max && !para.some((l) => NOWRAP.test(l)) ? wrap(para, max) : para, setext && o.spacing);
    para = [];
  };
  const pop = (w) => {
    let l = null;
    while (stack.length && w < stack[stack.length - 1].oc) l = stack.pop();
    return l;
  };
  const place = (s) => {
    if (!s.trim()) return s;
    const w = width(s);
    for (let k = stack.length - 1; k >= 0; k--) {
      const e = stack[k];
      if (w >= e.oc) return e.nc === e.oc ? s : ' '.repeat(Math.max(0, w + e.nc - e.oc)) + s.slice(lead(s).length);
    }
    return s;
  };

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi], L = lines.slice(b.a, b.b + 1);
    if (b.k === 'fm') { res.push(...L); fmLen = res.length; prev = 'blank'; continue; }
    if (b.k === 'blank') {
      flush();
      if (res.length && ++blanks <= Math.max(1, o.maxBlank | 0)) { res.push(''); want = false; }
      prev = 'blank';
      continue;
    }
    if (b.k === 'code' || b.k === 'math' || b.k === 'html' || b.k === 'comment') {
      flush();
      pop(width(L[0]));
      const isFence = b.sub === 'fence';
      emit(isFence ? fence(L, o, place) : L.map(place), isFence && !stack.length && o.spacing);
      prev = 'other';
      continue;
    }
    if (b.k === 'table') {
      flush();
      pop(width(L[0]));
      const ind = lead(place(L[0]));
      emit(o.tables ? serializeTable(parseTable(L.join('\n'))).split('\n').map((x) => ind + x) : L.map((x) => trimEnd(place(x))), !stack.length && o.spacing);
      prev = 'other';
      continue;
    }
    const s = L[0], w = width(s), nextText = !!blocks[bi + 1] && blocks[bi + 1].k === 'text';
    const h = ATX.exec(s);
    if (h) {
      flush();
      pop(w);
      const t = (h[2] || '').trim(), line = h[1] + (t ? ' ' + t : '');
      emit([stack.length ? lead(place(s)) + line : line], !stack.length && o.spacing);
      prev = 'other';
      continue;
    }
    if (THEMATIC.test(s)) {
      if (para.length && prev === 'plain' && /^ {0,3}-+[ \t]*$/.test(s)) {
        para.push(s.trim());
        flush();
      } else {
        flush();
        pop(w);
        emit([stack.length ? trimEnd(place(s)) : s.trim()]);
      }
      prev = 'other';
      continue;
    }
    const m = LIST.exec(s);
    if (m) {
      const ord = /\d/.test(m[2][0]), num = ord ? parseInt(m[2], 10) : 0, empty = !(m[4] || '').trim();
      if (!(prev === 'plain' && !stack.length && (empty || (ord && num !== 1))) && !(w >= 4 && !stack.length)) {
        flush();
        const last = pop(w), sib = !!last && last.ow <= w && last.ord === ord;
        const list = sib ? last.list : { n0: num, i: 0, same: false };
        if (sib && list.i === 1) list.same = num === list.n0;
        const n = o.renumber ? (list.same ? list.n0 : list.n0 + list.i) : num;
        list.i++;
        const mk = ord ? n + '.' : o.bullet, par = stack[stack.length - 1];
        const ni = par ? par.ni + Math.max(o.listIndent, par.mw) : 0;
        const full = cols(m[1] + m[2] + (m[3] || ' ')), sp = full - w - m[2].length;
        const oc = empty || sp > 4 ? w + m[2].length + 1 : full;
        const rest = trimEnd(sp > 4 && !empty ? ' '.repeat(sp - 1) + m[4] : m[4] || '', nextText);
        stack.push({ ow: w, oc, ni, nc: ni + mk.length + 1, mw: mk.length + 1, ord, list });
        emit([' '.repeat(ni) + mk + (rest ? ' ' + rest : '')]);
        prev = 'item';
        continue;
      }
    }
    if (prev === 'blank' || prev === 'other') pop(w);
    const t = trimEnd(s, nextText);
    if (stack.length) emit([place(t)]);
    else para.push(w < 4 ? t.trimStart() : t);
    prev = 'plain';
  }
  flush();
  while (res.length && res[res.length - 1] === '') res.pop();
  const out = joinEol(res.length ? res.join('\n') + '\n' : '', o.eol === 'keep' ? eol : o.eol === 'crlf' ? 'crlf' : 'lf');
  return { text: out, changed: out !== src };
}
