#!/usr/bin/env node
// Guardrails for Laurevine Loto. Zero dependencies. Run: npm run check
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 400;
const CAPPED_ROOTS = ['main', 'shared', 'renderer/src', 'renderer/styles', 'tools', 'tests'];
const SCAN_ROOTS = ['main', 'shared', 'renderer', 'tools', 'tests'];
const SOURCE_EXT = new Set(['.js', '.cjs', '.mjs', '.css', '.html']);
const CODE_EXT = new Set(['.js', '.cjs', '.mjs', '.css']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'fonts', 'assets']);
const FEATURE = /^renderer\/src\/features\/([^/]+)\//;

const errors = [];
const fail = (message) => errors.push(message);
const toRel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const inDir = (rel, dir) => rel === dir || rel.startsWith(`${dir}/`);
const isLegacy = (rel) => rel.split('/').includes('legacy');
const countLines = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) out.push(full);
    else if (!SKIP_DIRS.has(entry.name)) walk(full, out);
  }
  return out;
}

const sources = SCAN_ROOTS
  .flatMap((root) => walk(path.join(ROOT, root)))
  .filter((file) => SOURCE_EXT.has(path.extname(file)))
  .map((file) => ({ file, rel: toRel(file), ext: path.extname(file), text: readFileSync(file, 'utf8') }));

// 1. Line cap (legacy and vendor code is exempt).
for (const src of sources) {
  if (!CODE_EXT.has(src.ext) || isLegacy(src.rel)) continue;
  if (!CAPPED_ROOTS.some((root) => inDir(src.rel, root))) continue;
  const lines = countLines(src.text);
  if (lines > MAX_LINES) fail(`${src.rel}: ${lines} lines (max ${MAX_LINES})`);
}

// 2. Syntax.
function checkCssBraces(src) {
  const stripped = src.text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '');
  let depth = 0;
  for (const ch of stripped) {
    depth += ch === '{' ? 1 : ch === '}' ? -1 : 0;
    if (depth < 0) return fail(`${src.rel}: unbalanced "}"`);
  }
  if (depth !== 0) fail(`${src.rel}: unbalanced "{"`);
}

function checkSyntax(src) {
  if (src.ext === '.css') return checkCssBraces(src);
  if (src.ext === '.html') return undefined;
  if (isLegacy(src.rel)) {
    try {
      new vm.Script(src.text, { filename: src.rel });
    } catch (err) {
      fail(`${src.rel}: syntax error: ${err.message}`);
    }
    return undefined;
  }
  const run = spawnSync(process.execPath, ['--check', src.file], { encoding: 'utf8' });
  if (run.status !== 0) {
    fail(`${src.rel}: syntax error: ${(run.stderr || '').trim().split('\n').slice(0, 4).join(' | ')}`);
  }
  return undefined;
}
sources.forEach(checkSyntax);

