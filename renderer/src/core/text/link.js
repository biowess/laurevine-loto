// Pure: inline link detection and insert/edit/remove. Link = {s,e,label:[s,e],dest:[s,e]}; images are ignored.
import { scan } from './inline-scan.js';
import { finish, rng } from './changes.js';

const URLISH = /^(?:[a-z][a-z0-9+.-]*:\/\/|mailto:|www\.)\S+$/i;
const wordCh = (c) => !!c && /[\p{L}\p{N}_]/u.test(c);
const fmt = (u) => u.trim().replace(/[ ()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const del = (a, b) => ({ from: a, to: b, insert: '' });

export function findLinks(text, spans = scan(text)) {
  const code = spans.filter((s) => s.kind === 'code'), out = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') { i++; continue; }
    if (c !== '[' || text[i - 1] === '!' || code.some((x) => i >= x.s && i < x.e)) continue;
    let d = 1, j = i + 1;
    while (j < text.length) {
      const x = text[j];
      if (x === '\\') j++;
      else if (x === '[') d++;
      else if (x === ']' && !--d) break;
      j++;
    }
    if (text[j] !== ']' || text[j + 1] !== '(' || text.slice(i, j).includes('\n\n')) continue;
    let k = j + 2, d2 = 1;
    while (k < text.length && d2) {
      const x = text[k];
      if (x === '\\') k++;
      else if (x === '(') d2++;
      else if (x === ')') d2--;
      k++;
    }
    if (d2) continue;
    const ce = k - 1;
    let ds = j + 2;
    while (ds < ce && /\s/.test(text[ds])) ds++;
    let de = ds;
    if (text[ds] === '<') { de = text.indexOf('>', ds); de = de < 0 || de > ce ? ce : de + 1; }
    else while (de < ce && !/\s/.test(text[de])) de++;
    out.push({ s: i, e: k, label: [i + 1, j], dest: [ds, de] });
    i = ce;
  }
  return out;
}

export function setLink({ text, selections }, url) {
  const ls = findLinks(text), has = url !== undefined, u = has ? fmt(url) : '';
  const plans = selections.map(rng).map(({ from, to }) => {
    const l = ls.find((x) => x.s <= from && to <= x.e);
    if (l) {
      if (!has) return { ch: [], a: [l.dest[0], -1, 0], b: [l.dest[1], -1, 0] };
      return { ch: [{ from: l.dest[0], to: l.dest[1], insert: u }], a: [l.label[0], -1, 0], b: [l.label[1], -1, 0] };
    }
    let f = from, t = to;
    if (f === t) {
      while (f > 0 && wordCh(text[f - 1])) f--;
      while (t < text.length && wordCh(text[t])) t++;
    }
    const sel = text.slice(f, t);
    if (f !== t && URLISH.test(sel.trim())) return { ch: [{ from: f, to: t, insert: `[](${fmt(sel)})` }], a: [f, -1, 1], b: [f, -1, 1] };
    if (f === t) return { ch: [{ from: f, to: f, insert: `[](${u})` }], a: [f, -1, 1], b: [f, -1, 1] };
    return {
      ch: [{ from: f, to: f, insert: '[' }, { from: t, to: t, insert: `](${u})` }],
      a: has ? [f, 1, 0] : [t, -1, 2],
      b: has ? [t, -1, 0] : [t, -1, 2],
    };
  });
  return finish(selections, plans);
}

export const linkRanges = (l) => [[l.s, l.s + 1], [l.label[1], l.e]];

export function removeLink({ text, selections }) {
  const ls = findLinks(text);
  const plans = selections.map(rng).map(({ from, to }) => ({
    ch: ls.filter((x) => (from === to ? x.s <= from && from <= x.e : x.s < to && x.e > from)).flatMap((x) => linkRanges(x).map((r) => del(...r))),
    a: [from, -1, 0],
    b: [to, -1, 0],
  }));
  return finish(selections, plans);
}
