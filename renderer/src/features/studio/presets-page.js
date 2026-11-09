import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import * as PC from '../../services/presets-client.js';
import { templateConfig } from '../../core/publish/templates/index.js';
import { getSetting, setSetting } from '../../services/settings-client.js';

export const presetState = {
  name: 'Academic Style',
  baseline: '',
  isModified(cfg) {
    if (!this.baseline) return false;
    try { return JSON.stringify(cfg) !== this.baseline; } catch { return false; }
  },
  set(name, cfg) {
    this.name = name;
    try { this.baseline = JSON.stringify(cfg); } catch { this.baseline = ''; }
  },
};

export function getDocPreset(idOrPath) {
  if (!idOrPath) return getSetting('export.defaultPreset') || 'Academic Style';
  try {
    const map = JSON.parse(getSetting('export.lastPresets') || '{}');
    return map[idOrPath] || getSetting('export.defaultPreset') || 'Academic Style';
  } catch { return 'Academic Style'; }
}

export function setDocPreset(idOrPath, name) {
  if (!idOrPath || !name) return;
  try {
    const map = JSON.parse(getSetting('export.lastPresets') || '{}');
    map[idOrPath] = name;
    setSetting('export.lastPresets', JSON.stringify(map));
  } catch { /* ignore */ }
}

