// Pure: aligned line rows for side-by-side/inline comparison, change list and unchanged-region folding.
import { diffLines } from './line-diff.js';

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const split = (t) => t.replace(/\r\n?/g, '\n').split('\n');

// { side: [{l,r,c?}], inline: [{r,c?}], changes: [{side,inline,add,del,line,old}], add, del }; `c` is the change index; rows keep original text.
export function compareLines(oldText, newText, ignoreWs = false) {
  const A = split(oldText), B = split(newText);
  const rows = ignoreWs
    ? diffLines(A.map(norm).join('\n'), B.map(norm).join('\n')).map(({ words, ...r }) => ({ ...r, text: r.t === 'del' ? A[r.a - 1] : B[r.b - 1] }))
    : diffLines(A.join('\n'), B.join('\n'));
  const side = [], inline = [], changes = [];
  let add = 0, del = 0;
  for (let i = 0; i < rows.length;) {
    if (rows[i].t === 'eq') { side.push({ l: rows[i], r: rows[i] }); inline.push({ r: rows[i] }); i++; continue; }
    const D = [], N = [];
    while (i < rows.length && rows[i].t !== 'eq') (rows[i].t === 'del' ? D : N).push(rows[i++]);
    const c = changes.length;
    changes.push({ side: side.length, inline: inline.length, add: N.length, del: D.length, line: N.length ? N[0].b : D[0].a, old: !N.length });
    for (let k = 0; k < Math.max(D.length, N.length); k++) side.push({ l: D[k] || null, r: N[k] || null, c });
    for (const x of D) inline.push({ r: x, c });
    for (const x of N) inline.push({ r: x, c });
    add += N.length; del += D.length;
  }
  return { side, inline, changes, add, del };
}

// Visible items over `lines`: { i } for a line, { gap, count } for a collapsed unchanged run; `open` is true (all) or a Set of gap starts.
export function fold(lines, ctx, open) {
  const keep = new Uint8Array(lines.length), out = [];
  lines.forEach((x, i) => { if (x.c !== undefined) for (let j = Math.max(0, i - ctx); j <= Math.min(lines.length - 1, i + ctx); j++) keep[j] = 1; });
  for (let i = 0; i < lines.length;) {
    if (keep[i]) { out.push({ i: i++ }); continue; }
    let j = i; while (j < lines.length && !keep[j]) j++;
    if (open === true || open.has(i)) for (let k = i; k < j; k++) out.push({ i: k });
    else out.push({ gap: i, count: j - i });
    i = j;
  }
  return out;
}
