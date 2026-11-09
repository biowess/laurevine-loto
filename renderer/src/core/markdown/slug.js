const github = (text) => String(text).trim().toLowerCase()
  .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
  .replace(/ /g, '-');

const ascii = (text) => github(String(text).normalize('NFKD').replace(/\p{M}/gu, '')).replace(/[^a-z0-9_-]/g, '');

// GitLab: GitHub rules, then runs of hyphens collapse and edge hyphens go.
const gitlab = (text) => github(text).replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');

// Pandoc auto_identifiers: keep letters, digits, _ - .; drop everything before the first letter; empty -> section.
const pandoc = (text) => String(text).trim().toLowerCase().split(/\s+/).join('-')
  .replace(/[^\p{L}\p{M}\p{N}_.-]/gu, '').replace(/^[^\p{L}]+/u, '') || 'section';

// Simple ASCII kebab: accents folded, every other run becomes one hyphen; non-Latin only -> section.
const simple = (text) => String(text).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';

export const SLUG_STRATEGIES = Object.freeze({ github, gitlab, pandoc, simple, ascii });
export const DEFAULT_SLUG_STRATEGY = 'github';

export const slugify = (text, strategy = DEFAULT_SLUG_STRATEGY) => (SLUG_STRATEGIES[strategy] || github)(text);

// Per-document slugger: repeats get -1, -2, ... (GitHub numbering).
export function createSlugger(strategy = DEFAULT_SLUG_STRATEGY) {
  const used = new Map();
  return {
    slug(text) {
      const base = slugify(text, strategy);
      let id = base;
      let n = used.get(base) || 0;
      while (used.has(id)) id = `${base}-${++n}`;
      used.set(base, n);
      used.set(id, used.get(id) || 0);
      return id;
    },
    reset: () => used.clear(),
  };
}

export const slugAll = (texts, strategy) => { const s = createSlugger(strategy); return texts.map((t) => s.slug(t)); };

// Warning text when `strategy` is not portable: null for GitHub, or when no given heading differs from its GitHub anchor.
export function anchorWarning(strategy, texts = []) {
  if (strategy === 'github' || !SLUG_STRATEGIES[strategy]) return null;
  if (texts.length) { const g = slugAll(texts, 'github'); if (slugAll(texts, strategy).every((id, i) => id === g[i])) return null; }
  return `Heading anchors "${strategy}" differ from GitHub's; links to headings may break outside Laurevine.`;
}
