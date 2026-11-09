// Pure: block-aware (paragraph/heading/fence) diff of Markdown bodies with word-level refinement, summary and context collapsing.
import { myers, diffWords } from './line-diff.js';
import { splitFrontmatter } from '../markdown/frontmatter.js';

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEAD = /^ {0,3}#{1,6}(\s|$)/;
const WORD = /\w+/g;

// Blocks of a body: [{ text, line, end }] (1-based lines in `text`); blank lines split, fences stay whole, ATX headings stand alone.
export function splitBlocks(text, firstLine = 1) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n'), out = [];
  let cur = null, fence = null;
  const flush = () => { if (cur) { out.push({ text: cur.l.join('\n'), line: cur.s, end: cur.s + cur.l.length - 1 }); cur = null; } };
  lines.forEach((raw, i) => {
    const l = raw.replace(/\s+$/, ''), n = firstLine + i, f = FENCE.exec(l);
    if (fence) {
      cur.l.push(l);
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && l.trim() === f[1]) fence = null;
      return;
    }
    if (!l.trim()) return flush();
    if (f) { flush(); cur = { s: n, l: [l] }; fence = f[1]; return; }
    if (HEAD.test(l)) { flush(); out.push({ text: l, line: n, end: n }); return; }
    if (!cur) cur = { s: n, l: [] };
    cur.l.push(l);
  });
  flush();
  return out;
}

const sim = (a, b) => {
  const x = new Set((a.toLowerCase().match(WORD) || [])), y = new Set((b.toLowerCase().match(WORD) || []));
  if (!x.size && !y.size) return 1;
  let n = 0; for (const w of x) if (y.has(w)) n++;
  return n / (x.size + y.size - n);
};

// Blocks diff: [{ type: 'same'|'added'|'removed'|'modified', old?, new?, words? }]; `old`/`new` are blocks; modified carries word pieces.
export function diffBlocks(oldText, newText, { threshold = 0.4 } = {}) {
  const fa = splitFrontmatter(oldText), fb = splitFrontmatter(newText);
  const off = (f) => (f.raw.match(/\n/g) || []).length + 1;
  const A = splitBlocks(fa.body, off(fa)), B = splitBlocks(fb.body, off(fb));
  const ops = myers(A.map((b) => b.text), B.map((b) => b.text)), out = [];
  for (let i = 0; i < ops.length;) {
    if (ops[i].t === 'eq') { out.push({ type: 'same', old: A[ops[i].a], new: B[ops[i].b] }); i++; continue; }
    const D = [], N = [];
    while (i < ops.length && ops[i].t !== 'eq') { (ops[i].t === 'del' ? D : N).push(ops[i].t === 'del' ? A[ops[i].a] : B[ops[i].b]); i++; }
    let j = 0;
    for (const d of D) {
      let k = j; while (k < N.length && sim(d.text, N[k].text) < threshold) k++;
      if (k === N.length) { out.push({ type: 'removed', old: d }); continue; }
      while (j < k) out.push({ type: 'added', new: N[j++] });
      const n = N[j++], big = d.text.length + n.text.length > 4000;
      out.push({ type: 'modified', old: d, new: n, words: big ? null : diffWords(d.text, n.text) });
    }
    while (j < N.length) out.push({ type: 'added', new: N[j++] });
  }
  return out;
}

export function summarize(blocks) {
  const s = { added: 0, removed: 0, modified: 0, unchanged: 0, changed: false };
  for (const b of blocks) s[b.type === 'same' ? 'unchanged' : b.type]++;
  s.changed = s.added + s.removed + s.modified > 0;
  return s;
}

// Collapses runs of unchanged blocks beyond `ctx` neighbours of a change into { type: 'gap', count, blocks }.
export function collapse(blocks, ctx = 1) {
  const keep = blocks.map(() => false);
  blocks.forEach((b, i) => { if (b.type !== 'same') for (let j = Math.max(0, i - ctx); j <= Math.min(blocks.length - 1, i + ctx); j++) keep[j] = true; });
  const out = [];
  blocks.forEach((b, i) => {
    if (keep[i]) return out.push(b);
    const last = out[out.length - 1];
    if (last && last.type === 'gap') { last.count++; last.blocks.push(b); } else out.push({ type: 'gap', count: 1, blocks: [b] });
  });
  return out;
}
