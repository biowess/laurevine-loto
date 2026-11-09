// ExportConfig: the single versioned model every Studio control edits. Pure; imports nothing.
export const EXPORT_CONFIG_VERSION = 1;

export const FONT_STACKS = Object.freeze({
  serif: 'Georgia, "Times New Roman", serif',
  classic: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

// Millimetres, portrait.
export const PAGE_SIZES = Object.freeze({ A4: [210, 297], A5: [148, 210], B5: [176, 250], Letter: [215.9, 279.4], Legal: [215.9, 355.6] });

export const pageMm = (g) => (g.size === 'Custom' ? [g.width, g.height] : PAGE_SIZES[g.size]);

const pal = (scheme, background, text, heading, link, accent, codeBackground, border, textSecondary = text, tableHeader = codeBackground, tableBorder = border, calloutBackground = codeBackground, divider = border, decoration = accent) => Object.freeze({ scheme, background, text, heading, link, accent, codeBackground, border, textSecondary, tableHeader, tableBorder, calloutBackground, divider, decoration });
export const PALETTES = Object.freeze({
  paper: pal('light', '#ffffff', '#1f2328', '#111827', '#0b5fb0', '#8a5a00', '#f4f4f5', '#d4d4d8'),
  sepia: pal('light', '#f6efe0', '#3b3226', '#2a2118', '#8a4b08', '#7a5c1f', '#ece1c8', '#d6c7a4'),
  ink: pal('dark', '#16181d', '#d9dce1', '#f2f4f7', '#7ab7ff', '#e0b252', '#20242b', '#343a45'),
  contrast: pal('light', '#ffffff', '#000000', '#000000', '#0000cc', '#7a0000', '#eeeeee', '#000000'),
  midnight: pal('dark', '#0f172a', '#e2e8f0', '#f8fafc', '#7dd3fc', '#fbbf24', '#1e293b', '#334155', '#a8b3c7', '#1e293b', '#475569', '#16213a', '#334155', '#38bdf8'),
  oxford: pal('light', '#fbf9f3', '#1b2433', '#0b2545', '#134074', '#7a5c14', '#eef0f4', '#c9ced8', '#4a5568', '#e3e8f0', '#b8c0cf', '#edf1f8', '#c9ced8', '#0b2545'),
  burgundy: pal('light', '#fdf8f6', '#2a1a1d', '#6b1a2b', '#8a1c3a', '#7a4a12', '#f6ece9', '#dcc6c2', '#5c4146', '#f0dcd8', '#cfaaa4', '#f8e9e6', '#dcc6c2', '#6b1a2b'),
  forest: pal('light', '#f7faf6', '#1d2a1f', '#14532d', '#166534', '#6b5a12', '#eaf2e8', '#c3d4c0', '#46564a', '#dcebd9', '#a9c3a5', '#e8f3e6', '#c3d4c0', '#14532d'),
  olive: pal('light', '#fbfaf1', '#2b2b1a', '#4d5a14', '#55641a', '#7a5a12', '#f1f0dc', '#d4d3b0', '#50502f', '#e8e7c8', '#bdbc8a', '#f0efd6', '#d4d3b0', '#55641a'),
  slate: pal('dark', '#1e2227', '#d7dde4', '#f1f5f9', '#8ab4f8', '#e6b86a', '#2a3038', '#3d4651', '#a3adb8', '#2a3038', '#526070', '#272d34', '#3d4651', '#64748b'),
  terracotta: pal('light', '#fdf6f1', '#2e1f19', '#8c3b1c', '#9a3412', '#7c4a03', '#f6e9e0', '#e0c8b8', '#5a4136', '#f1dccf', '#d3ad96', '#f7e6db', '#e0c8b8', '#c2562b'),
  monochrome: pal('light', '#ffffff', '#111111', '#000000', '#333333', '#444444', '#f2f2f2', '#cccccc', '#444444', '#e6e6e6', '#999999', '#f0f0f0', '#bbbbbb', '#222222'),
  neutral: pal('light', '#fafaf9', '#27272a', '#18181b', '#1d4ed8', '#92400e', '#f0f0ee', '#d6d3d1', '#52525b', '#e7e5e4', '#c4c0bb', '#efeeec', '#d6d3d1', '#78716c'),
});

const E = (v, d) => ({ t: 'e', v, d });
const B = (d) => ({ t: 'b', d });
const N = (min, max, d, int = false) => ({ t: 'n', min, max, d, int });
const S = (max, d = '', re = null) => ({ t: 's', max, d, re });
const A = (item, max) => ({ t: 'a', item, max });
const HEX = /^#[0-9a-fA-F]{6}$/;
const color = (d) => S(7, d, HEX);
const P = PALETTES.paper;
const fonts = Object.keys(FONT_STACKS);
// Per-role typography: font '' / weight 0 / size 0 / italic 'auto' mean "template default".
const role = (size) => ({ font: S(60, '', /^[A-Za-z0-9 -]*$/), weight: N(0, 900, 0, true), italic: E(['auto', 'italic', 'normal'], 'auto'), ...(size ? { size: N(0, 5, 0) } : {}) });

const zones = () => ({ left: S(200), centre: S(200), right: S(200) });

const SCHEMA = {
  template: S(40, 'article', /^[a-z][a-z0-9-]*$/),
  typography: {
    bodyFont: E(fonts, 'serif'), headingFont: E(fonts, 'sans'), codeFont: E(['mono'], 'mono'),
    fontSize: N(8, 24, 16), lineHeight: N(1.1, 2.4, 1.6), headingScale: N(1, 1.6, 1.25), paragraphSpacing: N(0, 2, 0.8), codeSize: N(0.7, 1.2, 0.9),
    align: E(['left', 'justify'], 'left'), hyphenate: B(false),
    letterSpacing: N(-0.1, 0.5, 0), headingBefore: N(0, 4, 0), headingAfter: N(0, 2, 0),
    roles: { body: role(), heading: role(), title: role(1), caption: role(1), table: role(1), code: role() },
  },
  palette: {
    preset: E([...Object.keys(PALETTES), 'custom'], 'paper'), scheme: E(['light', 'dark', 'auto'], P.scheme), prefersColorScheme: B(false),
    background: color(P.background), text: color(P.text), heading: color(P.heading), link: color(P.link), accent: color(P.accent), codeBackground: color(P.codeBackground), border: color(P.border),
    textSecondary: color(P.textSecondary), tableHeader: color(P.tableHeader), tableBorder: color(P.tableBorder), calloutBackground: color(P.calloutBackground), divider: color(P.divider), decoration: color(P.decoration),
  },
  columns: {
    count: N(1, 3, 1, true), gap: N(0, 4, 2), rule: B(false), ruleStyle: E(['solid', 'dashed', 'dotted', 'double'], 'solid'), ruleColor: color(''), ruleWidth: N(0.25, 4, 1),
    balance: B(true), headingSpan: E(['none', 'h1', 'h1h2'], 'none'), flow: E(['flow', 'keep'], 'flow'), orphans: N(1, 6, 2, true), widows: N(1, 6, 2, true),
    images: E(['inline', 'span', 'float'], 'inline'), tables: E(['fit', 'span', 'scale'], 'fit'),
    keepFigures: B(true), keepCode: B(true), keepTables: B(true), keepCallouts: B(true), codeBreak: B(false),
    autoSpan: B(true), minColumnWidthForTable: N(5, 80, 22), minColumnWidthForFigure: N(20, 200, 70), maxCodeChars: N(0, 400, 0, true),
  },
  page: {
    size: E([...Object.keys(PAGE_SIZES), 'Custom'], 'A4'), orientation: E(['portrait', 'landscape'], 'portrait'),
    unit: E(['mm', 'in'], 'mm'), width: N(50, 1500, 210), height: N(50, 1500, 297), marginsLinked: B(true), facing: B(false),
    background: S(7, '', /^(#[0-9a-fA-F]{6})?$/), direction: E(['auto', 'ltr', 'rtl'], 'auto'),
    margins: { top: N(0, 60, 20), right: N(0, 60, 20), bottom: N(0, 60, 20), left: N(0, 60, 20) },
    maxWidth: N(40, 120, 72),
  },
  headerFooter: {
    header: { on: B(false), ...zones() }, footer: { on: B(false), ...zones() }, headerEven: zones(), footerEven: zones(),
    font: E(['sans', 'body', 'heading', 'mono'], 'sans'), size: N(5, 16, 9), italic: B(false), color: S(7, '', /^(#[0-9a-fA-F]{6})?$/),
    rule: E(['none', 'header', 'footer', 'both'], 'none'), firstDifferent: B(false), oddEven: B(false), offset: N(-10, 10, 0),
  },
  numbering: {
    on: B(false), style: E(['arabic', 'roman', 'alphabetic', 'roman-arabic'], 'arabic'), start: N(1, 9999, 1, true), ofTotal: B(false), hideOnCover: B(true),
    position: E(['footer-centre', 'footer-left', 'footer-right', 'header-centre', 'header-left', 'header-right'], 'footer-centre'),
  },
  cover: {
    layout: E(['auto', 'centered', 'left', 'band', 'framed'], 'auto'), title: S(200), subtitle: S(200), author: S(200), date: S(40), organisation: S(200),
    logo: S(1500000, '', /^(data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+)?$/),
  },
  watermark: {
    on: B(false), kind: E(['text', 'image'], 'text'), text: S(60, 'DRAFT'), image: S(1500000, '', /^(data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+)?$/),
    angle: N(-90, 90, -45), opacity: N(0.02, 1, 0.1), size: N(5, 100, 30), position: E(['centre', 'top', 'bottom', 'start', 'end'], 'centre'), skipFirst: B(false), color: S(7, '', /^(#[0-9a-fA-F]{6})?$/),
  },
  decor: {
    border: { style: E(['none', 'solid', 'double', 'dashed', 'dotted'], 'none'), width: N(0.1, 5, 0.5), inset: N(2, 40, 8), color: S(7, '', /^(#[0-9a-fA-F]{6})?$/) },
    divider: E(['none', 'rule', 'fleuron', 'stars', 'diamond', 'dots'], 'none'),
    corners: B(false), accentBar: B(false), sideBar: B(false), colour: E(['decoration', 'accent', 'heading', 'divider'], 'decoration'),
  },
  structure: {
    cover: B(false), toc: B(false), tocDepth: N(1, 6, 3, true), tocTitle: S(80, 'Contents'),
    tocPlacement: E(['after-cover', 'start', 'none'], 'after-cover'), tocIndent: B(true),
    tocLeader: E(['dots', 'line', 'none'], 'dots'), tocPageNumbers: B(true), tocLinks: B(true),
    tocLevels: { l1: role(1), l2: role(1), l3: role(1), l4: role(1), l5: role(1), l6: role(1) },
    numberHeadings: B(false), numberScheme: E(['1.1.1', 'I.A.1'], '1.1.1'), numberDepth: N(1, 6, 6, true), numberRestart: E(['parent', 'document'], 'parent'), skipTitle: B(true), skipFront: B(true),
    breakBetweenDocs: B(true), breakBeforeH1: B(false), pageBreakDirective: B(true), avoidBlank: B(true),
    captions: B(false), figureLabel: S(40, 'Figure'), tableLabel: S(40, 'Table'), captionSep: S(10, ': '), figurePos: E(['above', 'below'], 'below'), tablePos: E(['above', 'below'], 'above'),
    captionNumbering: E(['continuous', 'chapter'], 'continuous'), lof: B(false), lot: B(false), lofTitle: S(80, 'List of figures'), lotTitle: S(80, 'List of tables'), crossrefs: B(true),
    notes: E(['page', 'section', 'document'], 'page'), notesTitle: S(80, 'Notes'),
    bibStyle: E(['auto', 'author-year', 'numbered'], 'auto'), bibTitle: S(80, 'References'), bibPlacement: E(['end', 'section', 'none'], 'end'),
    bookmarks: B(true), bookmarkDepth: N(1, 6, 3, true),
    runningHeader: B(false), pageNumbers: B(false),
  },
  pagination: {
    headingKeep: B(true), orphans: N(1, 6, 2, true), widows: N(1, 6, 2, true), captionKeep: B(true), keepCode: B(true), keepCallouts: B(true),
    tableHeader: B(true), tableSingleRow: B(true), tableSmallKeep: B(true), smallTableRows: N(2, 12, 5, true), collapseBreaks: B(true), noEmptyPages: B(true),
  },
  sections: A({ id: S(200, '', /^.+$/), include: B(true), title: S(200), pageBreak: E(['auto', 'before', 'none'], 'auto') }, 500),
  sectionRules: A({ id: S(40, '', /^.+$/), slug: S(200), occ: N(0, 9999, 0, true), fp: S(20), text: S(200), level: N(1, 6, 1, true), cols: E(['auto', '1', '2', '3'], 'auto'), gap: N(0, 40, 0), sep: E(['inherit', 'none', 'line'], 'inherit'), brBefore: B(false), brAfter: B(false), mOn: B(false), mt: N(0, 100, 20), mr: N(0, 100, 20), mb: N(0, 100, 20), ml: N(0, 100, 20), hdr: E(['inherit', 'hide', 'custom'], 'inherit'), hdrText: S(200), ftr: E(['inherit', 'hide', 'custom'], 'inherit'), ftrText: S(200), noToc: B(false), noNum: B(false), style: E(['none', 'cover', 'abstract', 'appendix'], 'none') }, 500),
  metadata: { title: S(200), author: S(200), date: S(40), language: S(35, 'en', /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/), description: S(1000), keywords: S(500) },
  html: {
    standalone: B(true), prefersColorScheme: B(false), studio: B(false), watermark: B(true), assetDir: S(80, 'assets'),
    headingAnchors: B(true), anchorStrategy: E(['github', 'gitlab', 'pandoc', 'simple', 'ascii', 'auto'], 'auto'),
    toc: E(['none', 'sidebar', 'inline'], 'sidebar'),
    customCss: S(100000, ''), customCssFile: S(500, ''), customTheme: S(50000, ''),
  },
};

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isLeaf = (n) => typeof n.t === 'string';
const join = (p, k) => (p ? `${p}.${k}` : k);

function build(n) {
  if (!isLeaf(n)) return Object.fromEntries(Object.entries(n).map(([k, c]) => [k, build(c)]));
  return n.t === 'a' ? [] : n.d;
}

function fix(n, v, path, probs) {
  const bad = (message) => { probs.push({ path, message }); return build(n); };
  if (v === undefined) return build(n);
  if (!isLeaf(n)) {
    if (!isObj(v)) return bad('expected an object');
    for (const k of Object.keys(v)) if (!(k in n)) probs.push({ path: join(path, k), message: 'unknown key' });
    return Object.fromEntries(Object.entries(n).map(([k, c]) => [k, fix(c, v[k], join(path, k), probs)]));
  }
  switch (n.t) {
    case 'e': return n.v.includes(v) ? v : bad(`expected one of ${n.v.join(', ')}`);
    case 'b': return typeof v === 'boolean' ? v : bad('expected true or false');
    case 'n': return Number.isFinite(v) && v >= n.min && v <= n.max && (!n.int || Number.isInteger(v)) ? v : bad(`expected a number from ${n.min} to ${n.max}`);
    case 's': return typeof v === 'string' && v.length <= n.max && (!n.re || n.re.test(v)) ? v : (typeof v === 'object' && v !== null && JSON.stringify(v).length <= n.max ? JSON.stringify(v) : bad('invalid text'));
    default: {
      if (!Array.isArray(v)) return bad('expected a list');
      if (v.length > n.max) probs.push({ path, message: `only the first ${n.max} entries are kept` });
      const out = [], seen = new Set();
      v.slice(0, n.max).forEach((it, i) => {
        const p = `${path}[${i}]`, sub = [], r = isObj(it) ? fix(n.item, it, p, sub) : null;
        if (!r || !r.id || seen.has(r.id)) { probs.push({ path: p, message: 'entry dropped (needs a unique id)' }); return; }
        seen.add(r.id); out.push(r); probs.push(...sub);
      });
      return out;
    }
  }
}

export const defaultExportConfig = () => ({ version: EXPORT_CONFIG_VERSION, ...build(SCHEMA) });

// Step n upgrades a version-n config to n + 1. Future parts append here and bump EXPORT_CONFIG_VERSION.
const MIGRATIONS = [(c) => c];

export function migrateExportConfig(raw) {
  let c = isObj(raw) ? { ...raw } : {};
  let v = Number.isInteger(c.version) && c.version >= 0 ? c.version : 0;
  if (v > EXPORT_CONFIG_VERSION) return c;
  for (; v < EXPORT_CONFIG_VERSION; v++) c = MIGRATIONS[v](c);
  return { ...c, version: EXPORT_CONFIG_VERSION };
}

// Validates a current-version config: bad values fall back to defaults and are reported. Never throws.
export function validateExportConfig(raw) {
  const problems = [];
  if (isObj(raw) && raw.version > EXPORT_CONFIG_VERSION) problems.push({ path: 'version', message: 'saved by a newer version; unknown settings dropped' });
  const body = isObj(raw) ? { ...raw } : raw;
  if (isObj(body)) delete body.version;
  return { config: { version: EXPORT_CONFIG_VERSION, ...fix(SCHEMA, body === undefined || body === null ? {} : body, '', problems) }, problems };
}

// Accepts a JSON string or object of any version.
export function parseExportConfig(raw) {
  let v = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch { return { config: defaultExportConfig(), problems: [{ path: '', message: 'not valid JSON' }] }; } }
  return validateExportConfig(migrateExportConfig(v));
}

const merge = (a, b) => {
  if (!isObj(b)) return b;
  const out = { ...(isObj(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) out[k] = merge(out[k], v);
  return out;
};

// One Studio control edit: deep-merges `patch` (arrays replace) and revalidates.
// A full palette without the newer roles (template defaults, old files) derives them from its own colours; single-colour edits never do.
const BASE = ['background', 'text', 'heading', 'link', 'accent', 'codeBackground', 'border'];
const DERIVE = { textSecondary: 'text', tableHeader: 'codeBackground', tableBorder: 'border', calloutBackground: 'codeBackground', divider: 'border', decoration: 'accent' };
const derive = (patch) => {
  const p = isObj(patch) && isObj(patch.palette) ? patch.palette : null;
  if (!p || !BASE.every((k) => p[k] !== undefined)) return patch;
  return { ...patch, palette: { ...Object.fromEntries(Object.entries(DERIVE).map(([k, s]) => [k, p[s]])), ...p } };
};
export const patchExportConfig = (config, patch) => validateExportConfig(merge(config, derive(patch)));

export const applyPalette = (config, id) => (PALETTES[id] ? patchExportConfig(config, { palette: { preset: id, ...PALETTES[id] } }) : { config, problems: [{ path: 'palette.preset', message: `unknown palette ${id}` }] });
