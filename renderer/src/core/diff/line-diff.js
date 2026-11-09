// Myers diff over arrays; returns [{ t: 'eq'|'del'|'add', a?, b? }] with 0-based indices.
export function myers(a, b, cap = 1500) {
  const n = a.length, m = b.length, max = Math.min(n + m, cap), off = max + 1;
  const v = new Int32Array(2 * max + 3), trace = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice(off - d, off + d + 1));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
  }
  if (found < 0) return [...a.map((_, i) => ({ t: 'del', a: i })), ...b.map((_, i) => ({ t: 'add', b: i }))];
  const out = [];
  let x = n, y = m;
  for (let d = found; d >= 0; d--) {
    const t = trace[d], k = x - y, at = (kk) => t[kk + d];
    let px = 0, py = 0;
    if (d > 0) {
      const pk = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
      px = at(pk); py = px - pk;
    }
    while (x > px && y > py) { x--; y--; out.push({ t: 'eq', a: x, b: y }); }
    if (d > 0) { if (x === px) { y--; out.push({ t: 'add', b: y }); } else { x--; out.push({ t: 'del', a: x }); } }
  }
  return out.reverse();
}

const TOKEN = /\s+|\w+|[^\w\s]/g;

// Word-level diff of two lines: [{ t: 'eq'|'del'|'add', s }] with adjacent same-type pieces merged.
export function diffWords(a, b) {
  const x = a.match(TOKEN) || [], y = b.match(TOKEN) || [], out = [];
  for (const o of myers(x, y)) {
    const s = o.t === 'add' ? y[o.b] : x[o.a], last = out[out.length - 1];
    if (last && last.t === o.t) last.s += s; else out.push({ t: o.t, s });
  }
  return out;
}

// Line diff of two texts: rows { t, text, a?, b? } (1-based line numbers); changed del/add pairs carry `words`.
export function diffLines(oldText, newText) {
  const A = oldText.split('\n'), B = newText.split('\n');
  const rows = myers(A, B).map((o) => (o.t === 'eq' ? { t: 'eq', text: A[o.a], a: o.a + 1, b: o.b + 1 }
    : o.t === 'del' ? { t: 'del', text: A[o.a], a: o.a + 1 } : { t: 'add', text: B[o.b], b: o.b + 1 }));
  for (let i = 0; i < rows.length;) {
    if (rows[i].t === 'eq') { i++; continue; }
    let j = i; while (j < rows.length && rows[j].t === 'del') j++;
    let k = j; while (k < rows.length && rows[k].t === 'add') k++;
    for (let n = 0; n < Math.min(j - i, k - j); n++) {
      const d = rows[i + n], a = rows[j + n];
      if (d.text.length + a.text.length > 2000) continue;
      const w = diffWords(d.text, a.text);
      d.words = w.filter((p) => p.t !== 'add');
      a.words = w.filter((p) => p.t !== 'del');
    }
    i = Math.max(k, i + 1);
  }
  return rows;
}

// Groups rows into hunks with `ctx` unchanged lines around each change; gaps between hunks are dropped.
export function hunks(rows, ctx = 2) {
  const keep = new Array(rows.length).fill(false);
  rows.forEach((r, i) => { if (r.t !== 'eq') for (let j = Math.max(0, i - ctx); j <= Math.min(rows.length - 1, i + ctx); j++) keep[j] = true; });
  const out = [];
  rows.forEach((r, i) => { if (!keep[i]) return; if (!keep[i - 1] || !out.length) out.push([]); out[out.length - 1].push(r); });
  return out;
}
