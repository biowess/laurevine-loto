import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { isIgnored } from './tree.js';

const MAX = 20000, DEPTH = 16, TTL = 15000;
const cache = new Map();

async function walk(root, showHidden) {
  const files = [], dirs = [''], depths = [0];
  for (let i = 0; i < dirs.length; i++) {
    let ents;
    try { ents = await fsp.readdir(path.join(root, dirs[i]), { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (isIgnored(e.name) || (!showHidden && e.name.startsWith('.'))) continue;
      const rel = dirs[i] ? `${dirs[i]}/${e.name}` : e.name;
      if (e.isDirectory()) { if (depths[i] < DEPTH) { dirs.push(rel); depths.push(depths[i] + 1); } }
      else if (e.isFile()) { if (files.length >= MAX) return { files, truncated: true }; files.push(rel); }
    }
  }
  return { files, truncated: false };
}

export function listFiles(root, { showHidden = false, refresh = false } = {}) {
  const key = `${root}\0${showHidden}`, hit = cache.get(key);
  if (!refresh && hit && Date.now() - hit.at < TTL) return hit.p;
  const p = walk(root, showHidden);
  if (cache.size >= 8) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), p });
  p.catch(() => cache.delete(key));
  return p;
}
