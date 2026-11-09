import { classify, splitEol, ATX } from './blocks.js';
import { splitFrontmatter } from '../markdown/frontmatter.js';
import { CONSTRUCTS, LEVELS, detect } from '../markdown/portability.js';
import { PROFILES, PROFILE_IDS } from '../markdown/profiles.js';

const EXTRA = Object.freeze({
  math: { label: 'Math', level: 'extended', plugin: null, note: 'Supported by GitHub and most editors; not part of CommonMark.' },
  headingid: { label: 'Heading ID', level: 'extended', plugin: 'heading-ids', note: '{#id} heading attributes are an extension; other tools show them as text.' },
  highlight: { label: 'Highlight', level: 'extended', plugin: 'highlight', note: '==text== is an extension (Obsidian, Pandoc); other tools show the equals signs.' },
});
const meta = (id) => CONSTRUCTS[id] || EXTRA[id];

const STRIKE = /(?<![~\\])~~(?=\S)[^~\n]+?(?<=\S)~~(?!~)/;
const TASK = /^\s*(?:[-*+]|\d{1,9}[.)])\s+\[[ xX]\](?:\s|$)/;
const MATH = /(?<![\\$])\$(?=[^\s$])[^$\n]*?(?<=[^\s$\\])\$(?!\$|\d)/;
const HID = /\s\{#[\w:.-]+\}\s*$/;
const MARKED = /(?<!=)==(?=\S)[^=\n]+?(?<=\S)==(?!=)/;

function scanExtra(body, { lines, blocks }) {
  const out = [], add = (id, i) => out.push({ id, line: i + 1 });
  if (splitFrontmatter(body).present) add('frontmatter', 0);
  for (const b of blocks) {
    if (b.k === 'table') add('table', b.a);
    if (b.k === 'math') add('math', b.a);
    if (b.k === 'code' && b.sub === 'fence' && /^[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i.test(lines[b.a])) add('mermaid', b.a);
    if (b.k !== 'text' && b.k !== 'table') continue;
    for (let i = b.a; i <= b.b; i++) {
      const s = lines[i].replace(/`[^`\n]*`/g, '');
      if (STRIKE.test(s)) add('strikethrough', i);
      if (b.k === 'text' && TASK.test(s)) add('tasklist', i);
      if (MATH.test(s)) add('math', i);
      if (b.k === 'text' && ATX.test(s) && HID.test(s)) add('headingid', i);
      if (MARKED.test(s)) add('highlight', i);
    }
  }
  return out;
}

export function inspectDialect(text, { html = true, wiki = false } = {}) {
  const { body } = splitEol(String(text ?? '')), cl = classify(body);
  const starts = [];
  let off = 0;
  for (const l of cl.lines) { starts.push(off); off += l.length + 1; }
  const by = new Map();
  for (const f of [...detect(body), ...scanExtra(body, cl)]) {
    if (!by.has(f.id)) by.set(f.id, []);
    by.get(f.id).push(f.line);
  }
  const constructs = [...by].map(([id, ls]) => {
    const m = meta(id), rank = LEVELS[m.level].rank;
    ls.sort((a, b) => a - b);
    return {
      id, label: m.label, level: m.level, note: m.note, count: ls.length,
      beyond: rank >= 2 ? 'gfm' : rank === 1 ? 'commonmark' : null,
      jumps: ls.slice(0, 200).map((line) => ({ line, from: starts[line - 1] })),
    };
  }).sort((a, b) => LEVELS[b.level].rank - LEVELS[a.level].rank || b.count - a.count);
  const ok = (id, p) => {
    const pl = meta(id).plugin;
    return pl === null || (pl === 'html' ? html : p.plugins.includes(pl) || (pl === 'wikilinks' && wiki));
  };
  const fits = PROFILE_IDS.map((pid) => ({ profile: pid, label: PROFILES[pid].label, missing: constructs.filter((c) => !ok(c.id, PROFILES[pid])).map((c) => c.id) }));
  const best = fits.reduce((a, b) => (b.missing.length < a.missing.length ? b : a));
  const top = constructs.reduce((r, c) => Math.max(r, LEVELS[c.level].rank), 0);
  return {
    profile: best.profile, label: best.label, exact: best.missing.length === 0,
    level: Object.keys(LEVELS).find((k) => LEVELS[k].rank === top),
    constructs, fits,
  };
}
