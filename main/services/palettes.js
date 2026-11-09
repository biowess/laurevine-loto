import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from './fs/safe-path.js';
import { cleanPalette, paletteFile, parsePaletteFile } from '../../shared/palette.js';

const MAX = 20000, RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const file = (dir, n) => path.join(dir, `${n}.json`);

function cleanName(name) {
  const n = String(name ?? '').trim();
  if (!n || n.length > 60 || /[\\/:*?"<>|,\x00-\x1f]/.test(n) || n.startsWith('.') || n.endsWith('.') || RESERVED.test(n)) throw new DocError('E_NAME', 'Enter a name of up to 60 characters without folders or reserved characters.');
  return n;
}
const need = (items, id) => {
  const t = items.find((x) => x.id === id);
  if (!t) throw new DocError('E_NOENT', 'Palette not found.');
  return t;
};
const taken = (items, n, except) => {
  if (items.some((x) => x.id !== except && x.name.toLowerCase() === n.toLowerCase())) throw new DocError('E_EXISTS', 'A palette with that name already exists.');
};
const unique = (items, base) => {
  let n = base, i = 2;
  while (items.some((x) => x.name.toLowerCase() === n.toLowerCase())) n = `${base} ${i++}`;
  return n;
};
async function put(dir, n, p) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(file(dir, n), paletteFile(p), { flag: 'wx' });
  return { id: n };
}

export async function list(dir) {
  let ents;
  try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents.filter((x) => x.isFile() && /\.json$/i.test(x.name)).sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const f = path.join(dir, e.name), n = e.name.slice(0, -5);
      if ((await fsp.stat(f)).size > MAX) continue;
      const palette = parsePaletteFile(await fsp.readFile(f, 'utf8'));
      if (palette) out.push({ id: n, name: n, palette });
    } catch { /* unreadable palette: skipped */ }
  }
  return out;
}

export async function save(dir, { name, palette }) {
  const n = cleanName(name), p = cleanPalette(palette);
  if (!p) throw new DocError('E_INVALID', 'The palette is not valid.');
  taken(await list(dir), n);
  return put(dir, n, p);
}

export async function update(dir, { id, name }) {
  const items = await list(dir), n = cleanName(name);
  need(items, id); taken(items, n, id);
  if (n !== id) await fsp.rename(file(dir, id), file(dir, n));
  return { id: n };
}

export async function duplicate(dir, { id }) {
  const items = await list(dir), t = need(items, id);
  return put(dir, unique(items, `${t.name} copy`), t.palette);
}

export async function remove(dir, { id }, trash) {
  need(await list(dir), id);
  await trash(file(dir, id));
}

export const get = async (dir, id) => need(await list(dir), id);

export async function importFiles(dir, paths) {
  const items = await list(dir), ids = [];
  let skipped = 0;
  for (const f of paths) {
    try {
      if ((await fsp.stat(f)).size > MAX) throw new Error('size');
      const p = parsePaletteFile(await fsp.readFile(f, 'utf8'));
      if (!p) throw new Error('invalid');
      const n = unique(items, cleanName(path.basename(f).replace(/\.json$/i, '').slice(0, 60) || 'Imported'));
      await put(dir, n, p);
      items.push({ id: n, name: n });
      ids.push(n);
    } catch { skipped++; }
  }
  return { ids, skipped };
}
