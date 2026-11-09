// Pure: toggleInline({text,selections}, kind) -> {changes, selections}. Multi-cursor; per-line units; never splits other spans.
import { scan } from './inline-scan.js';
import { finish, rng } from './changes.js';

export const MARKS = { bold: '**', italic: '*', strike: '~~', code: '`' };
const PREFIX = /^[ \t]*(?:>[ \t]*)*(?:(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?|#{1,6}[ \t]+)?/;
const wordCh = (c) => !!c && /[\p{L}\p{N}_]/u.test(c);
const del = (r) => ({ from: r[0], to: r[1], insert: '' });
const tight = (t, p, m) => p >= m.length && t.startsWith(m, p - m.length) && t.startsWith(m, p) && t[p - m.length - 1] !== m[0] && t[p + m.length] !== m[0];
const inner = (spans, a, b) => spans.filter((s) => (a === b ? s.s < a && a < s.e : s.s <= a && b <= s.e)).sort((x, y) => x.e - x.s - (y.e - y.s))[0];

function units(t, a, b) {
  const out = [];
  for (let s = a; s <= b; ) {
    let e = t.indexOf('\n', s);
    if (e < 0 || e > b) e = b;
    let x = s, y = e;
    if (!x || t[x - 1] === '\n') x += PREFIX.exec(t.slice(x, y))[0].length;
    while (x < y && /\s/.test(t[x])) x++;
    while (y > x && /\s/.test(t[y - 1])) y--;
    if (x < y) out.push([x, y]);
    s = e + 1;
  }
  return out;
}

function fit(a, b, kind, spans) {
  for (let ch = 1; ch; ) {
    ch = 0;
    for (const x of spans) {
      let na = a, nb = b;
      if (x.kind === kind) {
        if (x.s < b && x.e > a) { na = Math.min(a, x.s); nb = Math.max(b, x.e); }
      } else {
        for (const m of [x.o, x.c]) {
          if (na > m[0] && na < m[1]) na = m[0];
          if (nb > m[0] && nb < m[1]) nb = m[1];
        }
        const ia = na > x.s && na < x.e, ib = nb > x.s && nb < x.e;
        if (x.kind === 'code' ? ia || ib : ia !== ib) { if (ia) na = x.s; if (ib) nb = x.e; }
      }
      if (na !== a || nb !== b) { a = na; b = nb; ch = 1; }
    }
  }
  return [a, b];
}

function wrap(t, a, b, kind, spans) {
  [a, b] = fit(a, b, kind, spans);
  const ov = spans.filter((s) => s.kind === kind && s.s >= a && s.e <= b);
  let m = MARKS[kind];
  if (kind === 'code' && !ov.length) m = '`'.repeat(Math.max(0, ...(t.slice(a, b).match(/`+/g) || []).map((r) => r.length)) + 1);
  const ko = ov.some((s) => s.s === a && t.slice(...s.o) === m), kc = ov.some((s) => s.e === b && t.slice(...s.c) === m);
  const ch = [];
  for (const s of ov) {
    if (!(ko && s.s === a)) ch.push(del(s.o));
    if (!(kc && s.e === b)) ch.push(del(s.c));
  }
  if (!ko) ch.push({ from: a, to: a, insert: m });
  if (!kc) ch.push({ from: b, to: b, insert: m });
  return { ch, a, b, m, ko, kc };
}

const ends = (r) => [r.ko ? [r.a, -1, r.m.length] : [r.a, 1, 0], r.kc ? [r.b, -1, -r.m.length] : [r.b, -1, 0]];

export function toggleInline({ text, selections }, kind) {
  const spans = scan(text), same = spans.filter((s) => s.kind === kind), m = MARKS[kind];
  const un = (ss, f, t) => ({ ch: ss.flatMap((s) => [del(s.o), del(s.c)]), a: [f, -1, 0], b: [t, -1, 0] });
  const caret = (p) => {
    if (tight(text, p, m)) return { ch: [del([p - m.length, p]), del([p, p + m.length])], a: [p, -1, 0], b: [p, -1, 0] };
    const s = inner(same, p, p);
    if (s) return un([s], p, p);
    let ws = p, we = p;
    const c = spans.find((x) => x.kind === 'code' && x.s < p && p < x.e);
    if (c) [ws, we] = [c.s, c.e];
    else {
      while (ws > 0 && wordCh(text[ws - 1])) ws--;
      while (we < text.length && wordCh(text[we])) we++;
    }
    if (ws === we) return { ch: [{ from: p, to: p, insert: m + m }], a: [p, -1, m.length], b: [p, -1, m.length] };
    const r = wrap(text, ws, we, kind, spans), e = [p, -1, p === r.a ? r.m.length : 0];
    return { ch: r.ch, a: e, b: e };
  };
  const plans = selections.map(rng).map(({ from, to }) => {
    const us = from === to ? [] : units(text, from, to);
    if (!us.length) return caret(from);
    const hit = us.map(([x, y]) => inner(same, x, y));
    if (hit.every(Boolean)) return un([...new Set(hit)], from, to);
    const rs = us.map(([x, y], i) => (hit[i] ? null : wrap(text, x, y, kind, spans))).filter(Boolean);
    return {
      ch: rs.flatMap((r) => r.ch),
      a: (!hit[0] && ends(rs[0])[0]) || [us[0][0], -1, 0],
      b: (!hit[hit.length - 1] && ends(rs[rs.length - 1])[1]) || [us[us.length - 1][1], -1, 0],
    };
  });
  return finish(selections, plans);
}
