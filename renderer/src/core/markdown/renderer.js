import { MarkdownIt } from '../../../vendor/markdown-it.js';
import { getProfile, hasPlugin, markdownItOptions } from './profiles.js';
import { parseFrontmatter } from './frontmatter.js';
import { createSlugger, DEFAULT_SLUG_STRATEGY } from './slug.js';
import { sanitize, sanitizeEmbedded } from './sanitize.js';
import { codePlugin } from './plugins/code.js';
import { mermaidPlugin } from './plugins/mermaid.js';
import { mathPlugin } from './plugins/math.js';
import { calloutsPlugin } from './plugins/callouts.js';
import { footnotesPlugin } from './plugins/footnotes.js';
import { deflistPlugin } from './plugins/deflist.js';
import { abbrPlugin } from './plugins/abbr.js';
import { pagebreakPlugin } from './plugins/pagebreak.js';
import { tocMarkersPlugin } from './plugins/toc-markers.js';
import { tasklistPlugin } from './plugins/tasklist.js';
import { wikilinksPlugin } from './plugins/wikilinks.js';
import { citationsPlugin } from './plugins/citations.js';
import { indexFiles, resolveLink } from '../links/resolve.js';

const MAX_ROWS = 2000;
const NOT_RELATIVE = /^(?:[a-z][a-z0-9+.-]*:|[/#?\\])/i;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cache = new Map();
let mathLib = null;

// Relative src -> loto-asset://<baseDir>/<src>, dot segments resolved. Main validates the path.
export function asset(baseDir, src) {
  if (!baseDir || !src || NOT_RELATIVE.test(src)) return src;
  const b = String(baseDir).replace(/\\/g, '/');
  const m = /^([^?#]*)(.*)$/.exec(src);
  const segs = b.split('/').filter(Boolean).map(encodeURIComponent);
  for (const s of m[1].split('/')) {
    if (s === '..') segs.pop();
    else if (s && s !== '.') segs.push(s);
  }
  return `loto-asset://${b.startsWith('/') ? '/' : ''}${segs.join('/')}${m[2]}`;
}

function capTable(tk, i) {
  let k = 0, rows = 0, j = i + 1;
  for (; tk[j] && tk[j].type !== 'table_close'; j++) if (tk[j].type === 'tr_open' && ++rows === MAX_ROWS + 1) k = j;
  if (k) tk.splice(k, j - 1 - k);
}

function scan(t, env, line) {
  const kids = t.children || [];
  for (let k = 0; k < kids.length; k++) {
    const c = kids[k];
    if (c.type === 'link_open') {
      let text = '';
      for (let n = k + 1; kids[n] && kids[n].type !== 'link_close'; n++) text += kids[n].content || '';
      env.out.links.push({ href: c.attrGet('href'), text, line });
    } else if (c.type === 'image') {
      const src = c.attrGet('src');
      const resolved = asset(env.baseDir, src);
      c.attrSet('src', resolved);
      c.attrSet('data-path', src);
      env.out.images.push({ src, resolved, alt: c.content, line });
    }
  }
}

function core(state) {
  const { env, tokens } = state;
  const o = env.out;
  for (let i = 0; i < tokens.length; i++) if (tokens[i].type === 'table_open') capTable(tokens, i);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t.block || !t.map) continue;
    const a = t.map[0] + 1 + env.off;
    if (t.type === 'inline') { scan(t, env, a); continue; }
    if (t.nesting < 0) continue;
    const b = t.map[1] + env.off;
    t.attrSet('data-src-line', String(a));
    t.attrSet('data-src-end', String(b));
    if (t.level === 0) o.blocks.push({ type: t.type.replace(/_open$/, ''), line: a, end: b });
    if (t.type === 'heading_open') {
      const inl = tokens[i + 1];
      const text = inl.children ? inl.children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('') : inl.content;
      const id = env.slugger.slug(text || 'section');
      t.attrSet('id', id);
      o.headings.push({ level: +t.tag.slice(1), text, id, line: a });
    }
  }
}

function make(id, html, math) {
  const { options, enable, preset } = markdownItOptions(id);
  if (html) options.html = true;
  const md = new MarkdownIt(preset, options);
  md.enable(enable, true);
  md.core.ruler.push('loto', core);
  codePlugin(md);
  mermaidPlugin(md);
  if (math) mathPlugin(md, { katex: () => mathLib });
  if (hasPlugin(id, 'callouts')) calloutsPlugin(md);
  if (hasPlugin(id, 'footnotes')) footnotesPlugin(md);
  if (hasPlugin(id, 'deflist')) deflistPlugin(md);
  if (hasPlugin(id, 'abbr')) abbrPlugin(md);
  if (hasPlugin(id, 'tasklist')) tasklistPlugin(md);
  if (hasPlugin(id, 'pagebreak')) pagebreakPlugin(md);
  tocMarkersPlugin(md);
  wikilinksPlugin(md);
  citationsPlugin(md);
  md.renderer.rules.html_block = (tk, i) => `<div${md.renderer.renderAttrs(tk[i])}>${tk[i].content}</div>\n`;
  return md;
}

export function render(text, { profile, anchorStrategy = DEFAULT_SLUG_STRATEGY, baseDir = '', html: raw = false, code = null, wiki = null, bibliography = null, math = null } = {}) {
  text = String(text ?? '');
  const p = getProfile(profile && profile.id ? profile.id : profile);
  const fm = parseFrontmatter(text);
  const off = fm.raw.split('\n').length - 1;
  const out = { headings: [], links: [], images: [], blocks: [] };
  const warnings = [];
  let html;
  const idx = wiki && wiki.index ? (wiki.index.set ? wiki.index : indexFiles(wiki.index)) : null;
  const wk = hasPlugin(p, 'wikilinks') || (wiki && wiki.enabled) ? { resolve: (s) => resolveLink(s, { from: wiki ? wiki.from || '' : '', index: idx }) } : null;
  try {
    const ck = `${p.id}:${raw ? 1 : 0}:${math ? 1 : 0}`;
    if (!cache.has(ck)) cache.set(ck, make(p.id, raw, math));
    const mk = math && math.katex, lib = typeof mk === 'function' ? mk() : mk || null, stash = [];
    mathLib = lib ? { renderToString: (t, o) => { const m = lib.renderToString(t, o); stash.push(m); return `<span class="lv-mp" data-mp="${stash.length - 1}"></span>`; } } : null;
    const env = { off, out, slugger: createSlugger(anchorStrategy), baseDir, code, wiki: wk, bib: bibliography };
    const body = cache.get(ck).render(fm.body, env);
    for (const w of env.warnings || []) warnings.push(w.line ? { ...w, line: w.line + off } : w);
    html = sanitize(body);
    if (stash.length) html = html.replace(/<span class="lv-mp" data-mp="(\d+)"><\/span>/g, (_, i) => sanitizeEmbedded(stash[+i]));
  } catch {
    out.headings = []; out.links = []; out.images = []; out.blocks = [];
    html = `<pre class="lt-fallback" data-src-line="1" data-src-end="${text.split('\n').length}">${esc(text)}</pre>`;
  }
  return { html, headings: out.headings, links: out.links, images: out.images, frontmatter: { present: fm.present, raw: fm.raw, data: fm.data, error: fm.error }, blocks: out.blocks, warnings };
}
