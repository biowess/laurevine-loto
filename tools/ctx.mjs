import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CM = path.join(root, 'CODEMAP.md');
const CL = path.join(root, 'CHANGELOG.md');
const STAMP = path.join(root, '.ctx-stamp');
const SKIP = /(^|\/)(node_modules|node-compile-cache|\.git)(\/|$)/;
const [cmd, ...args] = process.argv.slice(2);
const read = (f) => fs.readFileSync(f, 'utf8');
const stdin = () => fs.readFileSync(0, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const rowPath = (l) => (l.match(/^\| `([^`]+)` \|/) || [])[1];
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    const rel = path.relative(root, p).split(path.sep).join('/');
    if (SKIP.test(rel)) continue;
    e.isDirectory() ? walk(p, out) : out.push(rel);
  }
  return out;
};

if (cmd === 'find') {
  const ks = args.map((a) => a.toLowerCase());
  let n = 0;
  for (const l of read(CM).split('\n')) {
    const p = rowPath(l);
    if (!p || !ks.every((k) => l.toLowerCase().includes(k))) continue;
    console.log(`${p} — ${cut(l.split('|')[2].trim(), 110)}`);
    if (++n >= 15) break;
  }
} else if (cmd === 'row') {
  for (const l of read(CM).split('\n')) if (rowPath(l) === args[0]) console.log(cut(l, 700));
} else if (cmd === 'api') {
  const t = read(path.join(root, args[0])).split('\n');
  console.log(`${args[0]}: ${t.length} lines`);
  let n = 0;
  t.forEach((l, i) => { if (/^export /.test(l) && n++ < 40) console.log(`${i + 1}: ${cut(l, 140)}`); });
} else if (cmd === 'map') {
  const L = read(CM).split('\n');
  for (const s of stdin()) {
    const [p, a, b, c] = s.split('|').map((x) => x.trim());
    const row = `| \`${p}\` | ${a} | ${b} | ${c} |`;
    const i = L.findIndex((l) => rowPath(l) === p);
    if (i >= 0) { L[i] = row; continue; }
    let j = -1;
    L.forEach((l, k) => { const q = rowPath(l); if (q && path.dirname(q) === path.dirname(p)) j = k; });
    j < 0 ? L.splice(L.length - 1, 0, row) : L.splice(j + 1, 0, row);
  }
  fs.writeFileSync(CM, L.join('\n'));
} else if (cmd === 'log') {
  fs.appendFileSync(CL, `\n## Part ${args[0]}\n${stdin().slice(0, 4).join('\n')}\n`);
} else if (cmd === 'slim') {
  const max = Number(args[0]) || 180;
  const L = read(CM).split('\n').map((l) => {
    if (!rowPath(l)) return l;
    const c = l.split('|');
    for (let i = 2; i < c.length - 1; i++) c[i] = ' ' + cut(c[i].trim().replace(/[;.]?\s*\d{2}[a-z]\d?:.*$/, ''), max) + ' ';
    return c.join('|');
  });
  fs.writeFileSync(CM, L.join('\n'));
} else if (cmd === 'start') {
  fs.writeFileSync(STAMP, '');
} else if (cmd === 'ship') {
  const st = fs.statSync(STAMP).mtimeMs;
  const bad = [];
  for (const f of walk(root)) {
    if (!/\.(m?js|cjs)$/.test(f) || f.startsWith('renderer/vendor/')) continue;
    if (fs.statSync(path.join(root, f)).mtimeMs <= st) continue;
    try { execFileSync('node', ['--check', path.join(root, f)], { stdio: 'pipe' }); }
    catch (e) { bad.push(`${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); }
  }
  if (bad.length) { console.log('SYNTAX ERRORS:\n' + bad.join('\n')); process.exit(1); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-'));
  fs.symlinkSync(root, path.join(tmp, 'laurevine-loto'));
  const out = path.resolve(args[0]);
  fs.rmSync(out, { force: true });
  execFileSync('zip', ['-qr', out, 'laurevine-loto', '-x', '*/node_modules/*', '*/node-compile-cache/*', '*/.ctx-stamp', '*/uv-*.lock'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true });
  console.log('shipped ' + out);
} else console.log('cmds: find <kw..> | row <path> | api <path> | map (stdin: path|purpose|api|deps) | log <part> (stdin) | slim [n] | start | ship <zip>');
