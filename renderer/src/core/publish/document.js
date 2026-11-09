// HTML shell, cover and table of contents of a publication. Pure string builders; every dynamic value is escaped.
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSP = "default-src 'none'; img-src data: file: 'self'; media-src data: file: 'self'; style-src 'unsafe-inline' 'self'; font-src data: 'self';";

export function coverHtml({ title, subtitle = '', author, date, organisation = '', logo = '', layout = 'centered', dir = 'auto' }) {
  const p = (c, v) => (v ? `<p class="${c}" dir="${dir}">${esc(v)}</p>` : '');
  return `<header class="lv-cover lv-cv-${esc(layout)}">${logo ? `<img class="lv-logo" alt="" src="${esc(logo)}">` : ''}<div class="lv-title" dir="${dir}">${esc(title)}</div>${p('lv-sub', subtitle)}${p('lv-meta', author)}${p('lv-org', organisation)}${p('lv-meta', date)}</header>`;
}

export function tocHtml(headings, depthOrCfg = 3, title = 'Contents', dir = 'auto', mode = 'inline') {
  const isObj = depthOrCfg && typeof depthOrCfg === 'object';
  const cfg = isObj ? depthOrCfg : { tocDepth: depthOrCfg, tocTitle: title, tocIndent: true, tocLeader: 'dots', tocPageNumbers: true, tocLinks: true };
  const depth = cfg.tocDepth ?? 3, t = cfg.tocTitle || title || 'Contents';
  const items = headings.filter((h) => h.level <= depth);
  if (!items.length) return '';
  const noindent = cfg.tocIndent === false ? ' lv-toc-noindent' : '';
  const lead = ` lv-toc-lead-${cfg.tocLeader || 'dots'}`;
  const sideClass = mode === 'sidebar' ? ' lv-toc--sidebar' : '';
  const tag = cfg.tocLinks === false ? 'span' : 'a';
  const li = (h) => {
    const num = h.num ? `<span class="lv-num">${esc(h.num)}</span> ` : '';
    const text = `<span class="lv-toc-text">${num}${esc(h.text)}</span>`;
    const leader = cfg.tocLeader !== 'none' && cfg.tocPageNumbers !== false ? '<span class="lv-toc-leader" aria-hidden="true"></span>' : '';
    const pg = cfg.tocPageNumbers !== false ? `<span class="lv-toc-page" href="#${esc(h.id)}"></span>` : '';
    return `<li class="l${h.level}" dir="${dir}"><${tag} class="lv-toc-entry" href="#${esc(h.id)}">${text}${leader}${pg}</${tag}></li>`;
  };
  return `<nav class="lv-toc${sideClass}${noindent}${lead}" aria-label="${esc(t)}"><div class="lv-toc-title" dir="${dir}">${esc(t)}</div><ol>${items.map(li).join('')}</ol></nav>`;
}

