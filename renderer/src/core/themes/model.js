import { parseColour, contrastRatio } from './colour.js';
import { ORDER, PALETTES } from './palettes.js';

export const MAX_THEMES = 40;
export const LIBRARY_MAX = 80000;
export const IMPORT_MAX = 200000;
const NAME_MAX = 60, IMPORT_COUNT = 20, ID = /^t-[a-z0-9]{3,24}$/;

export const TOKEN_GROUPS = Object.freeze(['Surfaces', 'Text', 'Accent', 'Syntax', 'Typography', 'Shape']);
export const TOKENS = Object.freeze([
  ['app-bg', 'Application background', 'colour', 'Surfaces'], ['workspace', 'Workspace', 'colour', 'Surfaces'], ['surface', 'Surface', 'colour', 'Surfaces'],
  ['paper', 'Paper', 'colour', 'Surfaces'], ['border', 'Border', 'colour', 'Surfaces'], ['border-2', 'Strong border', 'colour', 'Surfaces'],
  ['hover', 'Hover', 'colour', 'Surfaces'], ['pressed', 'Pressed', 'colour', 'Surfaces'], ['sel-bg', 'Selection background', 'colour', 'Surfaces'],
  ['sel-border', 'Selection border', 'colour', 'Surfaces'],
  ['text', 'Text', 'colour', 'Text'], ['text-2', 'Secondary text', 'colour', 'Text'], ['danger', 'Error', 'colour', 'Text'],
  ['accent', 'Accent', 'colour', 'Accent'], ['accent-d', 'Accent (strong)', 'colour', 'Accent'], ['accent-l', 'Accent (soft)', 'colour', 'Accent'],
  ['t-key', 'Keys and markers', 'colour', 'Syntax'], ['t-head', 'Headings', 'colour', 'Syntax'], ['t-link', 'Links', 'colour', 'Syntax'],
  ['t-code', 'Code', 'colour', 'Syntax'], ['t-quote', 'Quotes', 'colour', 'Syntax'],
  ['font', 'Interface font', 'font', 'Typography'], ['serif', 'Serif font', 'font', 'Typography'], ['mono', 'Monospace font', 'font', 'Typography'],
  ['r', 'Corner radius', 'length', 'Shape'],
].map(([key, label, kind, group]) => Object.freeze({ key, label, kind, group })));
const KEYS = new Set(TOKENS.map((t) => t.key));

const FONTS = {
  font: "'IBM Plex Sans','Spline Sans','Segoe UI',system-ui,sans-serif", serif: "'EB Garamond',Georgia,serif",
  mono: "'JetBrains Mono',ui-monospace,Consolas,monospace", r: '3px',
};
const builtin = (id, name, base, vars) => Object.freeze({ id, name, base, builtin: true, vars: Object.freeze({ ...FONTS, ...vars }) });
export const LIGHT = builtin('light', 'Light', 'light', {
  accent: '#876B3E', 'accent-d': '#725B32', 'accent-l': '#B79F72', 'app-bg': '#F8F7F3', workspace: '#F0EFE9', surface: '#FDFCFA', paper: '#FBFAF6',
  text: '#292823', 'text-2': '#625F58', border: '#E3E0D6', 'border-2': '#D3CFC2', hover: '#EFEBE0', pressed: '#E6DFCB', 'sel-bg': '#F1EBDD',
  'sel-border': '#D9CBA7', danger: '#B3261E', 't-key': '#8A5A2B', 't-head': '#725B32', 't-link': '#4F6F8A', 't-code': '#63724A', 't-quote': '#736E61',
});
export const DARK = builtin('dark', 'Dark', 'dark', {
  accent: '#B39560', 'accent-d': '#C9AE7C', 'accent-l': '#8E774A', 'app-bg': '#201F1B', workspace: '#171613', surface: '#262521', paper: '#2B2A25',
  text: '#E8E4DA', 'text-2': '#ABA699', border: '#35332D', 'border-2': '#47443B', hover: '#302E28', pressed: '#3B382E', 'sel-bg': '#3A3424',
  'sel-border': '#5C4F30', danger: '#F4918A', 't-key': '#D2A66A', 't-head': '#CBB280', 't-link': '#8FB0CC', 't-code': '#A5B887', 't-quote': '#9A958A',
});
const baseOf = (base) => (base === 'dark' ? DARK : LIGHT);
const hex = (c) => `#${c}`;
export const BUILTINS = Object.freeze(PALETTES.map(([id, name, dark, row]) => {
  const c = Object.fromEntries(row.split(' ').map((v, i) => [ORDER[i], hex(v)]));
  return builtin(id, name, dark ? 'dark' : 'light', {
    'app-bg': c['app-bg'], workspace: c.workspace, surface: c.surface, paper: c['code-bg'], text: c.text, 'text-2': c['text-2'], border: c.border, 'border-2': c['border-2'],
    hover: c.hover, pressed: c.pressed, 'sel-bg': c['sel-bg'], 'sel-border': c['sel-border'], accent: c.accent, 'accent-d': c['accent-d'], 'accent-l': c['accent-l'],
    danger: baseOf(dark ? 'dark' : 'light').vars.danger, 't-head': c['k-cmd'], 't-key': c['k-math'], 't-link': c['k-arg'], 't-code': c['k-env'], 't-quote': c['text-2'],
  });
}));
export const isStock = (t) => t === LIGHT || t === DARK;

