import { findAll, expand } from './text-search.js';
import { kinds, SCOPES } from './scoped.js';

// Edits [{ from, to, insert }] over LF text for matches in the scope Set (content|frontmatter|code); `tpl` expands $1, $&, $<name>. Unchanged matches are dropped.
export function replaceEdits(text, opts, scopes, tpl) {
  const { matches, error } = findAll(text, opts, { limit: 100000 });
  if (error || !matches.length) return { edits: [], error };
  const starts = [0];
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  const k = kinds(text.split('\n')), edits = [];
  for (const m of matches) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= m.from) lo = mid; else hi = mid - 1; }
    const insert = expand(tpl, m);
    if (scopes.has(SCOPES[k[lo]]) && insert !== text.slice(m.from, m.to)) edits.push({ from: m.from, to: m.to, insert });
  }
  return { edits };
}
