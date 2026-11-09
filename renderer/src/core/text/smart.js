// Pure: smart Enter/Backspace/Tab, auto-pairing and caret format state on {text,selections}. Results are {changes,selections} or null (= default key).
import { finish, rng } from './changes.js';
import { scan } from './inline-scan.js';
import { findLinks } from './link.js';

const LINE = /^([ \t]*)((?:>[ \t]?)*)([ \t]*)(?:([-*+]|\d+[.)])([ \t]+|$)(\[[ xX]\](?:[ \t]+|$))?)?/;
const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', '`': '`' };
const wc = (c) => !!c && /[\p{L}\p{N}_]/u.test(c);

function info(text, p) {
  const s = p ? text.lastIndexOf('\n', p - 1) + 1 : 0;
  let e = text.indexOf('\n', p);
  if (e < 0) e = text.length;
  const t = text.slice(s, e), m = LINE.exec(t);
  return { s, e, t, ind: m[1], q: m[2], ind2: m[3], mk: m[4], gap: m[5], task: m[6], len: m[0].length, lead: m[1].length + m[2].length + m[3].length };
}
const inFence = (text, p) => (text.slice(0, p).match(/^[ \t]*(```|~~~)/gm) || []).length % 2 === 1;

export function para(text, from, to = from) {
  let s = from ? text.lastIndexOf('\n\n', from - 1) : -1;
  s = Math.min(Math.max(s < 0 ? 0 : s + 2, from - 4000), from);
  let e = text.indexOf('\n\n', to);
  if (e < 0) e = text.length;
  return [s, Math.max(Math.min(e, to + 4000), to)];
}

export function enter({ text, selections }) {
  const plans = [];
  for (const sel of selections) {
    const { from, to } = rng(sel);
    if (from !== to || inFence(text, from)) return null;
    const l = info(text, from);
    if (!(l.mk || l.q) || from < l.s + l.len) return null;
    if (!l.t.slice(l.len).trim()) {
      plans.push({ ch: [{ from: l.s, to: l.e, insert: l.mk && l.q ? l.ind + l.q : '' }], a: [l.e, -1, 0], b: [l.e, -1, 0] });
      continue;
    }
    const nm = l.mk ? (/\d/.test(l.mk) ? parseInt(l.mk, 10) + 1 + l.mk.slice(-1) : l.mk) : '';
    const lead = l.ind + l.q + l.ind2 + (l.mk ? nm + (l.gap || ' ') + (l.task ? '[ ] ' : '') : '');
    plans.push({ ch: [{ from, to: from, insert: '\n' + lead }], a: [from, 1, 0], b: [from, 1, 0] });
  }
  return finish(selections, plans);
}

export function backspace({ text, selections }, autoPair) {
  if (selections.some((s) => s.anchor !== s.head)) return null;
  if (autoPair && selections.every((s) => text[s.head] && PAIRS[text[s.head - 1]] === text[s.head])) {
    return finish(selections, selections.map((s) => ({ ch: [{ from: s.head - 1, to: s.head + 1, insert: '' }], a: [s.head - 1, -1, 0], b: [s.head - 1, -1, 0] })));
  }
  const plans = [];
  for (const { head: p } of selections) {
    const l = info(text, p);
    if (!l.mk || p !== l.s + l.len || inFence(text, p)) return null;
    plans.push({ ch: [{ from: l.s + l.lead, to: p, insert: '' }], a: [p, -1, 0], b: [p, -1, 0] });
  }
  return finish(selections, plans);
}

export const listy = ({ text, selections }) => selections.some((sel) => {
  const { from, to } = rng(sel);
  return !inFence(text, from) && (!!info(text, from).mk || text.slice(from, to).includes('\n'));
});

export function pair({ text, selections }, k) {
  const c = PAIRS[k], closer = !c && Object.values(PAIRS).includes(k);
  if (!c && !closer) return null;
  const plans = [];
  for (const sel of selections) {
    const { from, to } = rng(sel);
    if (inFence(text, from)) return null;
    if (from === to && text[from] === (c ? (k === c ? k : null) : k)) { plans.push({ ch: [], a: [from + 1, -1, 0], b: [from + 1, -1, 0] }); continue; }
    if (!c) return null;
    if (from === to) {
      if (wc(text[from]) || (k === c && wc(text[from - 1]))) return null;
      plans.push({ ch: [{ from, to: from, insert: k + c }], a: [from, 1, -1], b: [from, 1, -1] });
    } else plans.push({ ch: [{ from, to: from, insert: k }, { from: to, to, insert: c }], a: [from, 1, 0], b: [to, -1, 0] });
  }
  return finish(selections, plans);
}

export function formatAt(text, sel) {
  const { from, to } = rng(sel), [s, e] = para(text, from, to);
  const t = text.slice(s, e), a = from - s, b = to - s, spans = scan(t), l = info(text, from);
  const on = (k) => spans.some((x) => x.kind === k && x.o[1] <= a && b <= x.c[0]);
  const h = /^[ \t]*(?:>[ \t]?)*(#{1,6})(?:[ \t]|$)/.exec(l.t);
  return {
    bold: on('bold'), italic: on('italic'), strike: on('strike'), code: on('code'),
    link: findLinks(t, spans).some((x) => x.s <= a && b <= x.e),
    level: h ? h[1].length : 0, quote: !!l.q,
    list: l.mk ? (/\d/.test(l.mk) ? 'ol' : l.task ? 'task' : 'ul') : '',
  };
}
