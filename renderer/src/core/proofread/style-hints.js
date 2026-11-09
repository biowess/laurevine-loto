// Pure local style hints (English heuristics, never claims to be right): long sentences, filler words, three or more sentences starting alike.
// styleHints(text, masked?, sents?) -> [{ kind: long|filler|start, from, to, message }] sorted by position.
import { mask, sentences } from './prose.js';

export const LONG = 30;
const FILL = /\b(?:very|really|just|actually|basically|literally|simply|quite|rather|somewhat|essentially|definitely|totally|honestly|obviously|in order to|kind of|sort of)\b/gi;

export function styleHints(text, m = mask(text), sents = sentences(m)) {
  const out = [];
  for (const s of sents) if (s.words > LONG) out.push({ kind: 'long', from: s.from, to: s.to, message: `Long sentence (${s.words} words)` });
  for (const x of m.matchAll(FILL)) out.push({ kind: 'filler', from: x.index, to: x.index + x[0].length, message: `Filler: “${x[0]}”` });
  let run = [];
  const flush = () => {
    if (run.length >= 3) for (const r of run) out.push({ kind: 'start', from: r.from, to: r.from + r.w.length, message: `${run.length} sentences in a row start with “${r.w}”` });
    run = [];
  };
  for (const s of sents) {
    const w = (/^[\p{L}'’]+/u.exec(m.slice(s.from, s.to)) || [''])[0];
    if (run.length && (!w || w.toLowerCase() !== run[0].w.toLowerCase())) flush();
    if (w) run.push({ from: s.from, w });
  }
  flush();
  return out.sort((a, b) => a.from - b.from);
}