export function presetsPage(c, ed) {
  const container = h('div', { class: 'md-presets-page' });
  const run = ed.run;
  let items = [];

  const dot = () => h('i', { class: 'lv-pf__mod', title: 'Modified since preset was loaded', 'aria-label': 'Modified' });

  function renderList() {
    const mod = presetState.isModified(c);
    const head = h('div', { style: { display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
      h('button', { type: 'button', class: 'btn btn--sm', onclick: () => run('studio.preset-save') }, icon('save'), 'Save'),
      h('button', { type: 'button', class: 'btn btn--sm', onclick: () => run('studio.preset-save-as') }, icon('save'), 'Save as…'),
      h('button', { type: 'button', class: 'btn btn--sm', onclick: () => run('studio.preset-reset') }, icon('rotate-ccw'), 'Reset to template defaults'),
      h('button', { type: 'button', class: 'btn btn--sm', onclick: () => run('studio.preset-import') }, icon('folder-open'), 'Import…'),
      h('button', { type: 'button', class: 'btn btn--sm', onclick: () => run('studio.preset-export-bundle') }, icon('package'), 'Export Bundle…'),
    );

    const cards = items.map((t) => {
      const active = t.name === presetState.name;
      const isMod = active && mod;
      return h('div', {
        class: 'md-pal' + (active ? ' is-on' : ''),
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', margin: '0 0 6px', cursor: 'pointer' },
        onclick: (e) => {
          if (e.target.closest('button')) return;
          run('studio.preset-use', t.id);
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          icon('bookmark'),
          h('b', {}, t.name),
          isMod ? dot() : null,
          t.starter ? h('small', { style: { opacity: 0.6 } }, '(Starter)') : null,
          active ? h('small', { style: { color: 'var(--accent)', fontWeight: 600 } }, 'Current') : null,
        ),
        h('span', { class: 'sp' }),
        h('div', { style: { display: 'flex', gap: '4px' } },
          h('button', { type: 'button', class: 'tbtn', title: 'Rename', onclick: (ev) => { ev.stopPropagation(); run('studio.preset-rename', t.id); } }, icon('pen-line')),
          h('button', { type: 'button', class: 'tbtn', title: 'Duplicate', onclick: (ev) => { ev.stopPropagation(); run('studio.preset-duplicate', t.id); } }, icon('copy')),
          h('button', { type: 'button', class: 'tbtn', title: 'Export', onclick: (ev) => { ev.stopPropagation(); run('studio.preset-export', t.id); } }, icon('download')),
          t.starter ? null : h('button', { type: 'button', class: 'tbtn', title: 'Delete', onclick: (ev) => { ev.stopPropagation(); run('studio.preset-delete', t.id); } }, icon('trash-2')),
        ),
      );
    });

    container.replaceChildren(
      h('h4', {}, 'Export Presets'),
      h('p', { class: 'sub', style: { marginBottom: '12px' } },
        'Active preset: ', h('b', {}, presetState.name || 'Custom'),
        mod ? h('span', { style: { color: 'var(--warn)', marginLeft: '6px' } }, icon('circle-dot', 'ic--chev'), ' Modified since preset') : null,
      ),
      head,
      h('div', { class: 'md-preset-list' }, ...cards),
    );
  }

  PC.list().then((r) => { items = r.items || []; renderList(); }).catch(() => renderList());
  return [container];
}

export function openPresetsManager(ctx, onApply) {
  const { ui, commands } = ctx;
  const { h, openDialog, toast } = ui;
  const box = h('div', { class: 'lv-tlist' });
  let dlg = null;

  async function paint() {
    let items = [];
    try { items = (await PC.list()).items || []; } catch { items = []; }
    box.replaceChildren(...items.map((t) => h('div', { class: 'lv-trow', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        icon('bookmark'),
        h('b', {}, t.name),
        t.starter ? h('small', { style: { opacity: 0.6 } }, '(Starter)') : null,
      ),
      h('span', { class: 'lv-hacts', style: { display: 'flex', gap: '4px' } },
        onApply ? h('button', { type: 'button', class: 'btn btn--sm', onclick: () => { onApply(t); dlg.close(); } }, 'Apply') : null,
        h('button', { type: 'button', class: 'tbtn', title: 'Rename', onclick: () => commands.execute('studio.preset-rename', t.id).then(paint) }, icon('pen-line')),
        h('button', { type: 'button', class: 'tbtn', title: 'Duplicate', onclick: () => commands.execute('studio.preset-duplicate', t.id).then(paint) }, icon('copy')),
        h('button', { type: 'button', class: 'tbtn', title: 'Export', onclick: () => commands.execute('studio.preset-export', t.id) }, icon('download')),
        t.starter ? null : h('button', { type: 'button', class: 'tbtn', title: 'Delete', onclick: () => commands.execute('studio.preset-delete', t.id).then(paint) }, icon('trash-2')),
      ),
    )));
  }

  paint();
  dlg = openDialog({
    title: 'Manage Export Presets',
    icon: 'bookmark',
    width: 600,
    body: box,
    buttons: [
      { label: 'Import…', onClick: () => { commands.execute('studio.preset-import').then(paint); return false; } },
      { label: 'Export Bundle…', onClick: () => { commands.execute('studio.preset-export-bundle'); return false; } },
      { label: 'Close', primary: true },
    ],
  });
}

export function presetCommands(reg, cfg, refresh, C, applyPreset) {
  const { h, openDialog, toast } = C.ui;
  const guard = (p) => p.catch((e) => toast(e.message || 'Preset action failed'));
  const ask = (title, value, ok) => openDialog({
    title, icon: 'bookmark', width: 380, focus: 'input',
    body: h('input', { type: 'text', class: 'lv-pname', maxlength: 60, value, 'aria-label': 'Preset name' }),
    buttons: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: (api) => {
      const v = api.el.querySelector('input').value.trim();
      if (!v) return false;
      ok(v);
    } }],
  });

  reg('studio.preset-save', 'Save Preset', 'save', () => {
    const cur = presetState.name;
    if (cur && !['Academic Style', 'Scientific Report', 'Research Notes', 'Editorial Publication', 'Technical Documentation', 'Minimal Print'].includes(cur)) {
      return guard(PC.update({ id: cur, name: cur, config: cfg() }).then(() => {
        presetState.set(cur, cfg());
        toast(`Preset “${cur}” updated`);
        refresh();
      }));
    }
    ask('Save Preset', cur || 'My Preset', (name) => guard(PC.save({ name, config: cfg() }).then(() => {
      presetState.set(name, cfg());
      const d = C.services.documents.getActive();
      if (d) setDocPreset(d.path || d.id, name);
      toast(`Saved preset “${name}”`);
      refresh();
    })));
  });

  reg('studio.preset-save-as', 'Save Preset As…', 'save', () => {
    ask('Save Preset As', `${presetState.name || 'Preset'} Copy`, (name) => guard(PC.save({ name, config: cfg() }).then(() => {
      presetState.set(name, cfg());
      const d = C.services.documents.getActive();
      if (d) setDocPreset(d.path || d.id, name);
      toast(`Saved preset “${name}”`);
      refresh();
    })));
  });

  reg('studio.preset-use', 'Use Preset', 'bookmark', (id) => guard(PC.list().then(({ items }) => {
    const t = items.find((x) => x.id === id);
    if (t && t.config) {
      presetState.set(t.name, t.config);
      const d = C.services.documents.getActive();
      if (d) setDocPreset(d.path || d.id, t.name);
      applyPreset(t.config);
      toast(`Applied preset “${t.name}”`);
      refresh();
    }
  })));

  reg('studio.preset-rename', 'Rename Preset…', 'pen-line', (id) => ask('Rename Preset', id, (name) => guard(PC.update({ id, name }).then(() => {
    if (presetState.name === id) presetState.name = name;
    refresh();
  }))));

  reg('studio.preset-duplicate', 'Duplicate Preset', 'copy', (id) => guard(PC.duplicate(id).then(refresh)));
  reg('studio.preset-delete', 'Delete Preset', 'trash-2', (id) => guard(PC.remove(id).then(refresh)));
  reg('studio.preset-import', 'Import Presets…', 'folder-open', () => guard(PC.importFiles().then((r) => {
    if (r.ids.length || r.skipped) toast(`Imported ${r.ids.length} preset${r.ids.length === 1 ? '' : 's'}${r.skipped ? `, skipped ${r.skipped}` : ''}`);
    refresh();
  })));
  reg('studio.preset-export', 'Export Preset…', 'download', (id) => guard(PC.exportOne(id)));
  reg('studio.preset-export-bundle', 'Export Presets Bundle…', 'package', () => guard(PC.exportBundle()));

  reg('studio.preset-reset', 'Reset to Template Defaults', 'rotate-ccw', () => {
    const cur = cfg();
    const t = templateConfig(cur.template).config;
    applyPreset(t);
    toast(`Reset to defaults for ${cur.template}`);
    refresh();
  });
}
