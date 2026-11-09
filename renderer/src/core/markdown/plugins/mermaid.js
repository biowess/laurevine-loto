const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const hashSrc = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${(h >>> 0).toString(36)}${s.length.toString(36)}`;
};

// `mermaid` fences become a placeholder holding the source; the preview feature swaps in the diagram (or an error panel) after mount.
export function mermaidPlugin(md) {
  const base = md.renderer.rules.fence;
  md.renderer.rules.fence = (tk, i, o, env, self) => {
    const t = tk[i];
    if (t.info.trim().split(/\s+/)[0].toLowerCase() !== 'mermaid') return base(tk, i, o, env, self);
    return `<div class="lt-mermaid" data-mm="${hashSrc(t.content)}"${md.renderer.renderAttrs(t)}><pre class="lt-mm-src"><code>${esc(t.content)}</code></pre></div>\n`;
  };
}