const FAMILY = /^(?:"[A-Za-z0-9][A-Za-z0-9 -]{0,58}"|'[A-Za-z0-9][A-Za-z0-9 -]{0,58}'|[A-Za-z][A-Za-z0-9-]*(?: [A-Za-z0-9-]+)*)$/;
const CSS_WIDE = /^(?:initial|inherit|unset|revert|revert-layer|default)$/i;
const LENGTH = /^(?:0|(\d{1,2}(?:\.\d{1,2})?)(px|rem|em))$/;

const checkers = {
  colour: (v) => (parseColour(v) ? '' : 'Use #rrggbb, rgb(), rgba(), hsl() or hsla().'),
  length: (v) => {
    const m = LENGTH.exec(v);
    if (!m) return 'Use 0 or a number with px, rem or em.';
    return m[1] && parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16) > 32 ? 'Lengths are limited to 32px (2rem).' : '';
  },
  font: (v) => {
    const parts = v.split(',');
    const ok = v.length <= 200 && parts.length <= 8 && parts.every((p) => FAMILY.test(p.trim()) && !CSS_WIDE.test(p.trim()));
    return ok ? '' : 'Use up to 8 font names separated by commas (letters, digits, spaces and hyphens; no functions or urls).';
  },
};

export function validateValue(kind, value) {
  if (typeof value !== 'string' || !checkers[kind]) return 'Invalid value.';
  const v = value.trim();
  return v ? checkers[kind](v) : 'Enter a value.';
}

export function sanitizeVars(input, base) {
  if (input === undefined) return { vars: { ...baseOf(base).vars } };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Theme values must be an object.' };
  const vars = { ...baseOf(base).vars };
  for (const [key, value] of Object.entries(input)) {
    if (!KEYS.has(key)) return { error: `Unknown design token “${key.slice(0, 30)}”.` };
    const kind = TOKENS.find((t) => t.key === key).kind, e = validateValue(kind, value);
    if (e) return { error: `${key}: ${e}` };
    vars[key] = value.trim();
  }
  return { vars };
}

export function cleanName(name) {
  const n = typeof name === 'string' ? name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  return n.length >= 1 && n.length <= NAME_MAX ? n : '';
}

export function uniqueName(name, themes, exceptId) {
  const taken = new Set([LIGHT, DARK, ...BUILTINS, ...themes].filter((t) => t.id !== exceptId).map((t) => t.name.toLowerCase()));
  const root = name.slice(0, NAME_MAX - 5);
  let out = name, i = 2;
  while (taken.has(out.toLowerCase())) out = `${root} ${i++}`;
  return out;
}

function makeTheme(raw, id) {
  const base = raw && raw.base === 'dark' ? 'dark' : raw && raw.base === 'light' ? 'light' : '';
  if (!base) return { error: 'A theme needs a base of “light” or “dark”.' };
  const name = cleanName(raw.name);
  if (!name) return { error: `A theme name must be 1 to ${NAME_MAX} characters.` };
  const v = sanitizeVars(raw.vars, base);
  return v.error ? { error: `“${name}”: ${v.error}` } : { theme: { id, name, base, vars: v.vars } };
}

