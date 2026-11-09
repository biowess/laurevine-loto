// Wraps a publication (core/publish shell) for Paged.js: CSP allowing only the given script URLs, screen-only page layout, scripts at the end.
// Used by both the sandboxed preview iframe and the hidden PDF window, so they paginate identically.
const META = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;
const SCREEN = '<style media="screen">html{background:#525659;margin:0;padding:0;min-height:100%;overscroll-behavior:contain;cursor:default}html *{cursor:inherit}body{margin:0;padding:0;background:transparent}.pagedjs_pages{display:flex;flex-direction:column;align-items:center;gap:28px;padding:28px 0 40px;margin:0 auto;width:100%;box-sizing:border-box}.pagedjs_page{background:#ffffff!important;border:0!important;box-shadow:0 0 0 1px rgba(0,0,0,.16),0 1px 3px rgba(0,0,0,.2),0 6px 18px rgba(0,0,0,.18)!important;box-sizing:border-box;margin:0 auto;scroll-margin-top:12px}html.lv-snap{scroll-snap-type:y proximity}.lv-snap .pagedjs_page{scroll-snap-align:center}</style>';

export function pagedHtml(html, scripts) {
  // Full file:// URLs are invalid CSP source expressions; use scheme sources instead.
  const schemes = [...new Set(scripts.map((s) => { try { return new URL(s).protocol; } catch { return ''; } }))].filter(Boolean);
  const csp = `default-src 'none'; img-src data: file: 'self'; media-src data: file: 'self'; style-src 'unsafe-inline'; font-src data:; script-src ${schemes.join(' ')}`;
  const tags = scripts.map((s) => `<script src="${s}"></script>`).join('');
  // Strip screen-only sidebar and unneeded wrappers so Paged.js never allocates an undisplayed page for it
  const clean = html.replace(/<aside class="lv-sidebar"[\s\S]*?<\/aside>/, '');
  return clean
    .replace(META, () => `<meta http-equiv="Content-Security-Policy" content="${csp}">`)
    .replace('</head>', () => `${SCREEN}</head>`)
    .replace('</body>', () => `${tags}</body>`);
}
