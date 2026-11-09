// worker_thread: read-only scan of a folder (or an extracted ZIP). Nothing in the source is written, executed or followed through links.
import { parentPort } from 'node:worker_threads';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { isIgnored } from '../fs/tree.js';
import { extractZip, unwrap } from './extract.js';
import { analyzeDocument } from '../../../renderer/src/core/migration/analyze.js';
import { OBSIDIAN_FILES } from '../../../renderer/src/core/migration/obsidian.js';
import { buildReport, classify } from '../../../renderer/src/core/migration/report.js';

const MAX_FILES = 100000, MAX_DEPTH = 40, BIG_DOC = 10 * 1024 * 1024, BIG_CONFIG = 1024 * 1024;
const post = (m) => parentPort.postMessage(m);

parentPort.on('message', (m) => run(m).catch((e) => post({ type: 'done', id: m.id, error: String((e && e.message) || e) })));

async function run({ id, source, kind, tmp }) {
  let root = source;
  const skipped = [], warnings = [];
  if (kind === 'zip') {
    const x = await extractZip(source, tmp);
    skipped.push(...x.skipped);
    root = await unwrap(tmp);
    if (!x.files) warnings.push('The archive contains no extractable files.');
    if (x.skipped.some((s) => s.reason === 'unsafe path')) warnings.push('The archive contains unsafe paths; importing it will be refused.');
  } else if (!(await fsp.stat(source)).isDirectory()) throw new Error('The source is not a folder.');

  const files = [], docs = [], config = {};
  let last = Date.now(), bytes = 0, truncated = false;
  const tick = (force) => { if (force || Date.now() - last > 100) { post({ type: 'progress', id, files: files.length, documents: docs.length, bytes }); last = Date.now(); } };
  const queue = [['', 0]];
  for (let n = 0; n < queue.length && !truncated; n++) {
    const [dir, depth] = queue[n];
    let ents;
    try { ents = await fsp.readdir(path.join(root, dir), { withFileTypes: true }); } catch { skipped.push({ path: dir || '.', reason: 'folder could not be read' }); continue; }
    for (const d of ents) {
      const rel = dir ? `${dir}/${d.name}` : d.name;
      if (isIgnored(d.name) || d.name.toLowerCase() === '.trash') continue;
      if (d.isSymbolicLink()) { skipped.push({ path: rel, reason: 'symbolic link not followed' }); continue; }
      if (d.isDirectory()) { if (depth < MAX_DEPTH) queue.push([rel, depth + 1]); else skipped.push({ path: rel, reason: 'too deep' }); continue; }
      if (!d.isFile()) continue;
      if (files.length >= MAX_FILES) { truncated = true; warnings.push(`Stopped after ${MAX_FILES.toLocaleString('en-US')} files.`); break; }
      let size = 0;
      try { size = (await fsp.stat(path.join(root, rel))).size; } catch { skipped.push({ path: rel, reason: 'could not be read' }); continue; }
      files.push({ path: rel, size });
      bytes += size;
      const k = classify(rel);
      try {
        if (k === 'document') {
          if (size > BIG_DOC) { skipped.push({ path: rel, reason: 'too large to analyse' }); continue; }
          const text = await fsp.readFile(path.join(root, rel), 'utf8');
          if (text.includes('\0')) { skipped.push({ path: rel, reason: 'binary content' }); continue; }
          docs.push({ path: rel, size, a: analyzeDocument(text) });
        } else if (k === 'config' && OBSIDIAN_FILES.includes(rel.slice('.obsidian/'.length)) && size <= BIG_CONFIG) {
          config[rel.slice('.obsidian/'.length)] = await fsp.readFile(path.join(root, rel), 'utf8');
        }
      } catch { skipped.push({ path: rel, reason: 'could not be read' }); }
      tick(false);
    }
  }
  tick(true);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const name = path.basename(source).replace(/\.zip$/i, '');
  post({ type: 'done', id, report: buildReport({ name, fromZip: kind === 'zip', files, docs, config, skipped, warnings }) });
}
