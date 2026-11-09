// Edits are { from, to, insert } offsets into LF text.
// Returns the valid edits sorted by position with overlaps dropped.
export function cleanEdits(edits, len) {
  const ok = (edits || []).filter((e) => e && Number.isInteger(e.from) && Number.isInteger(e.to) && e.from >= 0 && e.to >= e.from && e.to <= len && typeof e.insert === 'string')
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const out = [];
  for (const e of ok) if (!out.length || e.from >= out[out.length - 1].to) out.push(e);
  return out;
}

export function applyEdits(text, edits) {
  let out = '', pos = 0;
  for (const e of edits) { out += text.slice(pos, e.from) + e.insert; pos = e.to; }
  return out + text.slice(pos);
}

export function lineAt(text, pos) {
  let n = 1;
  for (let i = text.indexOf('\n'); i >= 0 && i < pos; i = text.indexOf('\n', i + 1)) n++;
  return n;
}
