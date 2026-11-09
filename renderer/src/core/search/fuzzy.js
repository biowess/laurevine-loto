// Pure fuzzy matching: a substring beats a subsequence; word starts and runs score higher.
const BOUND = /[\s\-_./:>()]/;

export function fuzzy(query, text) {
  const q = String(query).toLowerCase().replace(/\s+/g, ''), t = String(text).toLowerCase();
  if (!q) return { score: 0, idx: [] };
  const at = t.indexOf(q);
  if (at >= 0) return { score: 100 - at + (at === 0 || BOUND.test(t[at - 1]) ? 20 : 0) - t.length * 0.05, idx: [...q].map((_, i) => at + i) };
  const idx = [];
  let from = 0, score = 0, prev = -2;
  for (const ch of q) {
    const j = t.indexOf(ch, from);
    if (j < 0) return null;
    score += 1 + (j === prev + 1 ? 5 : 0) + (j === 0 || BOUND.test(t[j - 1]) ? 8 : 0);
    idx.push(j); prev = j; from = j + 1;
  }
  return { score: score - t.length * 0.05, idx };
}

// fields(item) -> [[text, weight], ...]; boost(item) -> bonus. Sorted by score, ties keep input order.
export function rank(items, query, fields, boost = () => 0) {
  const out = [];
  items.forEach((item, order) => {
    let best = null;
    fields(item).forEach(([text, w], field) => {
      const m = fuzzy(query, text);
      if (m && (!best || m.score * w > best.score)) best = { item, order, field, idx: m.idx, score: m.score * w };
    });
    if (best) { best.score += boost(item); out.push(best); }
  });
  return out.sort((a, b) => b.score - a.score || a.order - b.order);
}
