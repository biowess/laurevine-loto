// Pure: LanguageTool-style matches on a sent (masked) paragraph -> raw Problems items at document offsets.
// A match touching masked text is dropped; `was` is the real document text, so stale findings are discarded after edits.
const WARN = new Set(['misspelling', 'grammar', 'typographical', 'duplication']);

export function toFindings(matches, base, sent, orig) {
  const out = [];
  for (const m of matches) {
    const a = m.offset, b = a + m.length;
    if (b > sent.length || sent.slice(a, b) !== orig.slice(a, b)) continue;
    const from = base + a, to = base + b, r = m.replacements[0];
    out.push({
      id: 'grammar.' + (m.rule || 'match'), severity: WARN.has(m.type) ? 'warning' : 'info', message: m.message || 'Possible issue', range: { from, to }, cat: 'grammar', was: orig.slice(a, b),
      ...(r != null && r !== orig.slice(a, b) ? { fix: { label: `Replace with “${r}”`, from, to, insert: r } } : {}),
    });
  }
  return out;
}
