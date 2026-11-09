// worker_thread: walks the workspace (or only the given folders), stats files and scans the changed Markdown ones.
import { parentPort } from 'node:worker_threads';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { isIgnored } from '../fs/tree.js';
import { scanText, compact } from './scanner.js';

const MD = /\.(md|markdown|mdown)$/i, CAP = 20000, DEPTH = 16;

parentPort.on('message', async (m) => {
  try { parentPort.postMessage({ type: 'done', id: m.id, ...(await job(m)) }); } catch (e) { parentPort.postMessage({ type: 'error', id: m.id, message: String((e && e.message) || e) }); }
});

// known: { rel: [mtimeMs, size] }. Unchanged files are reported as { p, same: true } and never read.
async function job({ id, root, mode, dirs = [], known = {}, maxBytes }) {
  const found = [], seen = new Set(), listed = [], gone = [], knownDirs = new Set();
  let truncated = false, last = 0;
  const tick = (phase, done, total) => { const t = Date.now(); if (t - last > 100) { last = t; parentPort.postMessage({ type: 'progress', id, phase, done, total }); } };
  if (mode !== 'full') for (const p of Object.keys(known)) for (let i = p.lastIndexOf('/'); i > 0; i = p.lastIndexOf('/', i - 1)) knownDirs.add(p.slice(0, i));

  async function walk(start, all) {
    const q = [[start, 0]];
    for (let n = 0; n < q.length; n++) {
      const [rel, depth] = q[n];
      let ents;
      try { ents = await fsp.readdir(path.join(root, rel), { withFileTypes: true }); } catch { if (mode !== 'full') gone.push(rel); continue; }
      listed.push(rel);
      for (const e of ents) {
        if (isIgnored(e.name) || e.name.startsWith('.')) continue;
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) { if (depth < DEPTH && (all || !knownDirs.has(r))) q.push([r, depth + 1]); }
        else if (e.isFile() && !seen.has(r)) { if (found.length >= CAP) { truncated = true; return; } seen.add(r); found.push(r); }
      }
      tick('walk', found.length, 0);
    }
  }
  if (mode === 'full') await walk('', true); else for (const d of dirs) await walk(d, false);

  const entries = [], todo = [];
  for (const p of found) {
    let st;
    try { st = await fsp.stat(path.join(root, p)); } catch { continue; }
    const k = known[p];
    if (k && k[0] === st.mtimeMs && k[1] === st.size) entries.push({ p, same: true }); else todo.push([p, st]);
  }
  for (let i = 0; i < todo.length; i++) {
    const [p, st] = todo[i], e = { p, m: st.mtimeMs, s: st.size };
    if (st.size > maxBytes) e.big = true;
    else if (MD.test(p)) { try { Object.assign(e, compact(scanText(await fsp.readFile(path.join(root, p), 'utf8')))); } catch { /* unreadable: listed without content */ } }
    entries.push(e);
    tick('scan', i + 1, todo.length);
  }
  return { full: mode === 'full', entries, listed, gone, truncated };
}
