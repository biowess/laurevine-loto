// Wiki-links `[[Note]]`, `[[Note|alias]]`, `[[Note#Heading]]` and embeds `![[file]]`. Active only when env.wiki is set; env.wiki.resolve(`[[target#anchor]]`) -> { status, path?, matches? }.
// Links render as inert spans (no navigation yet); embeds render as flagged placeholders, never loaded or executed.
const RE = /^(!?)\[\[([^[\]|#\n]*)(?:#([^[\]|\n]*))?(?:\|([^[\]\n]*))?\]\]/;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STATE = { ok: 'ok', unknown: 'unknown', ambiguous: 'ambiguous' };

export function wikilinksPlugin(md) {
  md.inline.ruler.before('link', 'wikilink', (s, silent) => {
    const c = s.src.charCodeAt(s.pos);
    if (!s.env.wiki || (c !== 0x5B && c !== 0x21)) return false;
    const m = RE.exec(s.src.slice(s.pos, s.pos + 400));
    if (!m) return false;
    const target = m[2].trim(), anchor = (m[3] || '').trim();
    if (!target && (m[1] || !anchor)) return false;
    if (!silent) s.push('wikilink', '', 0).meta = { embed: !!m[1], target, anchor, alias: (m[4] || '').trim() };
    s.pos += m[0].length;
    return true;
  });

  md.renderer.rules.wikilink = (tk, i, o, env) => {
    const { embed, target, anchor, alias } = tk[i].meta;
    const r = env.wiki.resolve(`[[${target}${anchor ? `#${anchor}` : ''}]]`);
    const st = STATE[r.status] || 'missing';
    const name = [target, anchor].filter(Boolean).join(' › ');
    const tip = st === 'ok' ? r.path : st === 'ambiguous' ? `Ambiguous: ${r.matches.join(', ')}` : st === 'unknown' ? 'Open a workspace to resolve' : 'Not found in workspace';
    const data = st === 'ok' ? ` data-wiki-path="${esc(r.path)}" data-wiki-anchor="${esc(anchor)}"` : '';
    const raw = ` data-wiki="${esc(`[[${target}${anchor ? `#${anchor}` : ''}]]`)}"`;
    if (embed) return `<span class="lt-embed lt-embed-${st}" title="${esc(tip)} · embeds are not rendered"${data}><b class="lt-embed-flag">Embed</b> ${esc(name)}<i> not rendered</i></span>`;
    return `<span class="lt-wiki lt-wiki-${st}" title="${esc(tip)}"${data}${raw}>${esc(alias || name)}</span>`;
  };
}
