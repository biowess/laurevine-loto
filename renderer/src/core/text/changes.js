// Pure: change helpers. Change = {from,to,insert} (original coords, sorted, non-overlapping); selection = {anchor,head}.
// A plan = {ch:[changes], a:[pos,assoc,add], b:[pos,assoc,add]}: endpoints are mapped through the kept changes.
export const rng = (s) => ({ from: Math.min(s.anchor, s.head), to: Math.max(s.anchor, s.head) });

export function normChanges(list) {
  const out = [];
  for (const c of [...list].sort((x, y) => x.from - y.from || x.to - y.to)) {
    const p = out[out.length - 1];
    if (p && (c.from < p.to || (c.from === p.from && c.to === p.to && c.insert === p.insert))) continue;
    out.push(c);
  }
  return out;
}

export function mapPos(ch, pos, assoc = -1) {
  let d = 0;
  for (const c of ch) {
    if (c.from === c.to) { if (pos > c.from || (pos === c.from && assoc > 0)) d += c.insert.length; }
    else if (pos >= c.to) d += c.insert.length - (c.to - c.from);
    else if (pos > c.from) d += c.from - pos;
  }
  return pos + d;
}

export function applyChanges(text, ch) {
  let out = '', at = 0;
  for (const c of ch) { out += text.slice(at, c.from) + c.insert; at = c.to; }
  return out + text.slice(at);
}

export function apply({ text }, { changes, selections }) {
  return { text: applyChanges(text, changes), selections };
}

export function finish(selections, plans) {
  const kept = [], ext = [];
  for (const p of plans) {
    if (!p.ch.length) continue;
    const f = Math.min(...p.ch.map((c) => c.from)), t = Math.max(...p.ch.map((c) => c.to));
    if (ext.some((e) => (f < e.t && e.f < t) || (f === e.f && t === e.t))) continue;
    ext.push({ f, t });
    kept.push(...p.ch);
  }
  const changes = normChanges(kept);
  const at = ([pos, assoc, add]) => mapPos(changes, pos, assoc) + add;
  return {
    changes,
    selections: plans.map((p, i) => {
      const a = at(p.a), b = at(p.b);
      return selections[i].anchor <= selections[i].head ? { anchor: a, head: b } : { anchor: b, head: a };
    }),
  };
}
