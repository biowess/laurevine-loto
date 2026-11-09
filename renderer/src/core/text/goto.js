// Pure: parse "line" or "line:column" against a line count and a line-length lookup.
export function parseGoto(input, lines, lenOf) {
  const m = /^\s*(\d+)\s*(?::\s*(\d+)\s*)?$/.exec(input);
  if (!m) return { error: 'Enter a line number or line:column' };
  const line = Number(m[1]), col = m[2] == null ? 1 : Number(m[2]);
  if (line < 1 || line > lines) return { error: `Line must be between 1 and ${lines}` };
  const max = lenOf(line) + 1;
  if (col < 1 || col > max) return { error: `Column must be between 1 and ${max} on line ${line}` };
  return { line, col };
}
