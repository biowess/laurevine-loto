// Pure: clearFormatting({text,selections}) strips emphasis/strike/code spans and links touching the selections, keeps text.
// Spans partially covered are removed whole.
import { scan } from './inline-scan.js';
import { findLinks, linkRanges } from './link.js';
import { finish, rng } from './changes.js';

export function clearFormatting({ text, selections }) {
  const spans = scan(text), links = findLinks(text, spans), all = [];
  const plans = selections.map(rng).map(({ from, to }) => {
    const on = (s, e, k) => (from === to ? s - k < from && from < e + k : s < to && e > from);
    for (const x of spans) if (on(x.s, x.e, 0)) all.push(x.o, x.c);
    for (const l of links) if (on(l.s, l.e, 1)) all.push(...linkRanges(l));
    return { ch: [], a: [from, -1, 0], b: [to, -1, 0] };
  });
  if (plans.length) plans[0].ch = all.map((r) => ({ from: r[0], to: r[1], insert: '' }));
  return finish(selections, plans);
}
