import { COLOR_KEYS } from '../../../../shared/palette.js';
import { autoFix } from '../../core/publish/palette-contrast.js';
import * as PC from '../../services/palettes-client.js';

const pick = (p) => Object.fromEntries(['scheme', ...COLOR_KEYS].map((k) => [k, p[k]]));

// reg(id, title, icon, run); cfg() -> current ExportConfig; refresh() redraws the settings column.
export function paletteCommands(reg, cfg, refresh, C) {
  const { h, openDialog, toast, runCommand } = C.ui, set = (patch) => runCommand('studio.set', patch);
  const guard = (p) => p.catch((e) => toast(e.message || 'Palette action failed'));
  const ask = (title, value, ok) => openDialog({ title, icon: 'palette', width: 380, focus: 'input', body: h('input', { type: 'text', class: 'lv-pname', maxlength: 60, value, 'aria-label': 'Palette name' }),
    buttons: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: (api) => { const v = api.el.querySelector('input').value.trim(); if (!v) return false; ok(v); } }] });
  reg('studio.palette-save', 'Save Custom Palette…', 'save', () => ask('Save Custom Palette', 'My palette', (name) => guard(PC.save({ name, palette: pick(cfg().palette) }).then(() => { toast(`Saved palette “${name}”`); refresh(); }))));
  reg('studio.palette-use', 'Use Saved Palette', 'palette', (id) => guard(PC.list().then(({ items }) => { const t = items.find((x) => x.id === id); if (t) set({ palette: { ...t.palette, preset: 'custom' } }); })));
  reg('studio.palette-rename', 'Rename Saved Palette…', 'pen-line', (id) => ask('Rename Palette', id, (name) => guard(PC.update({ id, name }).then(refresh))));
  reg('studio.palette-duplicate', 'Duplicate Saved Palette', 'copy', (id) => guard(PC.duplicate(id).then(refresh)));
  reg('studio.palette-delete', 'Delete Saved Palette', 'trash-2', (id) => guard(PC.remove(id).then(refresh)));
  reg('studio.palette-import', 'Import Palettes…', 'folder-open', () => guard(PC.importFiles().then((r) => { if (r.ids.length || r.skipped) toast(`Imported ${r.ids.length} palette${r.ids.length === 1 ? '' : 's'}${r.skipped ? `, skipped ${r.skipped}` : ''}`); refresh(); })));
  reg('studio.palette-export', 'Export Palette…', 'download', (id) => guard(PC.exportOne(id)));
  reg('studio.palette-autofix', 'Auto-fix Contrast', 'check', () => {
    const p = cfg().palette, f = autoFix(p);
    if (COLOR_KEYS.some((k) => f[k] !== p[k])) set({ palette: { ...f, preset: 'custom' } });
  });
}
