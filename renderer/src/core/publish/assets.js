// Embeds local images into a rendered document fragment: data URIs, or files copied beside the HTML ("copy" mode).
const OK = /^(?:image|audio|video)\/[a-z0-9.+-]+$/i;
const REL = /^(?:[a-z][a-z0-9+.-]*:|[/#?\\])/i;
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const b64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function dedupeName(rel, r, ctx, dir = 'assets') {
  for (const f of ctx.files.values()) if (f.mime === r.mime && sameBytes(f.bytes, r.bytes)) return f.name;
  const cleanDir = dir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || 'assets';
  const raw = rel.split('/').pop().replace(/[^\w.-]+/g, '_').slice(-60) || 'asset';
  const dot = raw.lastIndexOf('.');
  const stem = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot) : (r.mime ? `.${r.mime.split('/')[1]}` : '');
  let name = `${cleanDir}/${stem}${ext}`, n = 1;
  while (ctx.files.has(name)) { name = `${cleanDir}/${stem}-${n}${ext}`; n++; }
  ctx.files.set(name, { name, mime: r.mime, bytes: r.bytes });
  return name;
}

async function load(assets, baseDir, path, ctx) {
  const rel = dec(path.split(/[?#]/)[0]);
  let r = null;
  try { r = await assets.read(baseDir, rel); } catch { r = null; }
  if (!r || !r.bytes || !OK.test(r.mime || '')) return null;
  if (assets.mode !== 'copy') return `data:${r.mime};base64,${b64(r.bytes)}`;
  return dedupeName(rel, r, ctx, assets.dir || 'assets');
}

// root: fragment of one document; ctx: { files: Map, cache: Map, warn(w) }. Run before data-src-* attributes are stripped.
export async function embedAssets(root, doc, assets, ctx) {
  for (const img of root.querySelectorAll('img[data-path]')) {
    const path = img.getAttribute('data-path'), line = +(img.closest('[data-src-line]') || {}).dataset?.srcLine || 0;
    if (REL.test(path)) {
      if (/^https?:/i.test(path)) ctx.warn({ kind: 'remote', message: `Remote image is not embedded: ${path}`, line });
      continue;
    }
    const key = `${doc.baseDir || ''}\n${path}`;
    if (!ctx.cache.has(key)) ctx.cache.set(key, await load(assets, doc.baseDir || '', path, ctx));
    const src = ctx.cache.get(key);
    if (!src) {
      ctx.warn({ kind: 'asset', message: `Image not found: ${path}`, line });
      const s = document.createElement('span');
      s.className = 'lt-missing';
      s.textContent = `[missing image: ${img.getAttribute('alt') || path}]`;
      img.replaceWith(s);
    } else {
      img.setAttribute('src', src);
      img.removeAttribute('data-path');
    }
  }
}