// 3. Dependency rules (ES modules only; legacy scripts are classic scripts).
const STATIC_IMPORT = /\b(?:import|export)\b[^;'"`]*?\bfrom\s*['"]([^'"]+)['"]/g;
const SIDE_IMPORT = /\bimport\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiersOf(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [STATIC_IMPORT, SIDE_IMPORT, DYNAMIC_IMPORT]
    .flatMap((re) => [...clean.matchAll(re)].map((match) => match[1]));
}

function applyRules(from, to, spec) {
  const bad = (rule) => fail(`${from}: "${spec}" breaks the rule: ${rule}`);
  if (inDir(from, 'renderer') && inDir(to, 'main')) bad('renderer never imports main/');
  if (inDir(from, 'main') && inDir(to, 'renderer')) bad('main never imports renderer/');
  if (inDir(from, 'shared') && !inDir(to, 'shared')) bad('shared/ imports only shared/');
  if (inDir(from, 'renderer/src/core') && !inDir(to, 'renderer/src/core') && !inDir(to, 'shared')) {
    bad('core/ imports only core/ and shared/');
  }
  if (inDir(from, 'renderer/src/services')
    && (inDir(to, 'renderer/src/ui') || inDir(to, 'renderer/src/features'))) {
    bad('services/ never imports ui/ or features/');
  }
  const target = FEATURE.exec(to);
  if (target) {
    const own = FEATURE.exec(from);
    if ((!own || own[1] !== target[1]) && to !== `renderer/src/features/${target[1]}/index.js`) {
      bad('a feature is reached only through its index.js');
    }
  }
}

for (const src of sources) {
  if (!['.js', '.mjs'].includes(src.ext) || isLegacy(src.rel)) continue;
  for (const spec of specifiersOf(src.text)) {
    if (!spec.startsWith('./') && !spec.startsWith('../')) {
      if (inDir(src.rel, 'renderer') || inDir(src.rel, 'shared')) {
        fail(`${src.rel}: only relative imports are allowed here (found "${spec}")`);
      }
      continue;
    }
    const target = path.resolve(path.dirname(src.file), spec);
    if (!existsSync(target) || !statSync(target).isFile()) {
      fail(`${src.rel}: unresolved module specifier "${spec}"`);
      continue;
    }
    applyRules(src.rel, toRel(target), spec);
  }
}

// 4. Preload allow-list must equal shared/channels.js.
async function checkChannels() {
  const preloadFile = path.join(ROOT, 'main/preload.cjs');
  if (!existsSync(preloadFile)) return fail('main/preload.cjs is missing');
  const text = readFileSync(preloadFile, 'utf8');
  const inlined = (name) => {
    const found = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(text);
    return found ? [...found[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : null;
  };
  const mod = await import(pathToFileURL(path.join(ROOT, 'shared/channels.js')).href);
  for (const [name, table] of [['INVOKE_CHANNELS', mod.INVOKE_CHANNELS], ['EVENT_CHANNELS', mod.EVENT_CHANNELS]]) {
    const declared = Object.keys(table);
    const list = inlined(name);
    if (!list) fail(`main/preload.cjs: missing "const ${name} = [...]"`);
    else if ([...list].sort().join('|') !== [...declared].sort().join('|')) {
      fail(`main/preload.cjs ${name} [${list}] differs from shared/channels.js [${declared}]`);
    }
    for (const [channel, def] of Object.entries(table)) {
      if (!/^[a-z]+:[a-zA-Z]+$/.test(channel)) fail(`channel "${channel}" must be named domain:action`);
      if (typeof def.output !== 'string' || !def.output) fail(`channel "${channel}" needs an output description`);
      if (name === 'INVOKE_CHANNELS' && typeof def.input !== 'function') {
        fail(`channel "${channel}" needs an input validator`);
      }
    }
  }
}
await checkChannels();

// 5. Living documentation.
const codemapFile = path.join(ROOT, 'CODEMAP.md');
if (!existsSync(codemapFile)) fail('CODEMAP.md is missing');
else {
  const codemap = readFileSync(codemapFile, 'utf8');
  for (const src of sources) {
    if (!codemap.includes(`\`${src.rel}\``)) fail(`CODEMAP.md does not list ${src.rel}`);
  }
}
if (!existsSync(path.join(ROOT, 'CHANGELOG.md'))) fail('CHANGELOG.md is missing');

const noticesFile = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
if (!existsSync(noticesFile)) fail('THIRD_PARTY_NOTICES.md is missing');
else {
  const notices = readFileSync(noticesFile, 'utf8');
  const vendorDir = path.join(ROOT, 'renderer/vendor');
  if (existsSync(vendorDir)) {
    for (const entry of readdirSync(vendorDir)) {
      if (!notices.includes(entry)) fail(`THIRD_PARTY_NOTICES.md is missing entry for vendored item: ${entry}`);
    }
  }
  const fontsDir = path.join(ROOT, 'renderer/fonts');
  if (existsSync(fontsDir)) {
    for (const entry of readdirSync(fontsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !notices.includes(entry.name)) {
        fail(`THIRD_PARTY_NOTICES.md is missing entry for font: ${entry.name}`);
      }
    }
  }
}


// Statically collect every quoted string matching the command-id pattern from renderer sources.
// One broad regex beats three narrow ones and catches computed ids, array literals and wrapper helpers.
const STATIC_CMD_ID = /['"]([a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+)['"]/g;
const staticIds = new Set();
for (const src of sources) {
  if (src.ext !== '.js' || isLegacy(src.rel) || !inDir(src.rel, 'renderer')) continue;
  for (const m of src.text.matchAll(STATIC_CMD_ID)) staticIds.add(m[1]);
}

// Report.
const legacyCount = sources.filter((src) => isLegacy(src.rel)).length;
const allowPlanned = process.argv.includes('--allow-planned');
let plannedCount = 0;
let plannedPageCount = 0;
let sampleCount = 0;
try {
  const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
  const reg = await load('renderer/src/commands/registry.js');
  await load('renderer/src/commands/definitions/document.js');
  await load('renderer/src/commands/definitions/app.js');
  // A command is "truly planned" when no feature registers it (detected via static scan).
  plannedCount = reg.list((c) => c.planned && !staticIds.has(c.id)).length;
  const samplePath = path.join(ROOT, 'renderer/src/dev/sample-data.js');
  if (existsSync(samplePath)) {
    try {
      sampleCount = Object.keys((await load('renderer/src/dev/sample-data.js')).SAMPLE).length;
    } catch { /* deleted in 53c */ }
  }
  // Count planned backstage pages.
  try {
    const { backstagePages } = await load('renderer/src/ui/backstage/registry.js');
    plannedPageCount = backstagePages.list().filter((p) => p.planned).length;
  } catch { /* registry may not load standalone */ }
  // Validate ribbon model command ids against registry + static scan.
  for (const f of ['home', 'layout', 'review']) {
    for (const tab of Object.values(await load(`renderer/src/ui/ribbon/model/${f}.js`))) {
      for (const g of tab.groups) {
        for (const item of g.slice(3)) {
          for (const id of item.replace(/^\*/, '').split(/[|/]/)) {
            if (id !== '-' && !reg.has(id) && !staticIds.has(id)) fail(`ribbon model ${tab.id}: unknown command "${id}"`);
          }
        }
      }
    }
  }
  // Validate coverage checklist: every blueprint command must be non-planned in the registry.
  let coverageData;
  try { coverageData = await load('tools/coverage-data.mjs'); } catch { /* optional until 53a ships */ }
  if (coverageData) {
    for (const { id } of coverageData.BLUEPRINT_COMMANDS) {
      if (!reg.has(id) && !staticIds.has(id)) fail(`coverage: blueprint command "${id}" is not registered anywhere`);
      else if (reg.has(id) && reg.get(id).planned && !staticIds.has(id)) fail(`coverage: blueprint command "${id}" is planned with no implementation`);
    }
  }
} catch (e) { fail(`command registry or ribbon models: ${e.message}`); }

const sampleImports = sources.filter((src) => src.rel !== 'tools/check.mjs' && src.text.includes('sample-data.js')).length;
if (sampleImports > 0) fail(`${sampleImports} sample-data import(s) remain`);

let orphanCount = 0;
if (existsSync(codemapFile)) {
  const codemap = readFileSync(codemapFile, 'utf8');
  for (const m of codemap.matchAll(/^\|\s*`([^`]+)`/gm)) {
    const entry = m[1].trim();
    if (entry.includes('{') || entry.includes(',') || entry.includes('*')) continue;
    if (!existsSync(path.join(ROOT, entry))) {
      fail(`CODEMAP.md lists non-existent file: ${entry}`);
      orphanCount++;
    }
  }
}

console.log(`legacy files: ${legacyCount}`);
console.log(`planned commands: ${plannedCount}`);
console.log(`sample-data imports: ${sampleImports}`);
console.log(`orphans: ${orphanCount}`);
if (!allowPlanned && plannedCount > 0) fail(`${plannedCount} planned command(s) have no implementation — add static code or pass --allow-planned`);
if (!allowPlanned && plannedPageCount > 0) fail(`${plannedPageCount} planned backstage page(s) remain — implement them or pass --allow-planned`);

if (errors.length) {
  console.error(`\ncheck failed (${errors.length}):`);
  for (const message of errors) console.error(`  x ${message}`);
  process.exitCode = 1;
} else {
  console.log(`check passed (${sources.length} source files)`);
}
