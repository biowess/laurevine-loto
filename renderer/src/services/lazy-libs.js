// KaTeX and highlight.js are vendored under renderer/vendor/ and imported on first use only.
const cache = {};

function once(key, load) {
  if (!cache[key]) cache[key] = { mod: null, p: null };
  const c = cache[key];
  c.p ||= load().then((m) => (c.mod = m), (e) => { c.p = null; throw e; });
  return c.p;
}

function stylesheet(href) {
  return new Promise((resolve, reject) => {
    const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    l.onload = () => resolve();
    l.onerror = () => reject(new Error('KaTeX styles could not be loaded.'));
    document.head.append(l);
  });
}

export const getKatex = () => (cache.katex && cache.katex.mod) || null;
export const loadKatex = () => once('katex', async () => {
  const [m] = await Promise.all([import('../../vendor/katex/katex.js'), stylesheet(new URL('../../vendor/katex/katex.min.css', import.meta.url).href)]);
  return m.katex;
});

export const getHljs = () => (cache.hljs && cache.hljs.mod) || null;
export const loadHljs = () => once('hljs', async () => (await import('../../vendor/hljs.js')).hljs);

export const getMermaid = () => (cache.mermaid && cache.mermaid.mod) || null;
export const loadMermaid = () => once('mermaid', async () => (await import('../../vendor/mermaid.js')).mermaid);
