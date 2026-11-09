// Post-render fixes for the preview: relative media src -> loto-asset, local audio/video links get a player, broken images a placeholder.
const REL = /^(?:[a-z][a-z0-9+.-]*:|[/#?\\])/i;
const MEDIA = /\.(mp3|wav|ogg|m4a|flac|mp4|webm|mov|ogv)$/i;
const VIDEO = /\.(mp4|webm|mov|ogv)$/i;
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export function fixMedia(root, baseDir, resolve) {
  if (!baseDir) return;
  for (const el of root.querySelectorAll('img[src],audio[src],video[src],source[src]')) {
    const s = el.getAttribute('src');
    if (el.tagName === 'IMG') el.loading = 'lazy';
    if (!el.dataset.path) el.dataset.path = s;
    if (!REL.test(s)) el.setAttribute('src', resolve(baseDir, s));
  }
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href'), bare = href.split(/[?#]/)[0];
    if (REL.test(href) || !MEDIA.test(bare)) continue;
    const m = document.createElement(VIDEO.test(bare) ? 'video' : 'audio');
    m.controls = true; m.preload = 'metadata'; m.className = 'pv-media'; m.src = resolve(baseDir, href); m.dataset.path = href;
    a.after(m);
  }
}

export function brokenImage(img) {
  if (img.tagName !== 'IMG' || img.classList.contains('img-broken')) return;
  const s = document.createElement('span'), p = dec(img.dataset.path || img.getAttribute('src') || '');
  s.className = 'img-broken'; s.title = p; s.textContent = `Image not found: ${p}`;
  img.replaceWith(s);
}
