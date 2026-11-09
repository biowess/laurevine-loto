import { render } from '../markdown/renderer.js';
import { sanitizeEmbedded } from '../markdown/sanitize.js';
import { FONT_STACKS, parseExportConfig } from '../../../../shared/export-config.js';
import { embedAssets } from './assets.js';
import { coverHtml, esc, shell, tocHtml, webParts } from './document.js';
import { coverCss, coverModel, decorCss } from './decor.js';
import { headerFooterCss } from './header-footer.js';
import { publicationCss, tocLevelCss } from './styles.js';
import { createStructure, structureCss } from './structure.js';
import { paginationCss } from './pagination.js';
import { createNotes, notesCss } from './notes.js';
import { templateCss } from './templates/index.js';
import { typographyCss } from './typography.js';
import { markWide } from './wide.js';
import { matchRules, outlineKeys, sectionBreakInfo, sectionRulesCss } from './section-rules.js';
import { validateCustomCss } from '../../../../shared/custom-css.js';
import { parseThemeVars, themeCss } from '../../../../shared/theme.js';

const noAssets = { mode: 'inline', read: async () => null };
const AUTO = { include: true, title: '', pageBreak: 'auto' };
let mmId = 0;

function ordered(docs, sections) {
  const by = new Map(docs.map((d) => [d.id, d])), seen = new Set(), out = [];
  for (const s of sections) {
    const doc = by.get(s.id);
    if (!doc) continue;
    seen.add(s.id);
    if (s.include) out.push({ doc, sec: s });
  }
  for (const doc of docs) if (!seen.has(doc.id)) out.push({ doc, sec: AUTO });
  return out;
}

const fragment = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };

async function mermaids(root, mm, warn) {
  for (const box of root.querySelectorAll('.lt-mermaid')) {
    const src = box.querySelector('code') ? box.querySelector('code').textContent : '', start = +box.dataset.srcLine || 0;
    const fail = (message, line) => {
      warn({ kind: 'mermaid', message, line: line ? start + line : start });
      const e = document.createElement('div');
      e.className = 'lt-mm-err';
      e.setAttribute('role', 'alert');
      e.textContent = `Mermaid error: ${message}`;
      box.prepend(e);
    };
    if (!mm) { fail('Mermaid is not available.'); continue; }
    const id = `lv-mm-${++mmId}`;
    try {
      const { svg } = await mm.render(id, src);
      const w = document.createElement('div');
      w.className = 'lt-mm-scroll';
      w.innerHTML = sanitizeEmbedded(svg);
      box.replaceChildren(w);
    } catch (e) {
      const msg = String((e && (e.str || e.message)) || e).split('\n').slice(0, 4).join(' ');
      fail(msg, +((/line (\d+)/i.exec(msg) || [])[1]) || 0);
    } finally {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
    }
  }
}