export function parseLibrary(text) {
  if (typeof text !== 'string' || !text.trim()) return { themes: [], dropped: 0 };
  let data;
  try { data = JSON.parse(text); } catch { return { themes: [], dropped: 0, error: 'invalid JSON' }; }
  if (!data || data.v !== 1 || !Array.isArray(data.themes)) return { themes: [], dropped: 0, error: 'unrecognized format' };
  const themes = [], seen = new Set();
  for (const raw of data.themes.slice(0, MAX_THEMES)) {
    const id = raw && typeof raw.id === 'string' && ID.test(raw.id) && !seen.has(raw.id) ? raw.id : '';
    const r = id ? makeTheme(raw, id) : { error: 'bad id' };
    if (r.theme) { seen.add(id); themes.push({ ...r.theme, name: uniqueName(r.theme.name, themes) }); }
  }
  return { themes, dropped: data.themes.length - themes.length };
}

export function serializeLibrary(themes) {
  if (!themes.length) return '';
  return JSON.stringify({
    v: 1,
    themes: themes.map((t) => ({
      id: t.id, name: t.name, base: t.base,
      vars: Object.fromEntries(Object.entries(t.vars).filter(([k, v]) => baseOf(t.base).vars[k] !== v)),
    })),
  });
}

export function exportTheme(t) {
  return JSON.stringify({ 'loto-theme': 1, name: t.name, base: t.base, vars: t.vars }, null, 2);
}

export function parseImport(text) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'Paste theme JSON or choose a file first.' };
  if (text.length > IMPORT_MAX) return { error: 'That theme file is too large.' };
  let data;
  try { data = JSON.parse(text); } catch { return { error: 'That is not valid JSON.' }; }
  const list = data && data['loto-theme'] === 1 ? [data] : data && data['loto-themes'] === 1 && Array.isArray(data.themes) ? data.themes : null;
  if (!list || !list.length) return { error: 'That is not a Laurevine Loto theme file.' };
  if (list.length > IMPORT_COUNT) return { error: `A file can hold up to ${IMPORT_COUNT} themes.` };
  const themes = [];
  for (const raw of list) {
    const r = makeTheme(raw, '');
    if (r.error) return { error: r.error };
    themes.push({ name: r.theme.name, base: r.theme.base, vars: r.theme.vars });
  }
  return { themes };
}

export const allThemes = (customs) => [LIGHT, DARK, ...BUILTINS, ...customs];
export const findTheme = (customs, id) => allThemes(customs).find((t) => t.id === id) || null;
export const resolveSlot = (customs, id, base) => {
  const t = findTheme(customs, id);
  return t && t.base === base ? t : baseOf(base);
};

function newId(themes) {
  const used = new Set(themes.map((t) => t.id));
  let id;
  do id = `t-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`; while (used.has(id));
  return id;
}

export function addTheme(themes, { name, base, vars }) {
  if (themes.length >= MAX_THEMES) return { error: `You can keep up to ${MAX_THEMES} custom themes.` };
  const r = makeTheme({ name, base, vars }, newId(themes));
  if (r.error) return r;
  const theme = { ...r.theme, name: uniqueName(r.theme.name, themes) };
  return { themes: [...themes, theme], theme };
}

export function updateTheme(themes, id, { name, vars }) {
  const cur = themes.find((t) => t.id === id);
  if (!cur) return { error: 'That theme no longer exists.' };
  const r = makeTheme({ name, base: cur.base, vars }, id);
  if (r.error) return r;
  if (uniqueName(r.theme.name, themes, id) !== r.theme.name) return { error: 'Another theme already uses that name.' };
  return { themes: themes.map((t) => (t.id === id ? r.theme : t)) };
}

export const removeTheme = (themes, id) => themes.filter((t) => t.id !== id);

const PAIRS = [
  ['text', 'surface', 'Text on surface', 4.5], ['text', 'app-bg', 'Text on application background', 4.5], ['text', 'paper', 'Text on paper', 4.5],
  ['text', 'sel-bg', 'Text on selection', 4.5], ['text', 'hover', 'Text on hover', 4.5], ['text-2', 'surface', 'Secondary text on surface', 4.5],
  ['danger', 'surface', 'Error text on surface', 4.5], ['accent', 'surface', 'Accent on surface', 3], ['t-link', 'paper', 'Links on paper', 4.5],
  ['t-key', 'paper', 'Keys on paper', 4.5], ['t-head', 'paper', 'Headings on paper', 4.5], ['t-code', 'paper', 'Code on paper', 4.5],
  ['t-quote', 'paper', 'Quotes on paper', 4.5],
];

export function contrastWarnings(vars) {
  const out = [];
  for (const [fg, bg, label, min] of PAIRS) {
    const ratio = contrastRatio(vars[fg], vars[bg]);
    if (ratio !== null && ratio < min) out.push({ label, ratio: Math.round(ratio * 10) / 10, min });
  }
  return out;
}
