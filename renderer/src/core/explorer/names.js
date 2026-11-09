const BAD = /[<>:"/\\|?*\u0000-\u001f]/;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

export function checkName(name, siblings = [], self = '') {
  if (!name.trim()) return 'Enter a name.';
  if (name === '.' || name === '..') return 'That name is not allowed.';
  const bad = name.match(BAD);
  if (bad) return bad[0] < ' ' ? 'Names cannot contain control characters.' : `Names cannot contain "${bad[0]}".`;
  if (/[. ]$/.test(name)) return 'Names cannot end with a dot or a space.';
  if (RESERVED.test(name)) return 'That name is reserved by the system.';
  if (name.length > 255) return 'That name is too long.';
  const l = name.toLowerCase();
  if (l !== self.toLowerCase() && siblings.some((s) => s.toLowerCase() === l)) return `"${name}" already exists here.`;
  return null;
}

export const withExt = (name, mode, ext = 'md') => (mode === 'file' && name.trim() && !/\.[^./\\]+$/.test(name) ? `${name}.${ext}` : name);

export const relPath = (root, p) => p.slice(root.length).replace(/^[\\/]+/, '').replace(/\\/g, '/');
