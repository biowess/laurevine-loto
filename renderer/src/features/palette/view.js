import { $, h } from '../../ui/kit/dom.js';
import { list, canRun, onChange } from '../../commands/registry.js';
import { parseQuery, buildWhere, commandRows, headingRows } from '../../core/search/palette-model.js';
import { parseGoto } from '../../core/text/goto.js';
import { render } from '../../core/markdown/renderer.js';
import { getProfile } from '../../core/markdown/profiles.js';
import { HOME, INSERT } from '../../ui/ribbon/model/home.js';
import { LAYOUT, VIEW, TOOLS } from '../../ui/ribbon/model/layout.js';
import { REFERENCES, REVIEW } from '../../ui/ribbon/model/review.js';

const where = buildWhere([HOME, INSERT, LAYOUT, REFERENCES, REVIEW, VIEW, TOOLS]);
const NOEDIT = 'Needs an open document in Source or Split mode';
const HINT = 'Up/Down choose · Enter run · Esc close · > commands · @ headings · : line';
const info = (title) => ({ title, idx: [], on: false, info: true });

export function hl(t, idx) {
  const s = new Set(idx), out = [];
  let run = '', hit = false;
  const flush = () => { if (run) out.push(hit ? h('mark', {}, run) : run); run = ''; };
  for (let i = 0; i < t.length; i++) { if (s.has(i) !== hit) { flush(); hit = !hit; } run += t[i]; }
  flush();
  return out;
}

export function mountPalette(ctx) {
  const input = $('.titlebar__search input');
  if (!input) return null;
  const { store, settings, services: { documents } } = ctx;
  const body = h('div', { class: 'pal__body' }), foot = h('div', { class: 'pal__foot', 'aria-live': 'polite' }, HINT);
  const box = h('div', { class: 'pal', id: 'pal-list', role: 'listbox', 'aria-label': 'Command palette', hidden: true }, body, foot);
  document.body.append(box);
  Object.entries({ role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'pal-list', 'aria-autocomplete': 'list', placeholder: 'Search commands  (@ headings, : line)' }).forEach(([k, v]) => input.setAttribute(k, v));
  let rows = [], sel = 0, shown = false, hs = [], hsText = null;

  const view = () => { const v = documents.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  const recent = () => String(settings.get('palette.recent') || '').split(',').filter(Boolean);
  const picks = () => rows.filter((r) => !r.info);

  function build() {
    const { mode, q } = parseQuery(input.value);
    if (mode === 'commands') return commandRows(list(), q, { where, recent: recent(), can: (c) => canRun(c.id) });
    const v = view(), e = documents.getEntry(store.get().documents.activeId);
    if (mode === 'headings') {
      if (!e) return [info('No document open')];
      if (hsText !== e.doc.text) { hsText = e.doc.text; hs = render(e.doc.text, { profile: getProfile(e.profile || settings.get('markdown.defaultProfile')).id }).headings; }
      const r = headingRows(hs, q).map((x) => ({ ...x, on: !!v, reason: v ? '' : NOEDIT }));
      return r.length ? r : [info('No matching headings')];
    }
    if (!v) return [info(NOEDIT)];
    const d = v.state.doc, r = q ? parseGoto(q, d.lines, (n) => d.line(n).length) : null;
    if (!r) return [info(`Type a line number, or line:column (1–${d.lines})`)];
    return [r.error ? info(r.error) : { id: 'line', title: `Go to line ${r.line}${r.col > 1 ? `, column ${r.col}` : ''}`, idx: [], line: r.line, col: r.col, on: true, reason: '' }];
  }

  function paint() {
    rows = build(); const p = picks();
    sel = Math.min(sel, Math.max(p.length - 1, 0));
    let sec, n = -1; const kids = [];
    for (const r of rows.slice(0, 200)) {
      if (r.section !== undefined && r.section !== sec) { sec = r.section; kids.push(h('div', { class: 'pal__sec', role: 'presentation' }, sec)); }
      if (r.info) { kids.push(h('div', { class: 'pal__info' }, r.title)); continue; }
      const i = ++n;
      kids.push(h('div', { class: 'pal__row' + (r.on ? '' : ' is-off'), id: `pal-${i}`, role: 'option', 'aria-selected': String(i === sel), ...(r.on ? {} : { 'aria-disabled': 'true' }), onmousedown: (e) => e.preventDefault(), onclick: () => run(p[i]) },
        h('span', { class: 'pal__t' }, ...hl(r.title, r.idx)),
        r.section === undefined && r.group ? h('small', {}, r.group) : null,
        r.on ? null : h('small', { class: 'pal__why' }, r.reason),
        r.shortcut ? h('kbd', {}, r.shortcut) : null));
    }
    body.replaceChildren(...kids);
    input.setAttribute('aria-activedescendant', p.length ? `pal-${sel}` : '');
    foot.textContent = p[sel] && !p[sel].on ? p[sel].reason : HINT;
    const el = $('[aria-selected=true]', body);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    const r = input.closest('.search').getBoundingClientRect(), w = Math.min(Math.max(r.width, 560), innerWidth - 16);
    Object.assign(box.style, { top: `${r.bottom + 4}px`, width: `${w}px`, left: `${Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8))}px` });
    shown = true; box.hidden = false; document.body.classList.add('pal-open'); input.setAttribute('aria-expanded', 'true');
    paint();
  }
  function close(clear) {
    shown = false; box.hidden = true; document.body.classList.remove('pal-open'); input.setAttribute('aria-expanded', 'false');
    if (clear) { input.value = ''; input.blur(); }
  }

  async function run(r) {
    if (!r) return;
    if (!r.on) { foot.textContent = r.reason; return; }
    const { mode } = parseQuery(input.value);
    close(true);
    if (mode === 'commands') {
      settings.set('palette.recent', [r.id, ...recent().filter((x) => x !== r.id)].slice(0, 12).join(',')).catch(() => {});
      return ctx.ui.runCommand(r.id);
    }
    const v = view();
    if (!v) return;
    const l = v.state.doc.line(r.line), pos = l.from + (r.col || 1) - 1;
    v.dispatch({ selection: { anchor: pos }, effects: v.constructor.scrollIntoView(pos, { x: 'center', y: 'center' }), userEvent: 'select.goto' });
    requestAnimationFrame(() => v.focus());
  }

  input.addEventListener('focus', () => { if (!shown) ctx.commands.execute('palette.open', { keep: true }); });
  input.addEventListener('blur', () => close());
  document.addEventListener('pointerdown', (e) => { if (shown && !box.contains(e.target) && !input.closest('.search').contains(e.target)) close(); }, true);
  input.addEventListener('input', () => { sel = 0; if (shown) paint(); else open(); });
  input.addEventListener('keydown', (e) => {
    if (!shown) return;
    const n = picks().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (n) sel = (sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(picks()[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  });
  onChange(() => { if (shown) paint(); });

  return { open({ keep, prefix = '>' } = {}) { input.focus(); if (!keep) input.value = prefix; sel = 0; open(); } };
}
