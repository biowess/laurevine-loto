import { $ } from '../../ui/kit/dom.js';
import { TOKENS, TOKEN_GROUPS, IMPORT_MAX, allThemes, cleanName, contrastWarnings, exportTheme, parseImport, updateTheme, validateValue } from '../../core/themes/model.js';
import { toHex } from '../../core/themes/colour.js';
import { SLOT, paintVars } from './apply.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function openManager(ctx, io, onClosed) {
  const { h, icon, openDialog } = ctx.ui, get = ctx.settings.get;
  const box = h('div', { class: 'th__list' }), note = h('p', { class: 'th__note', role: 'status' });
  let lastKey = null;

  const btn = (cmd, label, ic, id, on) => {
    const key = `${cmd}:${id}`;
    return h('button', {
      type: 'button', class: 'tbtn' + (on ? ' is-on' : ''), title: label, 'aria-label': label, 'aria-pressed': on === undefined ? null : String(on), dataset: { k: key },
      onclick: () => { lastKey = key; ctx.commands.execute(cmd, id); },
    }, icon(ic));
  };
  const swatch = (t) => h('span', { class: 'th__sw', 'aria-hidden': 'true' }, ['app-bg', 'surface', 'accent', 'text'].map((k) => h('i', { style: { background: t.vars[k] } })));

  function row(t) {
    const slotOn = get(SLOT[t.base]) === t.id;
    const uses = [slotOn ? `${cap(t.base)} theme` : '', get('themes.preview') === t.id ? 'Preview' : ''].filter(Boolean);
    return h('div', { class: 'th__row' }, swatch(t),
      h('div', { class: 'th__meta' }, h('b', {}, t.name, h('i', { class: 'th__tag' }, t.builtin ? 'Built-in' : 'Custom')),
        h('small', {}, `${cap(t.base)} base${uses.length ? ` · In use: ${uses.join(', ')}` : ''}`)),
      h('span', { class: 'th__acts' }, btn('themes.apply', `Use ${t.name} as the ${t.base} theme`, 'check', t.id, slotOn),
        ...(t.builtin ? [] : [btn('themes.edit', `Edit ${t.name}`, 'sliders-horizontal', t.id), btn('themes.rename', `Rename ${t.name}`, 'pen-line', t.id)]),
        btn('themes.duplicate', `Duplicate ${t.name}`, 'copy', t.id), btn('themes.export', `Export ${t.name}`, 'file-down', t.id),
        ...(t.builtin ? [] : [btn('themes.delete', `Delete ${t.name}`, 'trash-2', t.id)])));
  }

  function paint() {
    const lib = io.library();
    note.textContent = lib.error ? `The saved themes could not be read (${lib.error}) and are not in use.` : lib.dropped ? `${lib.dropped} saved theme(s) were invalid and are not shown.` : '';
    box.replaceChildren(...allThemes(lib.themes).map(row));
    const again = lastKey && $(`[data-k="${lastKey}"]`, box);
    lastKey = null;
    if (again) again.focus();
  }

  paint();
  const off = ctx.settings.subscribe((changed) => { if (Object.keys(changed).some((k) => k.startsWith('themes.'))) paint(); });
  return openDialog({
    title: 'Manage Themes', icon: 'palette', width: 700, cls: 'th-dlg',
    body: h('div', {}, h('p', { class: 'th__hint' }, 'Pick one theme for the light slot and one for the dark slot. Built-in themes cannot be edited; duplicate one to make your own.'), note, box),
    buttons: [{ label: 'Import…', onClick: () => { ctx.commands.execute('themes.import'); return false; } }, { label: 'Close', primary: true }],
    onClose: () => { off(); onClosed(); },
  });
}

