// Pure path helpers for the renderer; real validation happens in main/.
const WIN = /^([a-zA-Z]:[\\/]|\\\\)/;
export const baseName = (p) => String(p).split(/[\\/]/).filter(Boolean).pop() || String(p);
export const samePath = (a, b) => !!a && !!b && (a === b || (WIN.test(a) && a.toLowerCase() === b.toLowerCase()));
export const isTextName = (n) => /\.(md|markdown|mdown|txt)$/i.test(n);
export function validatePath(s) {
  const p = String(s ?? '').trim();
  if (!p) return 'Enter a file path.';
  if (p.includes('\0') || p.length > 4096) return 'That path is not valid.';
  if (!/^([a-zA-Z]:[\\/]|[\\/])/.test(p)) return 'Use an absolute path, for example /home/me/notes.md or C:\\notes\\a.md.';
  return null;
}
