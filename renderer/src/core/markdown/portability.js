// Portability registry: how widely each Markdown construct is understood (standard | gfm | extended | app-specific).
// `plugin` is the profile plugin id that renders it ('html' = Allow inline HTML setting; null = always).
export const LEVELS = Object.freeze({
  standard: { rank: 0, label: 'Standard', short: 'STD' },
  gfm: { rank: 1, label: 'GFM', short: 'GFM' },
  extended: { rank: 2, label: 'Extended', short: 'EXT' },
  'app-specific': { rank: 3, label: 'App-specific', short: 'APP' },
});

const c = (label, level, plugin, note) => Object.freeze({ label, level, plugin, note });

export const CONSTRUCTS = Object.freeze({
  table: c('Table', 'gfm', 'table', 'Pipe tables are GitHub Flavored Markdown; CommonMark shows them as text.'),
  strikethrough: c('Strikethrough', 'gfm', 'strikethrough', '~~text~~ is GitHub Flavored Markdown.'),
  tasklist: c('Task list', 'gfm', 'tasklist', '- [ ] items are GitHub Flavored Markdown.'),
  footnote: c('Footnote', 'gfm', 'footnotes', 'Supported by GitHub and most extended engines; CommonMark ignores it.'),
  callout: c('Callout', 'extended', 'callouts', 'GitHub renders only NOTE, TIP, IMPORTANT, WARNING and CAUTION; other types and folding are Obsidian-style.'),
  deflist: c('Definition list', 'extended', 'deflist', 'Markdown Extra / Pandoc syntax; not in CommonMark or GitHub.'),
  abbr: c('Abbreviation', 'extended', 'abbr', 'Markdown Extra syntax; not in CommonMark or GitHub.'),
  frontmatter: c('Front matter', 'extended', 'frontmatter', 'YAML header understood by static-site generators and note apps, not by CommonMark.'),
  htmlblock: c('HTML block', 'standard', 'html', 'Raw HTML is valid CommonMark, but viewers differ in what they allow; shown here only with Allow inline HTML.'),
  rule: c('Horizontal rule', 'standard', null, 'A thematic break (---) is valid CommonMark.'),
  mermaid: c('Mermaid diagram', 'extended', null, 'GitHub and many tools draw ```mermaid fences; CommonMark shows them as code.'),
  pagebreak: c('Page break', 'app-specific', 'pagebreak', 'Laurevine directive kept as an HTML comment; other tools ignore it and show no break.'),
  toc: c('Table of contents', 'standard', null, 'The list is plain Markdown and works everywhere. Laurevine keeps it current between HTML comment markers that other tools ignore, so elsewhere it will not refresh on its own.'),
  wikilink: c('Wiki-link', 'app-specific', 'wikilinks', '[[Note]] links are not Markdown; other tools show them as plain text.'),
  embed: c('Embed', 'app-specific', 'wikilinks', '![[file]] embeds are not Markdown; other tools show them as plain text.'),
  citation: c('Citation', 'extended', 'citations', 'Pandoc citation syntax [@key]; not in CommonMark or GitHub.'),
});

const SCAN = [
  ['callout', (l) => /^ {0,3}>\s?\[![A-Za-z]+\][+-]?/.test(l)],
  ['footnote', (l) => /\[\^[^\]\s]+\]/.test(l)],
  ['deflist', (l, p) => /^ {0,3}:[ \t]+\S/.test(l) && !!p.trim()],
  ['abbr', (l) => /^\*\[[^\]\n]+\]:[ \t]*\S/.test(l)],
  ['pagebreak', (l) => /^\s*<!--\s*laurevine:pagebreak\s*-->\s*$/.test(l)],
  ['htmlblock', (l) => /^ {0,3}<(?:details|summary|div|figure|figcaption)\b/i.test(l)],
  ['wikilink', (l) => /(?<!!)\[\[[^[\]\n]+\]\]/.test(l)],
  ['embed', (l) => /!\[\[[^[\]\n]+\]\]/.test(l)],
  ['citation', (l) => /\[-?@[a-zA-Z0-9_:.#$%&*+?<>~/^-]+(?:,\s*[^\]]+)?\]/.test(l)],
];

// -> [{ id, line }] (1-based), outside front matter and fenced code.
export function detect(text) {
  const lines = String(text ?? '').split('\n'), out = [];
  let i = 0, fence = '';
  if (/^---\s*$/.test(lines[0])) {
    const end = lines.findIndex((l, n) => n && /^(?:---|\.\.\.)\s*$/.test(l));
    if (end > 0) i = end + 1;
  }
  for (; i < lines.length; i++) {
    const l = lines[i], f = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !l.slice(f[0].length).trim()) fence = ''; continue; }
    if (f) { fence = f[1]; continue; }
    const s = l.replace(/`[^`\n]*`/g, '');
    for (const [id, test] of SCAN) if (test(s, i ? lines[i - 1] : '')) out.push({ id, line: i + 1 });
  }
  return out;
}

// Is a construct rendered by this profile? opts: { wiki, html } mirror the settings that enable it outside profiles.
export function supported(id, profile, { wiki = false, html = false } = {}) {
  const { plugin } = CONSTRUCTS[id];
  if (plugin === 'html') return !!html;
  return (profile.plugins || []).includes(plugin) || (plugin === 'wikilinks' && !!wiki);
}

export const beyondProfile = (found, profile, opts) => found.filter((f) => !supported(f.id, profile, opts));
export const beyondLevel = (found, level) => found.filter((f) => LEVELS[CONSTRUCTS[f.id].level].rank > LEVELS[level].rank);
