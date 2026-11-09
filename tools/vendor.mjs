import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'renderer/vendor');
const NOTICES = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
const MARK = ['<!-- vendor:begin -->', '<!-- vendor:end -->'];

const ENTRY = [
  "export { EditorState, Compartment, Annotation } from '@codemirror/state';",
  "export { EditorView, Decoration, ViewPlugin, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, highlightWhitespace, rectangularSelection, crosshairCursor } from '@codemirror/view';",
  "export { defaultKeymap, history, historyKeymap, undo, redo, indentWithTab } from '@codemirror/commands';",
  "export { syntaxHighlighting, HighlightStyle, bracketMatching, indentUnit } from '@codemirror/language';",
  "export { markdown, markdownLanguage } from '@codemirror/lang-markdown';",
  "export { languages } from '@codemirror/language-data';",
  "export { search, searchKeymap, highlightSelectionMatches, SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, openSearchPanel, closeSearchPanel, selectNextOccurrence } from '@codemirror/search';",
  "export { tags } from '@lezer/highlight';",
].join('\n');

const read = (file) => readFileSync(file, 'utf8');
const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

rmSync(path.join(OUT, 'codemirror'), { recursive: true, force: true });
rmSync(path.join(OUT, 'codemirror.js'), { force: true });

const { metafile } = await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, sourcefile: 'codemirror.js', loader: 'js' },
  bundle: true, format: 'esm', splitting: true, minify: true, target: 'es2022', platform: 'browser',
  outdir: OUT, entryNames: 'codemirror', chunkNames: 'codemirror/[name]-[hash]',
  legalComments: 'none', metafile: true, logLevel: 'warning',
});

const names = new Set();
for (const input of Object.keys(metafile.inputs)) {
  const m = /^(?:.*\/)?node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input);
  if (m) names.add(m[1]);
}
const pkgs = [...names].sort().map((name) => {
  const dir = path.join(ROOT, 'node_modules', name);
  const json = JSON.parse(read(path.join(dir, 'package.json')));
  const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
  return { name, version: json.version, license: json.license || 'see text', text: file ? read(path.join(dir, file)).trim() : '(no license file shipped)' };
});

writeFileSync(path.join(OUT, 'codemirror-LICENSE.txt'),
  `${pkgs.map((p) => `=== ${p.name}@${p.version} (${p.license}) ===\n${p.text}`).join('\n\n')}\n`);

