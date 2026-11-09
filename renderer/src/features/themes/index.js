import { LIBRARY_MAX, addTheme, findTheme, parseLibrary, removeTheme, serializeLibrary, updateTheme } from '../../core/themes/model.js';
import { confirmDialog } from '../files/dialogs.js';
import { SLOT, mountThemes } from './apply.js';
import { openEditor, openExport, openImport, openManager, openRename } from './dialog.js';

const LIB = 'themes.library';

export function register(ctx) {
  const { commands, settings, ui } = ctx, group = 'Customization';
  let manager = null;

  const library = () => parseLibrary(settings.get(LIB));
  const customs = () => library().themes;
  const fail = (e) => ui.toast((e && e.message) || 'The theme could not be saved.', { timeout: 4000 });
  const lookup = (id) => (typeof id === 'string' ? findTheme(customs(), id) : null);
  const io = { library, async commit(themes) {
    const text = serializeLibrary(themes);
    if (text.length > LIBRARY_MAX) throw new Error('The themes are too large to save. Delete a theme first.');
    await settings.set(LIB, text);
  } };
  const def = (id, title, icon, run, extra) => commands.register({ id, title, icon, group, run, ...extra });
  const reset = (keys, id) => Promise.all(keys.filter((k) => settings.get(k) === id).map((k) => settings.reset(k).catch(fail)));

  def('custom.themes', 'Manage Themes…', 'palette', () => {
    if (!manager) manager = openManager(ctx, io, () => { manager = null; });
  }, { aliases: ['themes', 'manage themes', 'edit theme colours', 'custom theme'] });

  def('themes.apply', 'Use Theme', 'check', async (id) => {
    const t = lookup(id);
    if (!t) return;
    try { await settings.set(SLOT[t.base], t.id); await settings.set('appearance.theme', t.base); } catch (e) { fail(e); }
  });

  def('themes.edit', 'Edit Theme', 'sliders-horizontal', (id) => {
    const t = lookup(id);
    if (t && !t.builtin) openEditor(ctx, io, t);
  });

  def('themes.duplicate', 'Duplicate Theme', 'copy', async (id) => {
    const t = lookup(id);
    if (!t) return;
    const r = addTheme(customs(), { name: `${t.name} copy`, base: t.base, vars: t.vars });
    if (r.error) { ui.toast(r.error, { timeout: 4000 }); return; }
    try { await io.commit(r.themes); ui.toast(`Created ${r.theme.name}`); } catch (e) { fail(e); }
  });

  def('themes.rename', 'Rename Theme', 'pen-line', (id) => {
    const t = lookup(id);
    if (!t || t.builtin) return;
    openRename(ctx, t, async (name) => {
      const r = updateTheme(customs(), t.id, { name, vars: t.vars });
      if (r.error) return r.error;
      await io.commit(r.themes);
      return '';
    });
  });

  def('themes.delete', 'Delete Theme', 'trash-2', async (id) => {
    const t = lookup(id);
    if (!t || t.builtin || !(await confirmDialog(ctx, { title: 'Delete Theme', text: `Delete “${t.name}”? Places that use it go back to the built-in look.`, label: 'Delete' }))) return;
    try {
      await io.commit(removeTheme(customs(), t.id));
      await reset([SLOT[t.base], 'themes.preview'], t.id);
    } catch (e) { fail(e); }
  });

  def('themes.export', 'Export Theme…', 'file-down', (id) => {
    const t = lookup(id);
    if (t) openExport(ctx, t);
  });

  def('themes.import', 'Import Themes…', 'download', () => openImport(ctx, async (items) => {
    let next = customs();
    for (const it of items) {
      const r = addTheme(next, it);
      if (r.error) return r.error;
      next = r.themes;
    }
    await io.commit(next);
    ui.toast(`Imported ${items.length} theme${items.length === 1 ? '' : 's'}`);
    return '';
  }));

  mountThemes(ctx);
}
