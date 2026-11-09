// Pure: ranges of the current paragraph / sentence in a CodeMirror-like Text (lineAt, line, lines, sliceString).
export function paragraphRange(doc, pos) {
  let a = doc.lineAt(pos).number, b = a;
  const blank = (n) => !doc.line(n).text.trim();
  if (blank(a)) return [doc.line(a).from, doc.line(a).to];
  while (a > 1 && !blank(a - 1)) a--;
  while (b < doc.lines && !blank(b + 1)) b++;
  return [doc.line(a).from, doc.line(b).to];
}

export function sentenceIn(text, i) {
  const re = /[.!?…]+["'”’)\]]*(\s+|$)/g;
  let start = 0, m;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    if (i < end) return [start, m.index + m[0].trimEnd().length];
    start = end;
  }
  return [start, text.length];
}

export function focusRange(doc, pos, scope) {
  const [from, to] = paragraphRange(doc, pos);
  if (scope !== 'sentence') return [from, to];
  const [a, b] = sentenceIn(doc.sliceString(from, to), pos - from);
  return [from + a, from + b];
}

// Eased scroll step toward a target; snaps when within half a pixel.
export const easeStep = (cur, target, k = 0.2) => (Math.abs(target - cur) < 0.5 ? target : cur + (target - cur) * k);
