import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from './fs/safe-path.js';
import { writeJsonAtomic } from './store/json-store.js';
import { listTemplates, readMeta, MAX } from './templates.js';

const BAD = /[\\/:*?"<>|,\x00-\x1f]/g, RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const clean = (s, n) => String(s ?? '').trim().slice(0, n);
const stemOf = (t) => t.id.slice(5);
const file = (dir, stem) => path.join(dir, `${stem}.md`);

function cleanName(name) {
  const n = String(name ?? '').trim();
  if (!n || n.length > 60 || /[\\/:*?"<>|,\x00-\x1f]/.test(n) || n.startsWith('.') || n.endsWith('.') || RESERVED.test(n)) throw new DocError('E_NAME', 'Enter a name of up to 60 characters without folders or reserved characters.');
  return n;
}
function taken(items, name, exceptId) {
  if (items.some((t) => t.id !== exceptId && t.name.toLowerCase() === name.toLowerCase())) throw new DocError('E_EXISTS', 'A template with that name already exists.');
}
function find(items, id) {
  const t = items.find((x) => x.id === id);
  if (!t) throw new DocError('E_NOENT', 'Template not found.');
  return t;
}
function mine(t) {
  if (t.builtin) throw new DocError('E_READONLY', 'Built-in templates are read-only. Duplicate one to change it.');
  return stemOf(t);
}
async function setMeta(dir, stem, m) {
  const all = await readMeta(dir);
  if (m) all[stem] = m; else delete all[stem];
  await writeJsonAtomic(path.join(dir, '_meta.json'), all);
}
async function create(dir, name, description, category, text) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(file(dir, name), text, { flag: 'wx' });
  await setMeta(dir, name, { description: clean(description, 200), category: clean(category, 30) || 'Yours' });
  return { id: `user:${name}` };
}
const unique = (items, base) => {
  let n = base, i = 2;
  while (items.some((x) => x.name.toLowerCase() === n.toLowerCase())) n = `${base} ${i++}`;
  return n;
};

export const getTemplate = async (dir, id) => find(await listTemplates(dir), id);

export async function save(dir, { name, description, category, text }) {
  const n = cleanName(name);
  if (text.length > MAX) throw new DocError('E_SIZE', 'The template is too large.');
  taken(await listTemplates(dir), n);
  return create(dir, n, description, category, text);
}

export async function update(dir, { id, name, description, category }) {
  const items = await listTemplates(dir), t = find(items, id), stem = mine(t), n = cleanName(name ?? t.name);
  taken(items, n, id);
  if (n !== stem) { await fsp.rename(file(dir, stem), file(dir, n)); await setMeta(dir, stem, null); }
  await setMeta(dir, n, { description: clean(description ?? t.description, 200), category: clean(category ?? t.category, 30) || 'Yours' });
  return { id: `user:${n}` };
}

export async function duplicate(dir, { id }) {
  const items = await listTemplates(dir), t = find(items, id);
  return create(dir, unique(items, `${t.name} copy`), t.description, t.category, t.text);
}

export async function remove(dir, { id }, trash) {
  const stem = mine(find(await listTemplates(dir), id));
  await trash(file(dir, stem));
  await setMeta(dir, stem, null);
}

export async function importFiles(dir, paths) {
  const ids = [];
  let skipped = 0;
  for (const p of paths) {
    try {
      if ((await fsp.stat(p)).size > MAX) { skipped++; continue; }
      const text = (await fsp.readFile(p, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      const base = path.basename(p).replace(/\.[^.]*$/, '').replace(BAD, '-').trim().slice(0, 60).replace(/^\.+|\.+$/g, '') || 'Imported';
      ids.push((await create(dir, unique(await listTemplates(dir), base), 'Imported template.', 'Yours', text)).id);
    } catch { skipped++; }
  }
  return { ids, skipped };
}
