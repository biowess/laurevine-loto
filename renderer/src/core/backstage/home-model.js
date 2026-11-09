export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : 'Good evening';
};

export const parentDir = (p) => p.replace(/[\\/][^\\/]*$/, '');
export const parentName = (p) => parentDir(p).split(/[\\/]/).pop() || parentDir(p);

// Adds `hint` (parent folder) to every item whose file name appears more than once.
export function labelItems(items) {
  const n = new Map();
  for (const i of items) n.set(i.name.toLowerCase(), (n.get(i.name.toLowerCase()) || 0) + 1);
  return items.map((i) => ({ ...i, hint: n.get(i.name.toLowerCase()) > 1 ? parentName(i.path) : '' }));
}

export const matches = (q, ...fields) => {
  const s = String(q || '').trim().toLowerCase();
  return !s || fields.some((f) => String(f || '').toLowerCase().includes(s));
};

export const parseTemplates = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
export const templateTitle = (id) => id.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
