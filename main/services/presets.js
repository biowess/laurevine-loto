import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from './fs/safe-path.js';
import { STARTER_PRESETS, starterConfig, presetFile, parsePresetFile, parseBundleOrSingle } from '../../shared/presets.js';

const MAX = 500000, RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const file = (dir, n) => path.join(dir, `${n}.json`);

function cleanName(name) {
  const n = String(name ?? '').trim();
  if (!n || n.length > 60 || /[\\/:*?"<>|,\x00-\x1f]/.test(n) || n.startsWith('.') || n.endsWith('.') || RESERVED.test(n)) throw new DocError('E_NAME', 'Enter a name of up to 60 characters without folders or reserved characters.');
  return n;
}
const need = (items, id) => {
  const t = items.find((x) => x.id === id);
  if (!t) throw new DocError('E_NOENT', 'Preset not found.');
  return t;
};
const taken = (items, n, except) => {
  if (items.some((x) => x.id !== except && x.name.toLowerCase() === n.toLowerCase())) throw new DocError('E_EXISTS', 'A preset with that name already exists.');
};
const unique = (items, base) => {
  let n = base, i = 2;
  while (items.some((x) => x.name.toLowerCase() === n.toLowerCase())) n = `${base} ${i++}`;
  return n;
};

async function seedStarters(dir) {
  await fsp.mkdir(dir, { recursive: true });
  for (const [name] of Object.entries(STARTER_PRESETS)) {
    const f = file(dir, name);
    try {
      await fsp.access(f);
    } catch {
      await fsp.writeFile(f, presetFile(name, starterConfig(name)), 'utf8');
    }
  }
}

async function put(dir, n, cfg) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(file(dir, n), presetFile(n, cfg), 'utf8');
  return { id: n };
}

export async function list(dir) {
  await seedStarters(dir).catch(() => {});
  let ents;
  try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents.filter((x) => x.isFile() && /\.json$/i.test(x.name)).sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const f = path.join(dir, e.name), n = e.name.slice(0, -5);
      if ((await fsp.stat(f)).size > MAX) continue;
      const parsed = parsePresetFile(await fsp.readFile(f, 'utf8'));
      if (parsed) out.push({ id: n, name: parsed.name || n, config: parsed.config, starter: n in STARTER_PRESETS });
    } catch { /* unreadable */ }
  }
  return out;
}

export async function save(dir, { name, config }) {
  const n = cleanName(name);
  if (!config) throw new DocError('E_INVALID', 'Invalid export configuration.');
  taken(await list(dir), n);
  return put(dir, n, config);
}

export async function update(dir, { id, name, config }) {
  const items = await list(dir), n = cleanName(name);
  need(items, id);
  taken(items, n, id);
  if (n !== id) await fsp.rename(file(dir, id), file(dir, n));
  if (config) await fsp.writeFile(file(dir, n), presetFile(n, config), 'utf8');
  return { id: n };
}

export async function duplicate(dir, { id }) {
  const items = await list(dir), t = need(items, id);
  return put(dir, unique(items, `${t.name} copy`), t.config);
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
      const list = parseBundleOrSingle(await fsp.readFile(f, 'utf8'));
      if (!list.length) throw new Error('empty');
      for (const item of list) {
        const n = unique(items, cleanName(item.name || path.basename(f).replace(/\.json$/i, '') || 'Imported'));
        await put(dir, n, item.config);
        items.push({ id: n, name: n, config: item.config });
        ids.push(n);
      }
    } catch { skipped++; }
  }
  return { ids, skipped };
}
