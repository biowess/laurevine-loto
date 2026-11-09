import { buildPublication } from '../../core/publish/index.js';
import { templateConfig } from '../../core/publish/templates/index.js';
import { pageHtml, planPages, relPath, resolveLink, SITE_CSS } from '../../core/publish/site.js';
import { abs, dirOf, safeName } from '../../core/publish/collection-run.js';
import { envFor } from '../publish/index.js';

export const b64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

// Every document is published on its own (images copied, not inlined); the styles are shared, links between documents become relative page links.
export async function buildSite({ root, name, files, texts, step }) {
  const dir = safeName(name, 'Export'), cfg = templateConfig('editorial').config, warnings = [], built = [], entries = [], assets = new Map();
  let css = '', lang = 'en', math = false;
  for (const [k, p] of files.entries()) {
    step(k, files.length);
    const text = texts[p];
    if (text == null) { warnings.push(`${p}: could not be read and was skipped`); continue; }
    const env = { ...(await envFor(text, cfg)), standalone: false };
    const pub = await buildPublication([{ id: 'doc', name: p.split('/').pop(), path: abs(root, p), text, baseDir: abs(root, dirOf(p)).replace(/\/$/, '') }], cfg, env);
    const dom = new DOMParser().parseFromString(pub.html, 'text/html'), main = dom.querySelector('main.lv-doc');
    if (!main) { warnings.push(`${p}: the page could not be built`); continue; }
    if (!css) { css = [...dom.querySelectorAll('head style')].map((s) => s.textContent).join('\n'); lang = dom.documentElement.lang || 'en'; }
    warnings.push(...pub.warnings.map((w) => `${p}: ${w.message || w}`));
    const names = new Map();
    for (const f of pub.files) {
      if (f.name === 'assets/katex.css') { math = true; assets.set(f.name, f); continue; }
      const to = `assets/d${k}/${f.name.split('/').pop()}`;
      names.set(f.name, to);
      assets.set(to, f);
    }
    built.push({ path: p, title: pub.title || p, main, names, lang: dom.documentElement.lang || lang });
  }
  const pages = planPages(built), byPath = new Map(pages.map((x) => [x.path, x]));
  const styles = ['assets/site.css', ...(math ? ['assets/katex.css'] : [])];
  for (const pg of pages) {
    for (const a of pg.main.querySelectorAll('a[href]')) {
      const r = resolveLink(pg.path, a.getAttribute('href'), byPath);
      if (!r) continue;
      if (r.page) a.setAttribute('href', relPath(pg.out, r.page.out) + r.hash);
      else warnings.push(`${pg.path}: link target is not a page of this site (${r.missing})`);
    }
    for (const img of pg.main.querySelectorAll('img[src]')) { const to = pg.names.get(img.getAttribute('src')); if (to) img.setAttribute('src', relPath(pg.out, to)); }
    entries.push({ name: `${dir}/${pg.out}`, text: pageHtml({ site: dir, lang: pg.lang, page: pg, pages, body: pg.main.outerHTML, styles }) });
  }
  entries.unshift({ name: `${dir}/index.html`, text: pageHtml({ site: dir, lang, page: null, pages, styles }) });
  entries.push({ name: `${dir}/assets/site.css`, text: `${css}\n${SITE_CSS}` });
  for (const [to, f] of assets) entries.push({ name: `${dir}/${to}`, ...(f.mime === 'text/css' ? { text: new TextDecoder().decode(f.bytes) } : { data: b64(f.bytes) }) });
  return { entries, warnings, pages: pages.length };
}
