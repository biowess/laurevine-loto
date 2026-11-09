// Pure: preset model, starter presets, file format and bundle parsing.
import { defaultExportConfig, patchExportConfig, parseExportConfig } from './export-config.js';

export const PRESET_VERSION = 1;

export const STARTER_PRESETS = Object.freeze({
  'Academic Style': { template: 'academic', typography: { bodyFont: 'classic', headingFont: 'classic', align: 'justify', hyphenate: true }, columns: { count: 1 } },
  'Scientific Report': { template: 'scientific', columns: { count: 2, gap: 2, balance: true } },
  'Research Notes': { template: 'editorial', columns: { count: 1 }, structure: { notes: 'section' } },
  'Editorial Publication': { template: 'editorial', columns: { count: 1 } },
  'Technical Documentation': { template: 'technical', typography: { codeFont: 'mono' }, columns: { count: 1 } },
  'Minimal Print': { template: 'minimal', page: { margins: { top: 30, right: 30, bottom: 30, left: 30 } } },
});

export const starterConfig = (name) => {
  const p = STARTER_PRESETS[name];
  return p ? patchExportConfig(defaultExportConfig(), p).config : defaultExportConfig();
};

export const presetFile = (name, config) => JSON.stringify({ format: 'laurevine-preset', version: PRESET_VERSION, name, config }, null, 2);

export const bundleFile = (items) => JSON.stringify({ format: 'laurevine-preset-bundle', version: PRESET_VERSION, presets: items.map((t) => ({ name: t.name, config: t.config })) }, null, 2);

export function parsePresetFile(text) {
  try {
    const j = JSON.parse(text);
    if (!j || typeof j !== 'object') return null;
    const name = String(j.name || '').trim();
    const rawCfg = j.config || (j.template ? j : null);
    if (!rawCfg) return null;
    const { config } = parseExportConfig(rawCfg);
    return { name, config };
  } catch { return null; }
}

export function parseBundleOrSingle(text) {
  try {
    const j = JSON.parse(text);
    if (!j || typeof j !== 'object') return [];
    if (Array.isArray(j.presets)) {
      return j.presets.map((p) => ({ name: String(p.name || '').trim(), config: parseExportConfig(p.config || p).config })).filter((x) => x.name);
    }
    const single = parsePresetFile(text);
    return single ? [single] : [];
  } catch { return []; }
}
