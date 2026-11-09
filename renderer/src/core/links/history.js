// Pure navigation history of locations { id, head, ... }: jump records the place left, back/forward swap it with the current one.
export function createHistory(max = 100) {
  let back = [], fwd = [];
  const same = (a, b) => !!a && !!b && a.id === b.id && a.head === b.head;
  const pop = (s, ok) => { let p; while ((p = s.pop()) && !ok(p)); return p || null; };
  return {
    jump(from) {
      if (!from) return;
      if (!same(back[back.length - 1], from)) back.push(from);
      if (back.length > max) back.shift();
      fwd = [];
    },
    back(cur, ok = () => true) { const p = pop(back, ok); if (p && cur) fwd.push(cur); return p; },
    forward(cur, ok = () => true) { const p = pop(fwd, ok); if (p && cur) back.push(cur); return p; },
    canBack: () => back.length > 0,
    canForward: () => fwd.length > 0,
  };
}