const files = {};
for (const file of walk(OUT).sort()) {
  const rel = path.relative(OUT, file).split(path.sep).join('/');
  if (rel !== 'codemirror.js' && !rel.startsWith('codemirror/')) continue;
  const buf = readFileSync(file);
  files[rel] = { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

const manifestFile = path.join(OUT, 'MANIFEST.json');
const manifest = existsSync(manifestFile) ? JSON.parse(read(manifestFile)) : {};
manifest.codemirror = {
  entry: 'codemirror.js', format: 'esm', minified: true,
  esbuild: JSON.parse(read(path.join(ROOT, 'node_modules/esbuild/package.json'))).version,
  licenses: 'codemirror-LICENSE.txt',
  packages: Object.fromEntries(pkgs.map((p) => [p.name, p.version])),
  files,
};
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const block = [
  MARK[0], '',
  'CodeMirror 6 bundle (`renderer/vendor/codemirror.js`, built by `npm run vendor`; license texts in `renderer/vendor/codemirror-LICENSE.txt`):', '',
  '| Package | Version | License |', '|---|---|---|',
  ...pkgs.map((p) => `| ${p.name} | ${p.version} | ${p.license} |`), '',
  MARK[1],
].join('\n');
let text = read(NOTICES);
const a = text.indexOf(MARK[0]);
const b = text.indexOf(MARK[1]);
text = a >= 0 && b > a ? text.slice(0, a) + block + text.slice(b + MARK[1].length) : `${text.trimEnd()}\n\n${block}\n`;
writeFileSync(NOTICES, text);

console.log(`vendor: ${pkgs.length} packages, ${Object.keys(files).length} files -> renderer/vendor/codemirror.js`);

const HL_PICK = ['latex', 'dockerfile', 'powershell', 'nginx', 'haskell', 'scala', 'dart', 'elixir', 'julia', 'matlab', 'clojure', 'lisp', 'protobuf'];
const HL = [
  "import hljs from 'highlight.js/lib/common';",
  ...HL_PICK.map((n, i) => `import l${i} from 'highlight.js/lib/languages/${n}';`),
  `[${HL_PICK.map((n, i) => `['${n}', l${i}]`).join(',')}].forEach(([n, l]) => hljs.registerLanguage(n, l));`,
  'export { hljs };',
].join('\n');
const LIBS = {
  katex: { out: 'katex/katex.js', src: "export { default as katex } from 'katex';" },
  'highlight.js': { out: 'hljs.js', src: HL },
  'markdown-it': { out: 'markdown-it.js', src: "export { default as MarkdownIt } from 'markdown-it';" },
  mermaid: { out: 'mermaid.js', src: "export { default as mermaid } from 'mermaid';" },
  dompurify: { out: 'dompurify.js', src: "export { default as DOMPurify } from 'dompurify';" },
  turndown: { out: 'turndown.js', src: "export { default as TurndownService } from 'turndown';\nexport { gfm, tables } from 'turndown-plugin-gfm';" },
};
const m2 = JSON.parse(read(manifestFile));
const rows = [];
for (const [name, lib] of Object.entries(LIBS)) {
  rmSync(path.join(OUT, lib.out), { force: true });
  const r = await build({
    stdin: { contents: lib.src, resolveDir: ROOT, sourcefile: lib.out, loader: 'js' },
    bundle: true, format: 'esm', minify: true, target: 'es2022', platform: 'browser',
    outfile: path.join(OUT, lib.out), legalComments: 'none', metafile: true, logLevel: 'warning',
  });
  const deps = new Set([name]);
  for (const input of Object.keys(r.metafile.inputs)) {
    const m = /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input);
    if (m) deps.add(m[1]);
  }
  const ps = [...deps].sort().map((n) => {
    const dir = path.join(ROOT, 'node_modules', n);
    const json = JSON.parse(read(path.join(dir, 'package.json')));
    const f = readdirSync(dir).find((x) => /^licen[cs]e/i.test(x));
    return { name: n, version: json.version, license: typeof json.license === 'string' ? json.license : 'see text', text: f ? read(path.join(dir, f)).trim() : '(no license file shipped)' };
  });
  writeFileSync(path.join(OUT, `${name}-LICENSE.txt`), `${ps.map((p) => `=== ${p.name}@${p.version} (${p.license}) ===\n${p.text}`).join('\n\n')}\n`);
  const buf = readFileSync(path.join(OUT, lib.out));
  m2[name] = {
    entry: lib.out, format: 'esm', minified: true, licenses: `${name}-LICENSE.txt`,
    packages: Object.fromEntries(ps.map((p) => [p.name, p.version])),
    files: { [lib.out]: { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') } },
  };
  rows.push(...ps.map((p) => `| ${p.name} | ${p.version} | ${p.license} |`));
}
writeFileSync(manifestFile, `${JSON.stringify(m2, null, 2)}\n`);
const KD = path.join(ROOT, 'node_modules/katex/dist'), KO = path.join(OUT, 'katex');
rmSync(path.join(KO, 'fonts'), { recursive: true, force: true });
mkdirSync(path.join(KO, 'fonts'), { recursive: true });
writeFileSync(path.join(KO, 'katex.min.css'), read(path.join(KD, 'katex.min.css')).replace(/,url\([^)]*\.woff\) format\("woff"\),url\([^)]*\.ttf\) format\("truetype"\)/g, ''));
for (const f of readdirSync(path.join(KD, 'fonts')).filter((x) => x.endsWith('.woff2'))) copyFileSync(path.join(KD, 'fonts', f), path.join(KO, 'fonts', f));
for (const file of walk(KO).sort()) {
  const buf = readFileSync(file);
  m2.katex.files[path.relative(OUT, file).split(path.sep).join('/')] = { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}
writeFileSync(manifestFile, `${JSON.stringify(m2, null, 2)}\n`);
const M2 = ['<!-- vendor-md:begin -->', '<!-- vendor-md:end -->'];
const blk = [M2[0], '', 'Markdown bundles (`renderer/vendor/markdown-it.js`, `dompurify.js`, `mermaid.js`, `turndown.js`, `katex/katex.js` (+ `katex.min.css`, `fonts/`), `hljs.js`; license texts beside them):', '', '| Package | Version | License |', '|---|---|---|', ...rows, '', M2[1]].join('\n');
let t2 = read(NOTICES);
const i = t2.indexOf(M2[0]);
const j = t2.indexOf(M2[1]);
t2 = i >= 0 && j > i ? t2.slice(0, i) + blk + t2.slice(j + M2[1].length) : `${t2.trimEnd()}\n\n${blk}\n`;
writeFileSync(NOTICES, t2);
console.log('vendor: markdown-it, dompurify -> renderer/vendor/');

// 39c: Paged.js polyfill (classic script, copied as shipped) and pdf-lib (ESM for main, main/vendor/pdf-lib.js).
{
  const info = (n) => {
    const d = path.join(ROOT, 'node_modules', n), j = JSON.parse(read(path.join(d, 'package.json'))), f = readdirSync(d).find((x) => /^licen[cs]e/i.test(x));
    return { name: n, version: j.version, license: typeof j.license === 'string' ? j.license : 'see text', text: f ? read(path.join(d, f)).trim() : '(no license file shipped)' };
  };
  const MV = path.join(ROOT, 'main/vendor'), PG = path.join(OUT, 'pagedjs');
  mkdirSync(MV, { recursive: true });
  mkdirSync(PG, { recursive: true });
  copyFileSync(path.join(ROOT, 'node_modules/pagedjs/dist/paged.polyfill.js'), path.join(PG, 'paged.polyfill.js'));
  await build({
    stdin: { contents: "import * as P from 'pdf-lib';\nexport const { PDFDocument, PDFHexString, PDFName } = P;", resolveDir: ROOT, sourcefile: 'pdf-lib.js', loader: 'js' },
    bundle: true, format: 'esm', minify: true, target: 'node20', platform: 'node', mainFields: ['module', 'main'],
    outfile: path.join(MV, 'pdf-lib.js'), legalComments: 'none', logLevel: 'warning',
  });
  const mf = JSON.parse(read(manifestFile)), rows = [];
  for (const [name, entry, file, fmt] of [['pagedjs', 'pagedjs/paged.polyfill.js', path.join(PG, 'paged.polyfill.js'), 'umd'], ['pdf-lib', '../../main/vendor/pdf-lib.js', path.join(MV, 'pdf-lib.js'), 'esm']]) {
    const p = info(name), buf = readFileSync(file);
    writeFileSync(path.join(OUT, `${name}-LICENSE.txt`), `=== ${p.name}@${p.version} (${p.license}) ===\n${p.text}\n`);
    mf[name] = { entry, format: fmt, minified: true, licenses: `${name}-LICENSE.txt`, packages: { [name]: p.version }, files: { [entry]: { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') } } };
    rows.push(`| ${p.name} | ${p.version} | ${p.license} |`);
  }
  writeFileSync(manifestFile, `${JSON.stringify(mf, null, 2)}\n`);
  const M3 = ['<!-- vendor-pdf:begin -->', '<!-- vendor-pdf:end -->'];
  const b3 = [M3[0], '', 'PDF export (`renderer/vendor/pagedjs/paged.polyfill.js`, `main/vendor/pdf-lib.js`; license texts in `renderer/vendor/`):', '', '| Package | Version | License |', '|---|---|---|', ...rows, '', M3[1]].join('\n');
  let t3 = read(NOTICES);
  const i3 = t3.indexOf(M3[0]), j3 = t3.indexOf(M3[1]);
  t3 = i3 >= 0 && j3 > i3 ? t3.slice(0, i3) + b3 + t3.slice(j3 + M3[1].length) : `${t3.trimEnd()}\n\n${b3}\n`;
  writeFileSync(NOTICES, t3);
  console.log('vendor: pagedjs, pdf-lib');
}
