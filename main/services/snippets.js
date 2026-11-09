import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { DocError } from './fs/safe-path.js';
import { cleanName, cleanTrigger, parseSnippetFile, snippetFile, STARTER_SNIPPETS } from '../../shared/snippets.js';

const MAX = 50000;
const file = (dir, n) => path.join(dir, `${n}.json`);

const need = (items, id) => {
  const t = items.find((x) => x.id === id);
  if (!t) throw new DocError('E_NOENT', 'Snippet not found.');
  return t;
};
const taken = (items, n, except) => {
  if (items.some((x) => x.id !== except && x.name.toLowerCase() === n.toLowerCase())) {
    throw new DocError('E_EXISTS', 'A snippet with that name already exists.');
  }
};
const unique = (items, base) => {
  let n = base, i = 2;
  while (items.some((x) => x.name.toLowerCase() === n.toLowerCase())) n = `${base} ${i++}`;
  return n;
};

async function put(dir, s) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(file(dir, s.name), snippetFile(s), { flag: 'w' });
  return { id: s.name };
}

export async function list(dir) {
  let ents;
  try {
    ents = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    await fsp.mkdir(dir, { recursive: true });
    for (const s of STARTER_SNIPPETS) {
      try { await fsp.writeFile(file(dir, s.name), snippetFile(s), { flag: 'wx' }); } catch { /* ignore */ }
    }
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
  }
  const jsonFiles = ents.filter((x) => x.isFile() && /\.json$/i.test(x.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (jsonFiles.length === 0) {
    for (const s of STARTER_SNIPPETS) {
      try { await fsp.writeFile(file(dir, s.name), snippetFile(s), { flag: 'wx' }); } catch { /* ignore */ }
    }
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
  }
  const out = [];
  for (const e of ents.filter((x) => x.isFile() && /\.json$/i.test(x.name)).sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const f = path.join(dir, e.name), n = e.name.slice(0, -5);
      if ((await fsp.stat(f)).size > MAX) continue;
      const s = parseSnippetFile(await fsp.readFile(f, 'utf8'));
      if (s) out.push({ id: n, ...s });
    } catch { /* unreadable: skipped */ }
  }
  return out;
}

export async function save(dir, { name, trigger, body, scope }) {
  const n = cleanName(name), t = cleanTrigger(trigger);
  const items = await list(dir);
  taken(items, n);
  return put(dir, { name: n, trigger: t, body: String(body || ''), scope: String(scope || '') });
}

export async function update(dir, { id, name, trigger, body, scope }) {
  const items = await list(dir);
  const prev = need(items, id);
  const n = cleanName(name || prev.name), t = cleanTrigger(trigger || prev.trigger);
  taken(items, n, id);
  if (n !== id) {
    await fsp.unlink(file(dir, id));
  }
  return put(dir, { name: n, trigger: t, body: body != null ? String(body) : prev.body, scope: scope != null ? String(scope) : prev.scope });
}

export async function duplicate(dir, { id }) {
  const items = await list(dir), t = need(items, id);
  const n = unique(items, `${t.name} copy`);
  return put(dir, { name: n, trigger: t.trigger, body: t.body, scope: t.scope });
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
      const s = parseSnippetFile(await fsp.readFile(f, 'utf8'));
      if (!s) throw new Error('invalid');
      const n = unique(items, cleanName(s.name || path.basename(f).replace(/\.json$/i, '').slice(0, 60) || 'Imported'));
      await put(dir, { ...s, name: n });
      items.push({ id: n, name: n, trigger: s.trigger });
      ids.push(n);
    } catch { skipped++; }
  }
  return { ids, skipped };
}
