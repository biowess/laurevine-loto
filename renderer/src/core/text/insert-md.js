// Pure: Insert commands for extended Markdown. State {text, selections}; each returns {changes, selections} (original coords, like core/text/code.js).
export const CALLOUTS = [['note', 'Note'], ['tip', 'Tip'], ['important', 'Important'], ['warning', 'Warning'], ['caution', 'Caution'], ['info', 'Info'], ['success', 'Success'], ['question', 'Question'], ['danger', 'Danger'], ['bug', 'Bug'], ['example', 'Example'], ['quote', 'Quote']];
export const HTML_KINDS = [['details', 'Details / summary'], ['div', 'Div'], ['figure', 'Figure with caption'], ['centered', 'Centered block'], ['columns', 'Two columns'], ['table', 'HTML table'], ['aside', 'Aside / note box'], ['video', 'Video'], ['audio', 'Audio'], ['spacer', 'Vertical spacer'], ['comment', 'Comment']];

const ls = (t, p) => t.lastIndexOf('\n', p - 1) + 1;
const le = (t, p) => { const i = t.indexOf('\n', p); return i < 0 ? t.length : i; };
const main = (s) => { const r = s.selections[0]; return { from: Math.min(r.anchor, r.head), to: Math.max(r.anchor, r.head) }; };
const res = (changes, anchor, head = anchor) => ({ changes: [].concat(changes), selections: [{ anchor, head }] });
const blank = (t, a, b) => !t.slice(a, b).trim();

// Replace the whole lines touched by the selection with make(body) -> [text, wordToSelect], padded with blank lines.
function wrapLines(s, make) {
  const t = s.text, { from, to } = main(s);
  const a = ls(t, from), b = le(t, to > from && t[to - 1] === '\n' ? to - 1 : to);
  const body = blank(t, a, b) ? '' : t.slice(a, b);
  const pre = a > 0 && !blank(t, ls(t, a - 1), a - 1) ? '\n' : '';
  const post = b < t.length && !blank(t, b + 1, le(t, b + 1)) ? '\n' : '';
  const [text, word] = make(body), k = word ? text.indexOf(word) : -1, base = a + pre.length;
  return k < 0 ? res({ from: a, to: b, insert: pre + text + post }, base + text.length) : res({ from: a, to: b, insert: pre + text + post }, base + k, base + k + word.length);
}

// Insert a standalone block after the caret's line.
function after(s, text) {
  const t = s.text, p = le(t, main(s).to), empty = blank(t, ls(t, p), p);
  const post = p < t.length && !blank(t, p + 1, le(t, p + 1)) ? '\n' : '';
  const insert = (empty ? '' : '\n\n') + text + post;
  return res({ from: p, to: p, insert }, p + insert.length - post.length);
}

// Definition appended at the document end, grouped with existing definitions of the same kind.
function endDef(t, def, isDef) {
  const last = t.replace(/\s+$/, '').split('\n').pop(), trail = /\n*$/.exec(t)[0].length;
  const sep = t.trim() ? '\n'.repeat(Math.max(0, (isDef.test(last) ? 1 : 2) - trail)) : '';
  return sep + def;
}

export const callout = (s, type) => wrapLines(s, (b) => [`> [!${type.toUpperCase()}]\n` + (b ? b.split('\n').map((l) => (l.trim() ? `> ${l}` : '>')).join('\n') : '> '), '']);

export function footnote(s) {
  const t = s.text, { to } = main(s), used = new Set([...t.matchAll(/\[\^(\d+)\]/g)].map((m) => +m[1]));
  let n = 1;
  while (used.has(n)) n++;
  const ref = `[^${n}]`, def = endDef(t, `[^${n}]: `, /^\[\^[^\]\s]+\]:/);
  return res([{ from: to, to, insert: ref }, { from: t.length, to: t.length, insert: def }], t.length + ref.length + def.length);
}

export const deflist = (s, term, defs) => wrapLines(s, (b) => {
  if (term == null) return b ? [`${b}\n: Definition`, 'Definition'] : ['Term\n: Definition', 'Term'];
  const d = (defs || []).map((x) => String(x).trim()).filter(Boolean);
  return [`${String(term).trim() || 'Term'}\n` + (d.length ? d : ['Definition']).map((x) => `: ${x}`).join('\n'), ''];
});

export function abbr(s, term, expansion) {
  term = String(term).trim(); expansion = String(expansion).trim();
  if (!term || !expansion || /[\]\n]/.test(term) || /\n/.test(expansion)) return null;
  const r = s.selections[0];
  return { changes: [{ from: s.text.length, to: s.text.length, insert: endDef(s.text, `*[${term}]: ${expansion}`, /^\*\[[^\]]+\]:/) }], selections: [{ anchor: r.anchor, head: r.head }] };
}

const HTML = {
  details: (b) => ['<details>\n<summary>Summary</summary>\n' + (b || 'Content') + '\n</details>', 'Summary'],
  div: (b) => ['<div>\n' + (b || 'Content') + '\n</div>', b ? '' : 'Content'],
  centered: (b) => ['<div style="text-align: center">\n' + (b || 'Centered content') + '\n</div>', b ? '' : 'Centered content'],
  columns: (b) => ['<div style="display: flex; gap: 1em">\n<div style="flex: 1">\n' + (b || 'Left column') + '\n</div>\n<div style="flex: 1">\nRight column\n</div>\n</div>', b ? '' : 'Left column'],
  table: (b) => ['<table>\n<thead>\n<tr><th>Header</th><th>Header</th></tr>\n</thead>\n<tbody>\n<tr><td>' + (b || 'Cell') + '</td><td>Cell</td></tr>\n</tbody>\n</table>', b ? '' : 'Cell'],
  aside: (b) => ['<aside style="border-left: 4px solid #888; padding: .5em 1em">\n' + (b || 'Note') + '\n</aside>', b ? '' : 'Note'],
  video: () => ['<video src="video.mp4" controls width="480"></video>', 'video.mp4'],
  audio: () => ['<audio src="audio.mp3" controls></audio>', 'audio.mp3'],
  spacer: () => ['<div style="height: 2em"></div>', ''],
  comment: (b) => ['<!-- ' + (b || 'Comment') + ' -->', b ? '' : 'Comment'],
  figure: (b) => ['<figure>\n<img src="image.png" alt="Description">\n<figcaption>' + (b || 'Caption') + '</figcaption>\n</figure>', 'image.png'],
};
export const htmlTemplate = (kind, body = '') => (HTML[kind] || HTML.div)(body)[0];
export const htmlBlock = (s, kind, code) => wrapLines(s, code == null ? HTML[kind] || HTML.div : () => [String(code).replace(/\s+$/, ''), '']);

export const MERMAID_KINDS = [['flowchart', 'Flowchart'], ['sequence', 'Sequence diagram'], ['gantt', 'Gantt chart']];
const MM = {
  flowchart: 'flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do it]\n    B -->|No| D[Skip]\n    C --> E[End]\n    D --> E',
  sequence: 'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello\n    B-->>A: Hi there',
  gantt: 'gantt\n    title Plan\n    dateFormat YYYY-MM-DD\n    section Work\n    Task one :a1, 2025-01-01, 7d\n    Task two :after a1, 5d',
};
export const mermaid = (s, kind) => after(s, '```mermaid\n' + (MM[kind] || MM.flowchart) + '\n```');

export const pageBreak = (s) => after(s, '<!-- laurevine:pagebreak -->');
