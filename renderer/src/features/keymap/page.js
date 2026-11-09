import { h } from '../../ui/kit/dom.js';
import { list, onChange } from '../../commands/registry.js';
import * as K from '../../commands/keymap.js';
import * as clip from '../../services/clipboard-client.js';

const LIMIT = 150;

export function shortcutsPage(ctx) {
  let q = '', rec = null;
  const { openDialog, toast } = ctx.ui;
  const msg = h('div', { class: 'km__msg', role: 'status', 'aria-live': 'polite' }), info = h('small', { class: 'km__info' }), tbody = h('tbody');
  const say = (...kids) => msg.replaceChildren(...kids);
  const btn = (label, fn) => h('button', { type: 'button', class: 'btn', onclick: fn }, label);
  const all = () => list((c) => !c.planned || c.shortcut).sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
  const label = (c) => { const e = K.effective(c.id); return e.length ? e.map((x) => K.display(x)).join(' / ') : (K.isOverridden(c.id) ? '' : c.shortcut) || 'Unassigned'; };
  const stop = () => { if (rec) { window.removeEventListener('keydown', rec.fn, true); rec = null; K.pause(false); } };

  function start(c) {
    stop(); K.pause(true);
    say(`Press the new shortcut for “${c.title}”. Esc cancels, Backspace clears.`);
    const done = (m) => { stop(); say(m); paint(); };
    const fn = (e) => {
      if (!root.isConnected) return stop();
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.isComposing) return;
      if (e.key === 'Escape') return done('');
      if ((e.key === 'Backspace' || e.key === 'Delete') && !(e.ctrlKey || e.metaKey || e.altKey)) { K.assign(c.id, []); return done(`Cleared “${c.title}”.`); }
      const combo = K.fromEvent(e);
      if (!combo) return;
      const bad = K.validate(combo);
      if (bad) return say(bad);
      const others = K.conflicts(combo, c.id), ok = `“${c.title}” is now ${K.display(combo)}.`;
      if (!others.length) { K.assign(c.id, [combo]); return done(ok); }
      stop();
      say(`${K.display(combo)} is already used by ${others.map((o) => `“${o.title}”`).join(', ')}. `,
        btn('Replace', () => { others.forEach((o) => K.assign(o.id, K.effective(o.id).filter((x) => x !== combo))); K.assign(c.id, [combo]); say(ok); paint(); }),
        btn('Cancel', () => { say(); paint(); }));
      paint();
    };
    rec = { id: c.id, fn };
    window.addEventListener('keydown', fn, true);
    paint();
  }

  function paint() {
    const rows = all().filter((c) => !q || `${c.title} ${c.group} ${c.id} ${label(c)}`.toLowerCase().includes(q));
    info.textContent = rows.length > LIMIT ? `Showing ${LIMIT} of ${rows.length}. Refine the search to see more.` : '';
    tbody.replaceChildren(...rows.slice(0, LIMIT).map((c) => {
      const cf = [...new Set(K.effective(c.id).flatMap((b) => K.conflicts(b, c.id)).map((o) => o.title))];
      return h('tr', { class: rec && rec.id === c.id ? 'is-rec' : '' },
        h('td', {}, h('span', {}, c.title), h('small', {}, c.group + (c.planned ? ' · planned' : ''))),
        h('td', {}, h('kbd', {}, label(c)), K.isOverridden(c.id) ? h('small', { class: 'km__mod' }, 'modified') : null, cf.length ? h('small', { class: 'km__warn' }, `Also used by ${cf.join(', ')}`) : null),
        h('td', { class: 'km__act' },
          h('button', { type: 'button', class: 'btn', 'aria-label': `Change shortcut for ${c.title}`, onclick: () => start(c) }, rec && rec.id === c.id ? 'Press keys…' : 'Change'),
          K.isOverridden(c.id) ? h('button', { type: 'button', class: 'btn', 'aria-label': `Reset shortcut for ${c.title}`, onclick: () => K.reset(c.id) }, 'Reset') : null));
    }));
  }

  const exportDlg = () => {
    const ta = h('textarea', { class: 'km__ta', rows: 12, 'aria-label': 'keybindings.json' }, K.exportJson());
    ta.readOnly = true;
    openDialog({ title: 'Export keybindings.json', icon: 'upload', width: 520, body: h('div', {}, h('p', {}, 'Copy this text and save it as keybindings.json.'), ta),
      buttons: [{ label: 'Close' }, { label: 'Copy', primary: true, onClick: () => { clip.writeText(ta.value).then(() => toast('Copied keybindings.json')).catch(() => toast('Could not copy.')); return false; } }] });
  };
  const importDlg = () => {
    const ta = h('textarea', { class: 'km__ta', rows: 12, 'aria-label': 'keybindings.json' }), err = h('p', { class: 'km__warn', role: 'alert' });
    openDialog({ title: 'Import keybindings.json', icon: 'download', width: 520, body: h('div', {}, h('p', {}, 'Paste the contents of keybindings.json. It replaces your current overrides.'), ta, err),
      buttons: [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: () => { const r = K.importJson(ta.value); if (!r.ok) { err.textContent = r.error; return false; } toast(`Imported ${r.count} shortcut${r.count === 1 ? '' : 's'}.`); } }] });
  };
  const resetAll = () => openDialog({ title: 'Reset All Shortcuts', body: 'Restore every shortcut to its default?', buttons: [{ label: 'Cancel' }, { label: 'Reset all', primary: true, onClick: () => K.resetAll() }] });

  const root = h('div', { class: 'km__wrap' },
    h('div', { class: 'km__bar' }, h('input', { type: 'search', class: 'km__q', placeholder: 'Search commands or shortcuts', 'aria-label': 'Search shortcuts', oninput: (e) => { q = e.target.value.toLowerCase(); paint(); } }),
      btn('Import…', importDlg), btn('Export…', exportDlg), btn('Reset all', resetAll)),
    msg, h('table', { class: 'km' }, h('thead', {}, h('tr', {}, h('th', {}, 'Command'), h('th', {}, 'Shortcut'), h('th', {}, 'Actions'))), tbody), info);
  const off = onChange((t) => { if (!root.isConnected) { off(); stop(); } else if (t.type !== 'change' || t.id === 'keymap') paint(); });
  paint();
  return root;
}
