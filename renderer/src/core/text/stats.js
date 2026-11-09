export const SPEAK_WPM = 130;
export const READ_WPM = 230;

const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
const FM = /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEAD = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const WORD = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}\p{M}]+(?:['’_-][\p{L}\p{N}\p{M}]+)*/gu;

export const optsFrom = (get) => ({ wpm: get('stats.readingWpm'), noFront: get('stats.excludeFrontmatter'), noCode: get('stats.excludeCode') });

const cp = (t) => t.length - (t.match(/[\uDC00-\uDFFF]/g) || []).length;

export function countWords(t) {
  let n = 0;
  if (seg) { for (const s of seg.segment(t)) if (s.isWordLike) n++; return n; }
  const m = t.match(WORD);
  return m ? m.length : 0;
}

export function fmtTime(words, wpm) {
  const s = Math.round((words / wpm) * 60);
  if (s < 60) return `${s} sec`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

// docStats(text, { wpm, noFront, noCode }) -> counts; code fences are always skipped for headings/paragraphs.
export function docStats(text, { wpm = READ_WPM, noFront = false, noCode = false } = {}) {
  let src = text;
  if (noFront) src = src.replace(FM, '');
  let fence = null, headings = 0, paragraphs = 0, inPara = false;
  const kept = [];
  for (const line of src.split(/\r?\n/)) {
    const f = FENCE.exec(line);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !line.replace(FENCE, '').trim()) fence = null;
      else if (!noCode) kept.push(line);
      inPara = false;
      continue;
    }
    if (f) { fence = f[1]; inPara = false; continue; }
    kept.push(line);
    if (!line.trim()) inPara = false;
    else if (HEAD.test(line)) { headings++; inPara = false; }
    else if (!inPara) { inPara = true; paragraphs++; }
  }
  const body = kept.join('\n'), words = countWords(body), noSpace = body.replace(/\s/g, '');
  return { words, chars: cp(body), charsNoSpaces: cp(noSpace), paragraphs, headings, readSec: Math.round((words / wpm) * 60), speakSec: Math.round((words / SPEAK_WPM) * 60), wpm };
}

export const selStats = (parts, o) => docStats(parts.join('\n'), { wpm: o && o.wpm, noFront: false, noCode: false });
