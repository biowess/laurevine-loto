import { BUNDLED } from '../font-catalog.js';
import { defaultExportConfig, patchExportConfig } from '../../../../../shared/export-config.js';
import { editorial } from './editorial.js';
import { academic } from './academic.js';
import { scientific } from './scientific.js';
import { minimal } from './minimal.js';
import { modernReport } from './modern-report.js';
import { magazine } from './magazine.js';
import { technical } from './technical.js';
import { classic } from './classic.js';
import { thesis } from './thesis.js';
import { businessPack } from './business-pack.js';
import { literaryPack } from './literary-pack.js';

// Template = { id, name, description, fonts: [{ family, file, style, weight }], defaults: ExportConfig patch, css(config) -> string }.
const registry = new Map();

export function registerTemplate(t) {
  if (!t || !/^[a-z][a-z0-9-]*$/.test(t.id) || typeof t.css !== 'function') throw new Error('Invalid template');
  // `use: ['Inter', ...]` expands bundled families (every file, style and weight) into `fonts`; static files default to weight 400, variable files to the full range.
  const used = (t.use || []).flatMap((n) => (BUNDLED[n] || []).map(([file, style, weight]) => ({ family: n, file, style, weight: weight || (file.includes('[') ? '100 900' : '400') })));
  registry.set(t.id, Object.freeze({ defaults: {}, ...t, fonts: [...(t.fonts || []), ...used] }));
  return t.id;
}

export const getTemplate = (id) => registry.get(id) || null;
export const listTemplates = () => [...registry.values()].map(({ id, name, description }) => ({ id, name, description }));

// Defaults patch over a base config (or the schema defaults); unknown ids leave the base untouched.
export function templateConfig(id, base = defaultExportConfig()) {
  const t = getTemplate(id);
  return patchExportConfig(base, { ...(t ? t.defaults : {}), template: t ? id : base.template });
}

// @font-face rules for a template; `fontData(file)` returns a data: URI (publications allow fonts from data: only). Without it, stacks fall back to system fonts.
export function fontFaceCss(t, fontData) {
  if (!t || typeof fontData !== 'function') return '';
  return t.fonts.map((f) => {
    const src = fontData(f.file);
    return src ? `@font-face{font-family:'${f.family}';src:url('${src}') format('${/\.otf$/.test(f.file) ? 'opentype' : 'truetype'}');font-weight:${f.weight || '100 900'};font-style:${f.style || 'normal'};font-display:swap}` : '';
  }).join('\n');
}

// Template stylesheet appended after the base publication CSS (empty for unknown ids).
export function templateCss(id, config, env = {}) {
  const t = getTemplate(id);
  return t ? `${fontFaceCss(t, env.fontData)}\n${t.css(config)}` : '';
}

[editorial, academic, scientific, minimal, modernReport, magazine, technical, classic, thesis, ...businessPack, ...literaryPack].forEach(registerTemplate);
