// Pure: block formatting on {text,selections} -> {changes,selections}. Line prefixes: heading, quote, lists, indent, hr. Fenced lines skipped.
import { finish, rng } from './changes.js';

const RE = /^([ \t]*)((?:>[ \t]?)*)([ \t]*)(?:(#{1,6})(?:[ \t]+|$)|([-*+]|\d+[.)])(?:[ \t]+|$)(\[[ xX]\](?:[ \t]+|$))?)?/;
export const INDENT_UNITS = { '2-spaces': '  ', '4-spaces': '    ', tab: '\t' };

function rows(text) {
  let s = 0, f = false;
  return text.split('\n').map((t) => {
    const [all, g1, g2, g3, h, b, k] = RE.exec(t), q = !!g2;
    const fence = /^[ \t]*(```|~~~)/.test(t);
    if (fence) f = !f;
    const r = {
      s, t, f: fence || f, quote: g2, g1: g1.length, mk0: g1.length + g2.length + g3.length, end: all.length, b, num: parseInt(b) || 1,
      kind: h ? 'h' + h.length : b ? (/\d/.test(b) ? 'ol' : k ? 'task' : 'ul') : 'p',
      ind0: q ? g1.length + g2.length : 0, ind1: q ? g1.length + g2.length + g3.length : g1.length,
    };
    s += t.length + 1;
    return r;
  });
}

function run(state, fn) {
  const R = rows(state.text);
  return finish(state.selections, state.selections.map((sel) => {
    let { from, to } = rng(sel);
    const caret = from === to;
    if (!caret && state.text[to - 1] === '\n') to--;
    const rs = R.filter((r) => r.s <= to && from <= r.s + r.t.length);
    const ts = rs.filter((r) => !r.f && (rs.length < 2 || r.t.trim()));
    const ch = ts.length ? fn(ts, caret, from).filter((c) => c.from < c.to || c.insert) : [];
    return { ch, a: [from, caret ? 1 : -1, 0], b: [rng(sel).to, 1, 0] };
  }));
}

// minimal replace of r.t[from,to) by nw (trims common prefix/suffix so carets map sensibly)
function rep(r, from, to, nw) {
  const old = r.t.slice(from, to);
  let i = 0, j = 0;
  while (i < old.length && i < nw.length && old[i] === nw[i]) i++;
  while (j < old.length - i && j < nw.length - i && old[old.length - 1 - j] === nw[nw.length - 1 - j]) j++;
  return { from: r.s + from + i, to: r.s + to - j, insert: nw.slice(i, nw.length - j) };
}

export const setHeading = (st, level) => run(st, (ts) => {
  const nl = ts.every((r) => r.kind === 'h' + level) ? 0 : level;
  return ts.filter((r) => nl || r.kind !== 'p').map((r) => rep(r, 0, r.end, r.quote + (nl ? '#'.repeat(nl) + ' ' : '')));
});

export const toggleQuote = (st) => run(st, (ts) => {
  const all = ts.every((r) => r.quote);
  return ts.flatMap((r) => all
    ? [{ from: r.s + r.g1, to: r.s + r.g1 + (/[ \t]/.test(r.quote[1] || '') ? 2 : 1), insert: '' }]
    : r.quote ? [] : [{ from: r.s + r.g1, to: r.s + r.g1, insert: '> ' }]);
});

export const toggleList = (st, kind) => run(st, (ts) => {
  const on = ts.every((r) => r.kind === kind), cnt = {};
  return ts.flatMap((r, i) => {
    let m = '';
    if (!on) {
      if (r.kind === kind && kind !== 'ol') return [];
      if (kind === 'ol') {
        const w = r.ind1 - r.ind0;
        for (const k in cnt) if (+k > w) delete cnt[k];
        cnt[w] = cnt[w] === undefined ? (i === 0 && r.kind === 'ol' ? r.num : 1) : cnt[w] + 1;
        m = cnt[w] + '. ';
      } else m = (r.kind === 'ul' || r.kind === 'task' ? r.b : '-') + (kind === 'task' ? ' [ ] ' : ' ');
    }
    return [rep(r, r.mk0, r.end, m)];
  });
});

export const indent = (st, unit = '2-spaces') => {
  const u = INDENT_UNITS[unit] || INDENT_UNITS['2-spaces'];
  return run(st, (ts, caret, p) => caret && ts.length === 1 && !/^(ol|ul|task)$/.test(ts[0].kind)
    ? [{ from: p, to: p, insert: u }]
    : ts.map((r) => ({ from: r.s + r.ind0, to: r.s + r.ind0, insert: u })));
};

export const outdent = (st, unit = '2-spaces') => {
  const u = INDENT_UNITS[unit] || INDENT_UNITS['2-spaces'];
  return run(st, (ts) => ts.map((r) => {
    const ind = r.t.slice(r.ind0, r.ind1);
    const n = ind[0] === '\t' ? 1 : Math.min(/^ */.exec(ind)[0].length, u === '\t' ? 4 : u.length);
    return { from: r.s + r.ind0, to: r.s + r.ind0 + n, insert: '' };
  }));
};

export function insertHr(state) {
  const R = rows(state.text);
  return finish(state.selections, state.selections.map((sel) => {
    const to = rng(sel).to, i = R.findIndex((r) => to <= r.s + r.t.length), r = R[i], pv = R[i - 1], nx = R[i + 1];
    const pos = r.s + r.t.length, pad = nx ? (nx.t.trim() ? '\n' : '') : '\n';
    const c = r.t.trim()
      ? { from: pos, to: pos, insert: '\n\n---' + pad }
      : { from: r.s, to: pos, insert: (pv && pv.t.trim() ? '\n' : '') + '---' + pad };
    return { ch: r.f ? [] : [c], a: [pos, 1, 0], b: [pos, 1, 0] };
  }));
}