export function openEditor(ctx, io, theme) {
  const { h, openDialog, toast } = ctx.ui;
  const vars = { ...theme.vars }, errs = new Map();
  let busy = false;
  const nameIn = h('input', { type: 'text', class: 'th__in', id: 'th-name', value: theme.name, maxlength: 60, 'aria-label': 'Theme name' });
  const status = h('p', { class: 'th__err', role: 'alert' }), warns = h('ul', { class: 'th__warns', 'aria-label': 'Contrast warnings' });
  const sample = h('div', { class: 'th__sample', 'aria-hidden': 'true' },
    h('div', { class: 'th__s-bar' }, h('b', {}, 'Laurevine'), h('span', {}, 'File   Home   Insert')),
    h('div', { class: 'th__s-body' }, h('h3', {}, 'Sample heading'), h('p', {}, 'Body text with ', h('span', { class: 'th__s-link' }, 'a link'), ' and ', h('code', {}, 'inline code'), '.'),
      h('p', { class: 'th__s-dim' }, 'Secondary text'), h('p', { class: 'th__s-err' }, 'Error message'),
      h('p', {}, h('span', { class: 'th__s-sel' }, 'Selected text'), ' ', h('span', { class: 'th__s-btn' }, 'Button'))));

  function refresh() {
    paintVars(sample, { base: theme.base, vars });
    const w = contrastWarnings(vars);
    warns.replaceChildren(...(w.length ? w.map((x) => h('li', {}, `${x.label}: contrast ${x.ratio}:1 is below ${x.min}:1`)) : [h('li', { class: 'th__ok' }, 'No contrast warnings.')]));
  }

  function field(t) {
    const id = `th-${t.key}`;
    const text = h('input', { type: 'text', class: 'th__in', id, value: vars[t.key], spellcheck: 'false', maxlength: t.kind === 'font' ? 200 : 40, 'aria-describedby': `${id}-e` });
    const err = h('small', { class: 'th__err', id: `${id}-e` });
    const pick = t.kind === 'colour' ? h('input', { type: 'color', class: 'th__pick', value: toHex(vars[t.key]), 'aria-label': `${t.label} colour picker` }) : null;
    const apply = (value, fromPicker) => {
      const e = validateValue(t.kind, value);
      err.textContent = e;
      text.setAttribute('aria-invalid', String(!!e));
      if (e) { errs.set(t.key, e); return; }
      errs.delete(t.key);
      vars[t.key] = value.trim();
      if (pick && !fromPicker) pick.value = toHex(value);
      refresh();
    };
    text.addEventListener('input', () => apply(text.value, false));
    if (pick) pick.addEventListener('input', () => { text.value = pick.value; apply(pick.value, true); });
    return h('div', { class: 'th__field' }, h('label', { for: id }, t.label), h('span', { class: 'th__ctl' }, pick, text), err);
  }

  async function save(api) {
    if (busy) return;
    if (errs.size) { status.textContent = `Fix ${errs.size} invalid value(s) before saving.`; return; }
    const r = updateTheme(io.library().themes, theme.id, { name: nameIn.value, vars });
    if (r.error) { status.textContent = r.error; return; }
    busy = true;
    try { await io.commit(r.themes); toast('Theme saved'); api.close('Save'); } catch (e) { status.textContent = `Could not save the theme: ${e.message}`; } finally { busy = false; }
  }

  refresh();
  const groups = TOKEN_GROUPS.map((g) => h('fieldset', { class: 'th__grp' }, h('legend', {}, g), TOKENS.filter((t) => t.group === g).map(field)));
  return openDialog({
    title: `Edit Theme — ${theme.name}`, icon: 'sliders-horizontal', width: 860, cls: 'th-dlg th-dlg--edit', focus: '#th-name',
    body: h('div', { class: 'th__edit' },
      h('div', { class: 'th__form' }, h('div', { class: 'th__field' }, h('label', { for: 'th-name' }, `Name (${cap(theme.base)} base)`), nameIn), groups),
      h('div', { class: 'th__side' }, h('h4', {}, 'Live preview'), sample, h('h4', {}, 'Contrast'), warns, status)),
    buttons: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: (api) => { save(api); return false; } }],
  });
}

export function openRename(ctx, theme, submit) {
  const { h, openDialog } = ctx.ui;
  const input = h('input', { type: 'text', class: 'th__in', value: theme.name, maxlength: 60, 'aria-label': 'Theme name' }), err = h('p', { class: 'th__err', role: 'alert' });
  let busy = false;
  async function go(api) {
    if (busy) return;
    if (!cleanName(input.value)) { err.textContent = 'Enter a name of 1 to 60 characters.'; return; }
    busy = true;
    try { const e = await submit(input.value); if (e) err.textContent = e; else api.close('Rename'); } catch (e) { err.textContent = e.message; } finally { busy = false; }
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(dlg); } });
  const dlg = openDialog({ title: 'Rename Theme', icon: 'pen-line', width: 420, focus: 'input', body: h('div', {}, input, err), buttons: [{ label: 'Cancel' }, { label: 'Rename', primary: true, onClick: (api) => { go(api); return false; } }] });
  return dlg;
}

export function openImport(ctx, submit) {
  const { h, openDialog } = ctx.ui;
  const ta = h('textarea', { class: 'th__ta', rows: 10, 'aria-label': 'Theme JSON', spellcheck: 'false' }), err = h('p', { class: 'th__err', role: 'alert' });
  let busy = false;
  const file = h('input', {
    type: 'file', accept: '.json,application/json', 'aria-label': 'Choose a theme file',
    onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (f.size > IMPORT_MAX) { err.textContent = 'That file is too large.'; return; }
      try { ta.value = await f.text(); err.textContent = ''; } catch { err.textContent = 'Could not read that file.'; }
    },
  });
  async function go(api) {
    if (busy) return;
    const r = parseImport(ta.value);
    if (r.error) { err.textContent = r.error; return; }
    busy = true;
    try { const e = await submit(r.themes); if (e) err.textContent = e; else api.close('Import'); } catch (e) { err.textContent = e.message; } finally { busy = false; }
  }
  return openDialog({
    title: 'Import Themes', icon: 'download', width: 560, focus: 'textarea',
    body: h('div', {}, h('p', {}, 'Choose an exported theme file or paste its JSON. Unsafe values are rejected; imported themes are added as new custom themes.'), file, ta, err),
    buttons: [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: (api) => { go(api); return false; } }],
  });
}

export function openExport(ctx, theme) {
  const { h, openDialog, toast } = ctx.ui;
  const ta = h('textarea', { class: 'th__ta', rows: 12, 'aria-label': 'Theme JSON', spellcheck: 'false' }, exportTheme(theme));
  ta.readOnly = true;
  return openDialog({
    title: `Export Theme — ${theme.name}`, icon: 'upload', width: 560, focus: 'textarea',
    body: h('div', {}, h('p', {}, 'Copy this text and keep it; paste it into Import on any copy of Laurevine Loto.'), ta),
    buttons: [{ label: 'Close' }, { label: 'Copy', primary: true, onClick: () => { navigator.clipboard.writeText(ta.value).then(() => toast('Copied theme')).catch(() => toast('Could not copy.')); return false; } }],
  });
}
