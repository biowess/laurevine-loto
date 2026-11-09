// worker_thread: walks the workspace and streams matches (content, filenames, frontmatter, code blocks).
import { parentPort } from 'node:worker_threads';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { isIgnored } from '../fs/tree.js';
import { buildRegex, findAll } from '../../../renderer/src/core/search/text-search.js';
import { SCOPES, scopedMatches } from '../../../renderer/src/core/search/scoped.js';

const TEXT = /\.(md|markdown|mdown|mdx|txt)$/i, CAP = 5000, DEPTH = 16, BIG = 10 * 1024 * 1024;

// No slash: matches a name at any depth; with slash: anchored at the workspace root. Matches folders as prefixes.
const glob = (g) => {
  const body = g.replace(/^\.?\//, '').replace(/\/+$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\0').replace(/\*\*/g, '\x01').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')
    .replace(/\0/g, '(?:.*/)?').replace(/\x01/g, '.*');
  return new RegExp(`${g.includes('/') ? '^' : '(?:^|/)'}${body}(?:/|$)`, 'i');
};

parentPort.on('message', (m) => run(m).catch((e) => parentPort.postMessage({ type: 'done', id: m.id, error: String((e && e.message) || e) })));

async function run({ id, root, query, scopes, caseSensitive, wholeWord, regex, include, exclude, max = CAP }) {
  const opts = { query, caseSensitive, wholeWord, regex };
  const { error } = buildRegex(opts);
  if (error) return parentPort.postMessage({ type: 'done', id, error });
  const inc = include.map(glob), exc = exclude.map(glob), sc = new Set(scopes);
  const wantText = SCOPES.some((s) => sc.has(s));
  let batch = [], total = 0, files = 0, last = Date.now(), truncated = false;
  const flush = () => { if (batch.length) parentPort.postMessage({ type: 'results', id, items: batch }); batch = []; last = Date.now(); };
  const add = (it) => {
    if (total >= max) { truncated = true; return false; }
    batch.push(it); total++;
    if (batch.length >= 100 || Date.now() - last > 100) flush();
    return true;
  };

  async function inText(rel) {
    const abs = path.join(root, rel);
    const st = await fsp.stat(abs);
    if (st.size > BIG) return true;
    const text = await fsp.readFile(abs, 'utf8');
    if (text.includes('\0')) return true;
    for (const it of scopedMatches(text, opts, sc, max).items) if (!add({ path: rel, ...it })) return false;
    return true;
  }

  const q = [['', 0]];
  walk: for (let n = 0; n < q.length; n++) {
    const [dir, depth] = q[n];
    let ents;
    try { ents = await fsp.readdir(path.join(root, dir), { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (isIgnored(e.name) || e.name.startsWith('.')) continue;
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (exc.some((g) => g.test(rel))) continue;
      if (e.isDirectory()) { if (depth < DEPTH) q.push([rel, depth + 1]); continue; }
      if (!e.isFile() || (inc.length && !inc.some((g) => g.test(rel)))) continue;
      files++;
      if (sc.has('filenames')) {
        const { matches } = findAll(e.name, opts, { limit: 1 });
        if (matches[0] && !add({ path: rel, scope: 'filenames', line: 0, text: e.name, from: matches[0].from, to: matches[0].to })) break walk;
      }
      if (wantText && TEXT.test(e.name)) {
        try { if (!(await inText(rel))) break walk; } catch { /* unreadable file */ }
      }
    }
  }
  flush();
  parentPort.postMessage({ type: 'done', id, total, files, truncated });
}
