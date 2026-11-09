// Pure: Table Editor input cleaning and validation (cell text, size limits).
import { normalise } from './ops.js';
import { MAX } from './edit.js';

export const MAX_CELL = 1000;
export const cleanCell = (s) => String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
export const cellError = (s) => (s.length > MAX_CELL ? `A cell can hold at most ${MAX_CELL} characters` : '');
export const tidy = (m) => { const n = normalise(m); return { ...n, header: n.header.map(cleanCell), rows: n.rows.map((r) => r.map(cleanCell)) }; };
export function modelError(m) {
  if (m.rows.length + 1 > MAX.rows) return `A table can have at most ${MAX.rows} rows`;
  if (m.header.length > MAX.cols) return `A table can have at most ${MAX.cols} columns`;
  const bad = [m.header, ...m.rows].flat().find((c) => cellError(c));
  return bad == null ? '' : cellError(bad);
}
