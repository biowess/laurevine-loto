import { esc } from './document.js';

const CSP = "default-src 'none'; img-src 'self' file: data:; style-src 'self' file: 'unsafe-inline'; font-src 'self' file: data:; base-uri 'none'; form-action 'none'";
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/|#|\\)/i;
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const url = (p) => p.split('/').map(encodeURIComponent).join('/');

export const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'page';

export function joinRel(fromPath, target) {
  const out = fromPath.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') { if (!out.pop()) return null; } else if (seg && seg !== '.') out.push(seg);
  }
  return out.join('/');
}

export function planPages(items) {
  const used = new Set(['index.html']);
  return items.map((i) => {
    const parts = i.path.split('/'), file = parts.pop().replace(/\.[^.]+$/, '');
    let base = [...parts.map(slug), slug(file)].join('/'), out = `${base}.html`, n = 2;
    while (used.has(out.toLowerCase())) out = `${base}-${n++}.html`;
    used.add(out.toLowerCase());
    return { ...i, out };
  });
}

export function relPath(from, to) {
  const a = from.split('/').slice(0, -1), b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return url('../'.repeat(a.length - i) + b.slice(i).join('/'));
}

export function resolveLink(from, href, byPath) {
  if (!href || EXTERNAL.test(href)) return null;
  const m = /^([^#?]*)(?:\?[^#]*)?(#.*)?$/.exec(href);
  if (!m || !m[1]) return null;
  const target = joinRel(from, dec(m[1]));
  const page = target == null ? null : byPath.get(target);
  return page ? { page, hash: m[2] || '' } : { missing: target == null ? href : target };
}

export function imageRefs(text, from) {
  const found = new Set();
  for (const m of text.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)|<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)) {
    const raw = m[1] || m[2];
    if (!raw || EXTERNAL.test(raw)) continue;
    const p = joinRel(from, dec(raw.split(/[?#]/)[0]));
    if (p) found.add(p);
  }
  return [...found];
}

function navHtml(pages, current, out, title) {
  const rows = [];
  let last = [];
  for (const p of pages) {
    const dirs = p.path.split('/').slice(0, -1);
    dirs.forEach((d, n) => { if (last.slice(0, n + 1).join('/') !== dirs.slice(0, n + 1).join('/')) rows.push(`<li class="site-nav__dir" style="--d:${n}">${esc(d.replace(/[-_]+/g, ' '))}</li>`); });
    last = dirs;
    rows.push(`<li style="--d:${dirs.length}"><a href="${esc(relPath(out, p.out))}"${p === current ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`);
  }
  return `<nav class="site-nav" aria-label="Site"><a class="site-nav__home" href="${esc(relPath(out, 'index.html'))}"${current ? '' : ' aria-current="page"'}>${esc(title)}</a><ul>${rows.join('')}</ul></nav>`;
}

export function pageHtml({ site, lang = 'en', page, pages, body, styles }) {
  const out = page ? page.out : 'index.html', n = page ? pages.indexOf(page) : -1;
  const prev = page ? (n > 0 ? pages[n - 1] : null) : null, next = page ? pages[n + 1] || null : pages[0] || null;
  const link = (p, cls, text) => (p ? `<a class="${cls}" href="${esc(relPath(out, p.out))}" rel="${cls === 'site-pn__prev' ? 'prev' : 'next'}"><small>${text}</small><span>${esc(p.title)}</span></a>` : '<span></span>');
  const pn = `<nav class="site-pn" aria-label="Pages">${link(prev, 'site-pn__prev', 'Previous')}${link(next, 'site-pn__next', 'Next')}</nav>`;
  const main = page ? body : `<main class="lv-doc"><h1>${esc(site)}</h1><ol class="site-index">${pages.map((p) => `<li><a href="${esc(relPath(out, p.out))}">${esc(p.title)}</a></li>`).join('')}</ol></main>`;
  const links = styles.map((s) => `<link rel="stylesheet" href="${esc(relPath(out, s))}">`).join('');
  const title = page ? `${page.title} · ${site}` : site;
  return `<!doctype html>\n<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="Laurevine Loto"><title>${esc(title)}</title>${links}</head><body><div class="site">${navHtml(pages, page, out, site)}<div class="site-main">${main}${pn}</div></div></body></html>\n`;
}

export const SITE_CSS = `
.site{display:flex;min-height:100vh;align-items:flex-start}
.site-nav{position:sticky;top:0;flex:0 0 17rem;max-height:100vh;overflow:auto;padding:1.25rem 1rem;border-inline-end:1px solid rgba(128,128,128,.3);font:14px/1.4 system-ui,sans-serif;box-sizing:border-box}
.site-nav ul{list-style:none;margin:.75rem 0 0;padding:0}
.site-nav li{padding-inline-start:calc(var(--d,0)*.9rem)}
.site-nav a{display:block;padding:.2rem 0;color:inherit;text-decoration:none}
.site-nav a:hover,.site-nav a:focus-visible{text-decoration:underline}
.site-nav a[aria-current=page]{font-weight:700}
.site-nav__home{font-size:1.1em;font-weight:700}
.site-nav__dir{margin-top:.6rem;font-size:.8em;text-transform:uppercase;letter-spacing:.05em;opacity:.7}
.site-main{flex:1;min-width:0}
.site-pn{display:flex;justify-content:space-between;gap:1rem;max-width:48rem;margin:2rem auto;padding:0 1rem;font:14px/1.4 system-ui,sans-serif}
.site-pn a{display:flex;flex-direction:column;color:inherit;text-decoration:none;max-width:48%}
.site-pn__next{text-align:end;margin-inline-start:auto}
.site-pn small{opacity:.7}
.site-pn span{font-weight:600}
.site-index{max-width:48rem;margin:0 auto}
@media (max-width:760px){.site{display:block}.site-nav{position:static;max-height:none;border:0;border-bottom:1px solid rgba(128,128,128,.3)}}
@media print{.site-nav,.site-pn{display:none}}
`;