const WEB_CSS = `html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
:is(h1,h2,h3,h4,h5,h6){scroll-margin-top:1.5rem}
a{text-underline-offset:.18em;text-decoration-thickness:1px}
:focus-visible{outline:2px solid var(--ac);outline-offset:2px;border-radius:2px}
::selection{background:color-mix(in srgb,var(--ac) 28%,transparent)}
@media (hover:none){.lv-heading-anchor{opacity:.45}}
.lv-sidebar{scrollbar-width:thin}
.lv-toc--sidebar .lv-toc-title{font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:var(--t2);margin-bottom:.75rem}
.lv-toc--sidebar li{margin:0;border:0;padding:0}
.lv-toc--sidebar .l2,.lv-toc--sidebar .l3,.lv-toc--sidebar .l4,.lv-toc--sidebar .l5,.lv-toc--sidebar .l6{margin-left:0}
.lv-toc--sidebar .lv-toc-entry{display:block;width:auto;padding:.3em .6em;border-inline-start:2px solid transparent;color:var(--t2);font-size:.88rem;line-height:1.4;text-decoration:none;transition:color .15s,background .15s}
.lv-toc--sidebar .l2 .lv-toc-entry{padding-inline-start:1.3em}.lv-toc--sidebar .l3 .lv-toc-entry{padding-inline-start:2em}.lv-toc--sidebar :is(.l4,.l5,.l6) .lv-toc-entry{padding-inline-start:2.7em}
.lv-toc--sidebar .lv-toc-text{display:block;white-space:normal;overflow:visible;text-overflow:clip}
.lv-toc--sidebar .lv-toc-entry:hover{color:var(--hd);background:var(--cb)}
.lv-toc--sidebar .lv-toc-entry[aria-current=location]{color:var(--hd);font-weight:600;border-inline-start-color:var(--ac);background:var(--cb)}
.lv-credit{margin:3rem auto 0;padding:1.25rem 1rem 2rem;max-width:min(72ch,100%);border-top:1px solid var(--bd);text-align:center;font:.78rem/1.4 system-ui,sans-serif;color:var(--t2)}
.lv-credit a{color:inherit;text-decoration:none;border-bottom:1px solid var(--bd)}.lv-credit a:hover{color:var(--ln);border-color:currentColor}
.lv-tocbtn{display:none}
@media (max-width:860px){
.lv-js .lv-tocbtn{display:flex;position:fixed;top:0;left:0;right:0;z-index:30;align-items:center;gap:.7rem;height:3rem;padding:0 1rem;background:var(--bg);color:var(--hd);border:0;border-bottom:1px solid var(--bd);font:600 .9rem system-ui,sans-serif;cursor:pointer}
.lv-tocbtn i{width:1rem;height:2px;background:currentColor;box-shadow:0 -5px currentColor,0 5px currentColor}
.lv-js .lv-layout--with-sidebar{padding-top:3rem}
.lv-js .lv-sidebar{position:fixed;top:3rem;bottom:0;inset-inline-start:0;width:min(20rem,86vw);max-height:none;z-index:20;background:var(--bg);padding:1rem;border-bottom:0;border-right:1px solid var(--bd);translate:-102% 0;visibility:hidden;transition:translate .2s,visibility .2s}
html[dir=rtl] .lv-js .lv-sidebar{translate:102% 0;border-right:0;border-left:1px solid var(--bd)}
.lv-nav-open .lv-sidebar{translate:0 0!important;visibility:visible}
html.lv-nav-open{overflow:hidden}
html.lv-nav-open body::after{content:"";position:fixed;inset:3rem 0 0;background:rgba(0,0,0,.4);z-index:15}
.lv-js :is(h1,h2,h3,h4,h5,h6){scroll-margin-top:4.25rem}
}
@media print{.lv-tocbtn{display:none!important}}`;
const WEB_JS = `(function(){var d=document,r=d.documentElement,b=d.querySelector('.lv-tocbtn'),s=d.getElementById('lv-side'),L=[],cur=null,tick=0;
r.classList.add('lv-js');
function dec(x){try{return decodeURIComponent(x)}catch(e){return x}}
function nav(o){r.classList.toggle('lv-nav-open',o);if(b)b.setAttribute('aria-expanded',o?'true':'false')}
function mark(id){var n=null,i;for(i=0;i<L.length;i++)if(L[i].id===id)n=L[i];if(n===cur)return;if(cur)cur.a.removeAttribute('aria-current');cur=n;if(!n)return;n.a.setAttribute('aria-current','location');if(s){var p=s.getBoundingClientRect(),q=n.a.getBoundingClientRect();if(q.top<p.top+8||q.bottom>p.bottom-8)s.scrollTop+=q.top-p.top-p.height/3}}
function go(id,push){var e=d.getElementById(id);if(!e)return false;e.scrollIntoView();if(push)try{history.replaceState(null,'','#'+encodeURIComponent(id))}catch(x){}mark(id);return true}
function spy(){tick=0;if(!L.length)return;var y=innerWidth<=860?84:28,id=null,i;for(i=0;i<L.length;i++){if(L[i].e.getBoundingClientRect().top<=y)id=L[i].id;else break}
if(scrollY>0&&innerHeight+scrollY>=r.scrollHeight-2)id=L[L.length-1].id;mark(id||L[0].id)}
Array.prototype.forEach.call(d.querySelectorAll('.lv-toc--sidebar a[href^="#"]'),function(a){var id=dec(a.getAttribute('href').slice(1)),e=d.getElementById(id);if(e)L.push({id:id,a:a,e:e})});
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');
if(a){var h=a.getAttribute('href');if(h.length>1){var id=dec(h.slice(1));if(d.getElementById(id)){e.preventDefault();go(id,1);nav(false)}}return}
if(s&&r.classList.contains('lv-nav-open')&&!s.contains(e.target)&&!(b&&b.contains(e.target)))nav(false)});
if(b)b.addEventListener('click',function(){nav(!r.classList.contains('lv-nav-open'))});
d.addEventListener('keydown',function(e){if(e.key==='Escape')nav(false)});
addEventListener('scroll',function(){if(!tick){tick=1;requestAnimationFrame(spy)}},{passive:true});
addEventListener('resize',function(){if(innerWidth>860)nav(false);spy()});
addEventListener('hashchange',function(){go(dec(location.hash.slice(1)),0)});
addEventListener('load',function(){if(location.hash)go(dec(location.hash.slice(1)),0);spy()});
spy()})();`;

// Studio runtime for exported pages: navigation script, responsive TOC drawer and optional credit line.
export const webParts = ({ watermark = true } = {}, tocTitle = 'Contents') => ({
  css: WEB_CSS,
  script: WEB_JS,
  button: `<button type="button" class="lv-tocbtn" aria-controls="lv-side" aria-expanded="false"><i aria-hidden="true"></i>${esc(tocTitle || 'Contents')}</button>`,
  footer: watermark ? '<footer class="lv-credit"><a href="https://biowess-dev.github.io/Biowess" target="_blank" rel="noopener noreferrer">Created with Laurevine Loto by Biowess</a></footer>' : '',
});

export function shell({ lang, dir, title, author, description, keywords, image, type = 'article', css, body, sidebar = '', web = null }) {
  const meta = (n, v) => (v ? `<meta name="${n}" content="${esc(v)}">` : '');
  const og = (p, v) => (v ? `<meta property="${p}" content="${esc(v)}">` : '');
  const l = lang || 'en';
  const ogTags = `${og('og:title', title)}${og('og:type', type)}${og('og:description', description)}${og('og:locale', l ? l.replace('-', '_') : '')}${og('og:image', image)}${author ? og('article:author', author) : ''}`;
  const content = sidebar
    ? `<div class="lv-layout lv-layout--with-sidebar"><aside class="lv-sidebar" id="lv-side" aria-label="Table of contents">${sidebar}</aside><main class="lv-doc">${body}</main></div>`
    : `<main class="lv-doc">${body}</main>`;
  const nonce = web ? btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))) : '';
  const csp = web ? `${CSP} script-src 'nonce-${nonce}';` : CSP;
  const run = web ? `${web.footer}<script nonce="${nonce}">${web.script}</script>` : '';
  return `<!doctype html>\n<html lang="${esc(l)}"${dir === 'ltr' || dir === 'rtl' ? ` dir="${dir}"` : ''}><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="Laurevine Loto">${meta('author', author)}${meta('description', description)}${meta('keywords', keywords)}<title>${esc(title)}</title>${ogTags}<style>${css}${web ? web.css : ''}</style></head><body>${web && sidebar ? web.button : ''}${content}${run}</body></html>\n`;
}
