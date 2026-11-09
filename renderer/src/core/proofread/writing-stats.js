// Pure writing statistics. Sentence/word counts use the statistics engine (countWords); passive voice and -ly adverbs are English heuristics (hints only).
// writingStats(text) -> { sentences, words, avg, longest[{from,to,words}], flesch, grade, passive[{from,to}], adverbs[{from,to}], style[hints] }
import { mask, sentences } from './prose.js';
import { styleHints } from './style-hints.js';

const WORD = /[\p{L}][\p{L}'’]*/gu;
const IRR = 'known|made|done|given|taken|seen|written|shown|built|found|held|kept|led|left|lost|paid|sent|sold|told|won|chosen|broken|driven|spoken|stolen|eaten|forgotten|hidden|worn|born|torn|drawn|grown|thrown|begun|beaten';
const PASSIVE = new RegExp(`\\b(?:am|is|are|was|were|be|been|being)\\s+(?:[a-z]+ly\\s+)?(?!(?:hundred|indeed|need|speed|feed|seed|breed|bleed|exceed|proceed|succeed)\\b)(?:[a-z]{2,}ed|${IRR})\\b`, 'gi');
const ADV = /\b[a-z]{3,}ly\b/gi;
const NOT_ADV = new Set('only family early likely friendly apply supply reply daily july italy assembly ally belly bully fly holy lonely lovely silly ugly rely multiply imply comply jelly rally tally anomaly monopoly'.split(' '));

export const syllables = (w) => {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return w ? 1 : 0;
  const g = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return g ? g.length : 1;
};

export const band = (f) => (f >= 90 ? 'Very easy' : f >= 80 ? 'Easy' : f >= 70 ? 'Fairly easy' : f >= 60 ? 'Plain English' : f >= 50 ? 'Fairly difficult' : f >= 30 ? 'Difficult' : 'Very difficult');

export function writingStats(text) {
  const m = mask(text), sents = sentences(m), words = sents.reduce((n, s) => n + s.words, 0);
  let tok = 0, syl = 0;
  for (const s of sents) for (const w of m.slice(s.from, s.to).match(WORD) || []) { tok++; syl += syllables(w); }
  const wps = sents.length ? words / sents.length : 0, spw = tok ? syl / tok : 0, ok = sents.length && tok;
  const hits = (re, skip) => [...m.matchAll(re)].filter((x) => !skip || !skip.has(x[0].toLowerCase())).map((x) => ({ from: x.index, to: x.index + x[0].length }));
  return {
    sentences: sents.length, words, avg: wps, longest: [...sents].sort((a, b) => b.words - a.words).slice(0, 3),
    flesch: ok ? 206.835 - 1.015 * wps - 84.6 * spw : null, grade: ok ? 0.39 * wps + 11.8 * spw - 15.59 : null,
    passive: hits(PASSIVE), adverbs: hits(ADV, NOT_ADV), style: styleHints(text, m, sents),
  };
}
