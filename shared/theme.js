// Laurevine theme model: CSS-variable sets for publications, reusable by Themes manager. Pure.
export const THEME_FORMAT = 'laurevine-theme';
export const THEME_VERSION = 1;

export const STANDARD_THEME_VARS = Object.freeze([
  '--bg', '--tx', '--hd', '--ln', '--ac', '--cb', '--bd', '--t2',
  '--th', '--tb', '--co', '--dv', '--dc',
]);

const SAFE_NAME = /^--[a-zA-Z0-9_-]+$/;

export function cleanVarName(name) {
  const n = String(name ?? '').trim();
  const withPrefix = n.startsWith('--') ? n : `--${n}`;
  return SAFE_NAME.test(withPrefix) ? withPrefix : null;
}

export function cleanVarValue(val) {
  if (val == null) return '';
  const s = String(val).trim().replace(/<\/(style|script)/gi, '<\\/$1');
  return s.replace(/[;\r\n]+/g, ' ').trim();
}

export function parseThemeVars(input) {
  if (!input) return {};
  if (typeof input === 'object') {
    const raw = input.variables || input.vars || input;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      const name = cleanVarName(k), val = cleanVarValue(v);
      if (name && val) out[name] = val;
    }
    return out;
  }
  const str = String(input).trim();
  if (!str) return {};
  if (str.startsWith('{')) {
    try { return parseThemeVars(JSON.parse(str)); } catch { /* fall through to CSS parse */ }
  }
  const out = {};
  const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}\r\n]+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const name = cleanVarName(m[1]), val = cleanVarValue(m[2]);
    if (name && val) out[name] = val;
  }
  return out;
}

export function themeCss(vars, selector = ':root') {
  const entries = Object.entries(vars || {}).map(([k, v]) => `${k}:${v}`).join(';');
  return entries ? `${selector}{${entries}}\n` : '';
}

export function createTheme(name, vars, scheme = 'light') {
  return {
    format: THEME_FORMAT,
    version: THEME_VERSION,
    name: String(name || 'Custom Theme').trim().slice(0, 60),
    scheme: scheme === 'dark' ? 'dark' : 'light',
    variables: parseThemeVars(vars),
  };
}

export function parseThemeFile(text) {
  try {
    const j = JSON.parse(text);
    if (!j || j.format !== THEME_FORMAT) return null;
    return createTheme(j.name, j.variables || j.vars, j.scheme);
  } catch { return null; }
}

export const themeFile = (theme) => JSON.stringify(createTheme(theme.name, theme.variables, theme.scheme), null, 2);
