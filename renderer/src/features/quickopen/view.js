import { h } from '../../ui/kit/dom.js';
import { hl } from '../palette/view.js';
import { icon } from '../../ui/kit/icons.js';
import { listFiles, onTreeChange } from '../../services/workspace-client.js';
import * as recents from '../../services/recents-client.js';
import { isTextName } from '../../core/documents/paths.js';
import { buildItems, search } from '../../core/search/quick-open-model.js';

const HINT = 'Up/Down choose · Enter open · Alt+Enter open to the side · Esc close';

export function mountQuickOpen(ctx) {
  const { commands, settings, services: { documents } } = ctx;
  const input = h('input', { class: 'qo__in', type: 'text', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'qo-list', 'aria-autocomplete': 'list', 'aria-label': 'Quick Open', placeholder: 'Go to file…', spellcheck: 'false', autocomplete: 'off' });
  const body = h('div', { class: 'pal__body', id: 'qo-list', role: 'listbox', 'aria-label': 'Files' });
  const foot = h('div', { class: 'pal__foot', 'aria-live': 'polite' }, HINT);
  const box = h('div', { class: 'pal qo', role: 'dialog', 'aria-label': 'Quick Open', hidden: true }, h('div', { class: 'qo__head' }, icon('search', 'qo__ic'), input), body, foot);
  const veil = h('div', { class: 'qo-veil', hidden: true, 'aria-hidden': 'true', onmousedown: (e) => { e.preventDefault(); close(true); } });
  document.body.append(veil, box);
  let items = [], rows = [], sel = 0, tok = 0, dirty = true, shown = false, ready = false, prev = null;
  onTreeChange(() => { dirty = true; });

  const mark = () => {
    if (rows.length) [...body.children].forEach((el, i) => { el.setAttribute('aria-selected', String(i === sel)); if (i === sel) el.scrollIntoView({ block: 'nearest' }); });
    input.setAttribute('aria-activedescendant', rows.length ? `qo-${sel}` : '');
  };

  async function paint() {
    const t = ++tok, res = await search(items, input.value, { isStale: () => t !== tok });
    if (!res) return;
    rows = res; sel = Math.min(sel, Math.max(rows.length - 1, 0));
    body.replaceChildren(...(rows.length ? rows.map((m, i) => h('div', { class: 'pal__row', id: `qo-${i}`, role: 'option', 'aria-selected': 'false', title: m.it.path, onmousedown: (e) => e.preventDefault(), onclick: (e) => pick(i, e.altKey) },
      h('span', { class: 'pal__t' }, ...hl(m.it.name, m.nameIdx)),
      h('small', { class: 'qo__dir' }, ...hl(m.it.dir, m.dirIdx)),
      m.it.recent >= 0 ? h('small', {}, 'recent') : null)) : [h('div', { class: 'pal__info' }, items.length ? 'No matching files' : 'Open a workspace to search its files')]));
    mark();
  }

  async function load() {
    const [f, r] = await Promise.all([
      listFiles({ showHidden: !!settings.get('explorer.showHidden'), refresh: dirty }).catch(() => null),
      recents.list().catch(() => null),
    ]);
    dirty = false;
    items = buildItems(f ? f.files.filter(isTextName) : [], f ? f.root : '', ((r && r.items) || []).map((i) => i.path));
    foot.textContent = f && f.truncated ? `${HINT} · first 20,000 files only` : HINT;
  }

  function close(restore) {
    if (!shown) return;
    shown = false; ready = false; tok++; box.hidden = true; veil.hidden = true;
    if (restore && prev && prev.isConnected) prev.focus();
  }

  async function pick(i, side) {
    const m = rows[i];
    if (!m) return;
    close(false);
    await commands.execute('file.open-recent', m.it.path);
    if (side) await commands.execute('group.open-side', m.it.path);
    requestAnimationFrame(() => { const v = documents.editorRun('view'); if (v) v.focus(); });
  }

  input.addEventListener('input', () => { sel = 0; if (ready) paint(); });
  input.addEventListener('blur', () => close(false));
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const n = rows.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (n) { sel = (sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; mark(); } }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sel, e.altKey); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  });

  return {
    async open() {
      if (shown) { input.select(); return; }
      prev = document.activeElement; shown = true; ready = false; sel = 0; rows = [];
      input.value = ''; box.hidden = false; veil.hidden = false; input.focus();
      body.replaceChildren(h('div', { class: 'pal__info' }, 'Loading files…'));
      await load();
      if (!shown) return;
      ready = true; paint();
    },
  };
}
