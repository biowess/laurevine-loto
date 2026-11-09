// Pure: terminal-style display width (CJK/emoji wide, marks and joiners zero).
const WIDE = [[0x1100, 0x115f], [0x2e80, 0x303e], [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x20000, 0x3fffd]];
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;

function graphemeWidth(g) {
  const cp = g.codePointAt(0);
  if (/^[\p{M}\p{Cc}\u200b-\u200f\u2060\ufeff]/u.test(g)) return 0;
  if (g.includes('\ufe0f') || /^\p{Emoji_Presentation}/u.test(g)) return 2;
  return WIDE.some(([a, b]) => cp >= a && cp <= b) ? 2 : 1;
}

export function displayWidth(s) {
  let w = 0;
  for (const { segment } of SEG ? SEG.segment(s) : [...s].map((segment) => ({ segment }))) w += graphemeWidth(segment);
  return w;
}
