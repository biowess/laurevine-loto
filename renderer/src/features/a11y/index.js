// Accessibility: rule findings per category, rendered colour contrast review, report (new untitled document or Save As).
import { CATS, runA11y } from '../../core/a11y/rules.js';
import { buildReport, score, failing, contrastRow } from '../../core/a11y/report.js';
import { contrastResults } from './probe.js';
import { getSetting } from '../../services/settings-client.js';

const NEED = 'Needs an open document';
const META = { headings: ['Headings', 'heading'], alt: ['Alt Text', 'image'], links: ['Link Labels', 'link'], tables: ['Table Headers', 'table'] };

export function register(ctx) {
  const { commands, store, ui: { h, openDialog }, services: { documents: D } } = ctx;
  const entry = () => { const id = store.get().documents.activeId; return id ? D.getEntry(id) : null; };
  const text = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent ? v.state.doc.toString() : entry().doc.text; };
  const theme = () => getSetting('preview.theme');
  const show = (title, body, buttons) => openDialog({ title, icon: 'accessibility', width: 640, cls: 'nv-a11y', body, buttons });

  const jump = (line) => {
    const v = D.editorRun('view');
    if (!v || !v.dom.offsetParent) return void commands.execute('search.reveal', { path: '', line, col: 0, len: 0 });
    const l = v.state.doc.line(Math.min(line, v.state.doc.lines));
    v.dispatch({ selection: { anchor: l.from }, effects: v.constructor.scrollIntoView(l.from, { x: 'center', y: 'center' }), userEvent: 'select.a11y' });
    v.focus();
  };

  function contrast() {
    const res = contrastResults(theme()), bad = failing(res).length;
    const cols = ['Element', 'Mode', 'Ratio', 'Required', 'Result'];
    show('Rendered Color Contrast', [
      h('p', { 'aria-live': 'polite' }, `Preview theme "${theme()}": ${bad ? `${bad} of ${res.length} pairs fail WCAG AA.` : `all ${res.length} pairs pass WCAG AA.`}`),
      h('div', { class: 'nv-a11y-scroll' }, h('table', { class: 'nv-a11y-t' }, [
        h('thead', {}, h('tr', {}, cols.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, res.map((r) => h('tr', { class: r.pass === false ? 'is-fail' : '' }, contrastRow(r).map((x) => h('td', {}, x))))),
      ])),
    ]);
  }

  function report() {
    const e = entry(), f = runA11y(text()), c = contrastResults(theme()), bad = failing(c).length, date = new Date().toISOString().slice(0, 10);
    const sel = h('select', { class: 'select', id: 'a11y-fmt' }, h('option', { value: 'md' }, 'Markdown'), h('option', { value: 'html' }, 'HTML'));
    const prev = h('textarea', { class: 'input input--area nv-a11y-prev', readonly: true, rows: '10', spellcheck: 'false', 'aria-label': 'Report preview' });
    const build = (format) => buildReport({ name: e.doc.name, findings: f, contrast: c, format, date });
    const refresh = () => { prev.value = build(sel.value); };
    sel.addEventListener('change', refresh);
    refresh();
    const make = (save) => {
      const format = sel.value;
      D.openDocument({ name: `Accessibility Report.${format}`, text: build(format) });
      if (save) commands.execute('file.save-as');
    };
    let dlg;
    const link = (label, fn) => h('button', { type: 'button', class: 'nv-a11y-link', onclick: () => { dlg.close(); fn(); } }, label);
    const n = (k, s) => f.filter((x) => x.cat === k && x.severity === s).length;
    const rows = Object.entries(CATS).map(([k, t]) => h('tr', {}, h('th', { scope: 'row' }, link(t, () => commands.execute('problems.group', 'a11y-' + k))), ...['error', 'warning', 'info'].map((s) => h('td', {}, String(n(k, s))))));
    rows.push(h('tr', { class: bad ? 'is-fail' : '' }, h('th', { scope: 'row' }, link('Color contrast', () => commands.execute('a11y.contrast'))), h('td', {}, String(bad)), h('td', {}, '0'), h('td', {}, '0')));
    dlg = show('Accessibility Report', [
      h('p', { 'aria-live': 'polite' }, `${e.doc.name}: score ${score(f, c)}/100, ${f.length} finding${f.length === 1 ? '' : 's'}, ${bad} contrast failure${bad === 1 ? '' : 's'} (preview theme “${theme()}”). Select a category to review it.`),
      h('div', { class: 'nv-a11y-scroll' }, h('table', { class: 'nv-a11y-t' }, h('thead', {}, h('tr', {}, ['Category', 'Errors', 'Warnings', 'Info'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', {}, rows))),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'a11y-fmt' }, 'Report format'), sel),
      h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Preview'), prev),
    ], [{ label: 'Cancel' }, { label: 'Save As…', onClick: () => make(true) }, { label: 'Open as New Document', primary: true, onClick: () => make(false) }]);
  }

  const def = (id, title, icon, run) => commands.register({ id, title, icon, group: 'Accessibility', enabled: () => !!entry(), reason: NEED, run });
  for (const [cat, [title, icon]] of Object.entries(META)) def('a11y.' + cat, title, icon, () => commands.execute('problems.group', 'a11y-' + cat));
  def('a11y.contrast', 'Contrast', 'contrast', contrast);
  def('a11y.report', 'Accessibility Report', 'clipboard-check', report);

  const inv = () => ['headings', 'alt', 'links', 'tables', 'contrast', 'report'].forEach((k) => commands.invalidate('a11y.' + k));
  D.onDocChange(inv);
  store.subscribe((s) => s.documents.activeId, inv);
}