// docs: [{ id, name, path?, text, baseDir?, profile? }]; config: any ExportConfig (validated and migrated here).
// env: { profile, anchorStrategy, katex, katexCss, hljs, mermaid, wiki, bibliography, assets: { mode: 'inline'|'copy', read(baseDir, rel) -> { mime, bytes } | null } }
// -> { html, config, title, headings, sourceMap, warnings, files }. Needs a DOM (sanitising and Mermaid); never writes source.
export async function buildPublication(docs, config, env = {}) {
  const { config: cfg } = parseExportConfig(config);
  const standalone = env.standalone ?? cfg.html?.standalone ?? (env.assets?.mode ? env.assets.mode === 'inline' : true);
  const assetMode = standalone ? 'inline' : 'copy';
  const assetDir = cfg.html?.assetDir || env.assets?.dir || 'assets';
  const assets = { mode: assetMode, dir: assetDir, read: (env.assets && env.assets.read) || noAssets.read };
  const warnings = [], bodies = [], headings = [], sourceMap = [];
  const ctx = { files: new Map(), cache: new Map(), warn: null };
  const used = new Set(), st = createStructure(cfg), nt = createNotes(cfg), pending = [];
  const bib = env.bibliography && cfg.structure.bibStyle !== 'auto' ? { ...env.bibliography, style: cfg.structure.bibStyle } : env.bibliography;
  let orn = 0;
  let first = null, mathUsed = false;
  if (env.mermaid) env.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: cfg.palette.scheme === 'dark' ? 'dark' : 'default', suppressErrorRendering: true, htmlLabels: false, flowchart: { htmlLabels: false }, class: { htmlLabels: false }, state: { htmlLabels: false } });

  const list = ordered(Array.isArray(docs) ? docs : [], cfg.sections);
  for (let n = 0; n < list.length; n++) {
    const { doc, sec } = list[n], sectionId = `sec-${n + 1}`, local = [];
    used.add(sectionId);
    const stash = [];
    const math = env.katex ? { katex: { renderToString: (t, o) => { stash.push(env.katex.renderToString(t, o)); mathUsed = true; return `<span class="lv-mx" data-mx="${stash.length - 1}"></span>`; } } } : null;
    const anchorStrat = cfg.html?.anchorStrategy && cfg.html.anchorStrategy !== 'auto' ? cfg.html.anchorStrategy : (env.anchorStrategy || 'github');
    const r = render(doc.text, { profile: doc.profile || env.profile, anchorStrategy: anchorStrat, baseDir: doc.baseDir || '', code: env.hljs ? { hl: env.hljs } : null, wiki: env.wiki, bibliography: bib, math });
    ctx.warn = (w) => local.push(w);
    for (const w of r.warnings) local.push(w);
    if (r.frontmatter.error) local.push({ kind: 'frontmatter', message: 'Front matter could not be parsed.', line: 1 });
    first ||= r;

    const root = fragment(r.html);
    for (const el of root.querySelectorAll('.lv-mx')) el.replaceWith(fragment(sanitizeEmbedded(stash[+el.dataset.mx])));
    await embedAssets(root, doc, assets, ctx);
    await mermaids(root, env.mermaid, ctx.warn);
    for (const tbl of root.querySelectorAll('table')) {
      if (!tbl.parentElement?.classList.contains('lv-table-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'lv-table-wrap';
        tbl.replaceWith(wrap);
        wrap.appendChild(tbl);
      }
    }
    markWide(root, cfg);

    const remap = new Map();
    for (const el of root.querySelectorAll('[id]')) {
      if (el.closest('svg')) continue;
      if (used.has(el.id)) { let k = 1; while (used.has(`${el.id}-${k}`)) k++; remap.set(el.id, `${el.id}-${k}`); el.id = `${el.id}-${k}`; }
      used.add(el.id);
    }
    for (const a of root.querySelectorAll('a[href^="#"]')) { const to = remap.get(a.getAttribute('href').slice(1)); if (to) a.setAttribute('href', `#${to}`); }
    if (cfg.html?.headingAnchors !== false) {
      for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
        if (h.id && !h.querySelector('.lv-heading-anchor')) {
          const a = document.createElement('a');
          a.className = 'lv-heading-anchor';
          a.href = `#${h.id}`;
          a.setAttribute('aria-label', `Link to ${h.textContent.trim()}`);
          a.textContent = '#';
          h.appendChild(a);
        }
      }
    }

    const docHeadings = outlineKeys(doc.text);
    const { byHead, stale } = matchRules(cfg.sectionRules || [], docHeadings);
    for (const r of stale) {
      warnings.push({ kind: 'section-rules', message: `Stale section rule for "${r.text || r.slug}": heading was renamed or removed.`, docId: doc.id, path: doc.path || '', sectionId, anchor: sectionId, line: 0 });
    }

    const pb = st.scan(root, sec.pageBreak === 'before' || (sec.pageBreak === 'auto' && cfg.structure.breakBetweenDocs && n > 0));
    nt.scan(root, n + 1);

    const headingEls = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    if (headingEls.length && cfg.sectionRules && cfg.sectionRules.length) {
      const sections = [];
      let curNodes = [], curIdx = -1;
      for (const child of [...root.childNodes]) {
        const hIdx = headingEls.indexOf(child);
        if (hIdx !== -1) {
          if (curNodes.length) sections.push({ idx: curIdx, nodes: curNodes });
          curIdx = hIdx;
          curNodes = [child];
        } else {
          curNodes.push(child);
        }
      }
      if (curNodes.length) sections.push({ idx: curIdx, nodes: curNodes });

      root.replaceChildren(...sections.map(({ idx, nodes }) => {
        if (idx === -1) {
          const div = document.createElement('div');
          div.className = 'lv-sec lv-sec-pre';
          div.append(...nodes);
          return div;
        }
        const r = byHead.get(idx);
        const prevR = idx > 0 ? byHead.get(idx - 1) : null;
        const sec = document.createElement('section');
        sec.className = 'lv-sec';
        if (r) {
          sec.id = `sec-part-${r.id}`;
          sec.classList.add(`lv-sec-${r.id}`);
          sec.dataset.secId = r.id;
          sec.dataset.secRule = '1';
          if (r.cols && r.cols !== 'auto') sec.dataset.secCols = r.cols;
          const { continuous } = sectionBreakInfo(r, prevR);
          if (r.brBefore || (!continuous && idx > 0)) sec.classList.add('lv-pb');
          if (r.brAfter) sec.classList.add('lv-pa');
          if (r.style === 'cover') sec.classList.add('lv-sec-cover');
        }
        sec.append(...nodes);
        return sec;
      }));
    }

    for (const el of root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,ul,ol,blockquote,table,td,th,dt,dd,figcaption,summary')) if (!el.hasAttribute('dir') && !el.closest('pre,svg')) el.setAttribute('dir', cfg.page.direction);
    const hs = [];
    for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      if (h.tagName === 'H1' && cfg.decor.divider !== 'none' && (orn++ || n > 0)) { const o = document.createElement('span'); o.className = 'lv-orn'; o.setAttribute('aria-hidden', 'true'); h.prepend(o); }
      const level = +h.tagName[1], text = [...h.childNodes].filter((n) => !(n.classList && n.classList.contains('lv-heading-anchor'))).map((n) => n.textContent).join('').trim();
      const num = h.dataset.num || '';
      h.removeAttribute('data-num');
      const i = hs.length, r = byHead.get(i);
      if (r && r.noNum) {
        // Excluded from heading numbering
      } else if (num) {
        const s = document.createElement('span'); s.className = 'lv-num'; s.textContent = num; h.prepend(s);
      }
      const item = { id: h.id, level, text, line: +h.dataset.srcLine || 0, ...(num && (!r || !r.noNum) ? { num } : {}) };
      hs.push(item);
      if (!r || !r.noToc) headings.push(item);
    }

    for (const el of root.querySelectorAll('[data-src-line],[data-src-end],[data-mm],[data-path]')) for (const a of ['data-src-line', 'data-src-end', 'data-mm', 'data-path']) el.removeAttribute(a);
    for (const w of local) {
      const near = hs.filter((h) => h.line <= (w.line || 0)).pop();
      warnings.push({ ...w, docId: doc.id, path: doc.path || '', sectionId, anchor: near ? near.id : sectionId });
    }
    const title = sec.title || (hs.find((h) => h.level === 1) || {}).text || doc.name || doc.id;
    sourceMap.push({ sectionId, docId: doc.id, path: doc.path || '', title, headings: hs.map(({ id, level, text, line }) => ({ id, level, text, line })), blocks: r.blocks });
    pending.push({ root, pb, title, doc, sectionId, docId: doc.id });
  }
  st.resolve(pending, (w) => warnings.push({ path: '', anchor: '', line: 0, ...w }));
  const allIds = new Set();
  for (const q of pending) for (const el of q.root.querySelectorAll('[id]')) allIds.add(el.id);
  for (const q of pending) {
    for (const a of q.root.querySelectorAll('a[href^="#"]')) {
      const target = a.getAttribute('href').slice(1);
      if (target && !allIds.has(target)) {
        warnings.push({ kind: 'link', message: `Broken link: anchor "#${target}" not found.`, docId: q.docId, path: q.doc.path || '', line: 0 });
      }
    }
  }
  for (const q of pending) {
    const div = document.createElement('div');
    div.append(q.root);
    bodies.push(`<section class="lv-section${q.pb ? ' lv-pb' : ''}" id="${q.sectionId}" aria-label="${esc(q.title)}" data-doc="${esc(q.doc.id)}">${div.innerHTML}</section>`);
  }
  bodies.push(...nt.finish(headings));
  if (mathUsed && !env.katexCss) warnings.push({ kind: 'math', message: 'KaTeX styles were not supplied; equations may look unstyled.', docId: '', path: '', sectionId: '', anchor: '', line: 0 });
  if (!standalone && env.katexCss) {
    const encoder = new TextEncoder();
    const cssRel = `${assetDir}/katex.css`;
    ctx.files.set(cssRel, { name: cssRel, mime: 'text/css', bytes: encoder.encode(env.katexCss) });
  }

  const fm = (first && first.frontmatter.data) || {}, m = cfg.metadata;
  const title = m.title || (typeof fm.title === 'string' && fm.title) || (headings.find((h) => h.level === 1) || {}).text || (list[0] && list[0].doc.name) || 'Untitled';
  const author = m.author || (typeof fm.author === 'string' && fm.author) || '';
  const description = m.description || (typeof fm.description === 'string' && fm.description) || '';
  const lang = m.language || (typeof fm.lang === 'string' && fm.lang) || (typeof fm.language === 'string' && fm.language) || 'en';
  const image = (typeof fm.image === 'string' && fm.image) || cfg.cover?.logo || '';
  const st2 = cfg.structure, dir = cfg.page.direction;
  const tocSetting = cfg.html?.toc !== undefined ? cfg.html.toc : (st2.toc && st2.tocPlacement !== 'none' ? 'inline' : 'none');
  const hasToc = tocSetting !== 'none' && headings.length > 0;
  const sidebarToc = hasToc && tocSetting === 'sidebar' ? tocHtml(headings, st2, st2.tocTitle, dir, 'sidebar') : '';
  const inlineToc = hasToc && tocSetting === 'inline' ? tocHtml(headings, st2, st2.tocTitle, dir, 'inline') : '';
  const coverStr = st2.cover ? coverHtml({ ...coverModel(cfg, fm, { title, author }), dir }) : '';
  const head = st2.tocPlacement === 'start' ? inlineToc + coverStr : coverStr + inlineToc;

  const userTheme = cfg.html?.customTheme || env.customTheme || null;
  let themeCssStr = '';
  if (userTheme) {
    const themeVars = parseThemeVars(userTheme);
    if (Object.keys(themeVars).length) themeCssStr = themeCss(themeVars);
  }

  const userCss = cfg.html?.customCss || env.customCss || '';
  let customCssStr = '';
  if (userCss) {
    const v = validateCustomCss(userCss);
    customCssStr = v.css;
    for (const msg of v.warnings) warnings.push({ kind: 'custom-css', message: msg, docId: '', path: '', sectionId: '', anchor: '', line: 0 });
  }

  const css = publicationCss(cfg, env) + templateCss(cfg.template, cfg, env) + typographyCss(cfg, env) + coverCss(cfg) + decorCss(cfg) + structureCss() + notesCss(cfg) + paginationCss(cfg) + tocLevelCss(st2.tocLevels, FONT_STACKS) + headerFooterCss(cfg, { title, author, date: m.date || new Date().toISOString().slice(0, 10) }) + sectionRulesCss(cfg.sectionRules, cfg) + (env.katexCss || '') + (themeCssStr ? `\n${themeCssStr}` : '') + (customCssStr ? `\n${customCssStr}` : '');
  const html = shell({ lang, dir, title, author, description, keywords: m.keywords, image, css, body: `${head}${st.lists(dir)}<div class="lv-body">${bodies.join('\n')}</div>`, sidebar: sidebarToc, web: cfg.html?.studio ? webParts(cfg.html, st2.tocTitle) : null });
  return { html, config: cfg, title, headings, sourceMap, warnings, files: [...ctx.files.values()] };
}
