const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MAX = 200000;

// One block span per line (spans opened on an earlier line are reopened), so line numbers and wrapping are pure CSS.
function lines(html) {
  const open = [];
  return html.replace(/\n$/, '').split('\n').map((ln) => {
    const pre = open.join('');
    for (const m of ln.matchAll(/<(\/?)span\b[^>]*>/g)) { if (m[1]) open.pop(); else open.push(m[0]); }
    return `<span class="lt-l">${pre}${ln}${'</span>'.repeat(open.length)}\n</span>`;
  }).join('');
}

// Fenced blocks: highlight only a known fence language (no auto-detect); env.code.hl is highlight.js, supplied by the caller.
export function codePlugin(md) {
  md.renderer.rules.fence = (tk, i, o, env) => {
    const t = tk[i], lang = t.info.trim().split(/\s+/)[0], hl = env.code && env.code.hl;
    const def = lang && hl && hl.getLanguage(lang);
    let body = null;
    if (def && t.content.length <= MAX) {
      try { body = hl.highlight(t.content, { language: lang, ignoreIllegals: true }).value; } catch { body = null; }
    }
    const label = esc((def && def.name) || lang || 'Text');
    return `<div class="lt-code"${md.renderer.renderAttrs(t)}><div class="lt-code-head"><span class="lt-lang">${label}</span><span class="lt-copy" role="button" tabindex="0" aria-label="Copy code" data-cmd="preview.copy-code">Copy</span></div><pre><code${lang ? ` class="language-${esc(lang)}"` : ''}>${lines(body == null ? esc(t.content) : body)}</code></pre></div>\n`;
  };
}
