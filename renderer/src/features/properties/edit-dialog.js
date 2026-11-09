import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { parseFrontmatter, splitFrontmatter } from '../../core/markdown/frontmatter.js';
import { validateYaml, applyOps, formOps, replaceBlock } from '../../core/markdown/frontmatter-edit.js';

const KNOWN = ['title', 'author', 'date', 'tags'];
const str = (v) => (v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v));

export function openEditProperties(ctx) {
  const { store, services: { documents }, ui: { openDialog } } = ctx;
  const id = store.get().documents.activeId;
  if (!id || !documents.getEntry(id)) return;
  documents.editorRun('flush');
  const trim = (s) => s.replace(/\r?\n$/, '');
  let base = trim(splitFrontmatter(documents.getEntry(id).doc.text).inner), tab = 'form', snap = null;
  const orig = base;

  const inputs = {}, rows = h('div', { class: 'pe__rows' }), err = h('div', { class: 'pe__err', role: 'alert' });
  const raw = h('textarea', { class: 'pe__raw', spellcheck: 'false', 'aria-label': 'Raw YAML', rows: 14 });
  const field = (k, label, ph) => h('label', { class: 'pe__f' }, h('span', {}, label), (inputs[k] = h('input', { type: 'text', placeholder: ph || '', spellcheck: 'false' })));
  const setErr = (m) => { err.textContent = m || ''; };

  function addRow(k = '', v = '') {
    const r = h('div', { class: 'pe__row' });
    r._k = h('input', { type: 'text', value: k, placeholder: 'key', 'aria-label': 'Property name', spellcheck: 'false' });
    r._v = h('input', { type: 'text', value: v, placeholder: 'value', 'aria-label': 'Property value', spellcheck: 'false' });
    r.append(r._k, r._v, h('button', { type: 'button', class: 'pe__x', title: 'Remove property', 'aria-label': 'Remove property', onclick: () => r.remove() }, icon('x')));
    rows.append(r);
  }

  function fill() {
    const p = parseFrontmatter(`---\n${base}\n---\n`);
    if (p.error) return false;
    const d = p.data;
    for (const k of KNOWN) inputs[k].value = str(d[k]);
    rows.replaceChildren();
    const custom = Object.entries(d).filter(([k, v]) => !KNOWN.includes(k) && !Array.isArray(v)).map(([k, v]) => [k, str(v)]);
    custom.forEach(([k, v]) => addRow(k, v));
    snap = { title: str(d.title), author: str(d.author), date: str(d.date), tags: str(d.tags), custom };
    return true;
  }

  function collect() {
    const cur = { title: inputs.title.value, author: inputs.author.value, date: inputs.date.value, tags: inputs.tags.value, custom: [] }, seen = new Set(KNOWN);
    for (const r of rows.children) {
      const k = r._k.value.trim();
      if (!k && !r._v.value.trim()) continue;
      if (!/^[A-Za-z_][\w.-]*$/.test(k)) return { error: `"${k}" is not a valid property name (letters, digits, _ . -).` };
      if (seen.has(k)) return { error: `Duplicate property "${k}".` };
      seen.add(k);
      cur.custom.push([k, r._v.value]);
    }
    return cur;
  }

  const tabs = {}, panes = {};
  function select(t) {
    if (t === tab) return;
    if (t === 'raw') {
      const c = collect();
      if (c.error) return setErr(c.error);
      base = applyOps(base, formOps(c, snap)); raw.value = base;
    } else {
      const m = validateYaml(raw.value);
      if (m) return setErr(m);
      const prev = base; base = trim(raw.value);
      if (!fill()) { base = prev; return setErr('The form cannot show this YAML. Keep editing it as raw YAML.'); }
    }
    tab = t; setErr('');
    for (const k of ['form', 'raw']) { panes[k].hidden = k !== t; tabs[k].setAttribute('aria-selected', String(k === t)); tabs[k].tabIndex = k === t ? 0 : -1; }
  }

  const tabBtn = (k, label) => (tabs[k] = h('button', { type: 'button', role: 'tab', class: 'pe__tab', onclick: () => select(k) }, label));
  panes.form = h('div', { class: 'pe__pane', role: 'tabpanel' }, field('title', 'Title'), field('author', 'Author'), field('date', 'Date', 'YYYY-MM-DD'), field('tags', 'Tags', 'comma, separated'),
    h('div', { class: 'pe__lbl' }, 'Custom Properties'), rows, h('button', { type: 'button', class: 'btn', onclick: () => addRow() }, 'Add Property'));
  panes.raw = h('div', { class: 'pe__pane', role: 'tabpanel', hidden: true }, raw);

  const formOk = fill();
  if (!formOk) snap = { title: '', author: '', date: '', tags: '', custom: [] };
  const body = h('div', { class: 'pe' }, h('div', { class: 'pe__tabs', role: 'tablist' }, tabBtn('form', 'Form'), tabBtn('raw', 'Raw YAML')), panes.form, panes.raw, err);
  raw.value = base;
  raw.addEventListener('input', () => setErr(validateYaml(raw.value)));
  tabs.form.setAttribute('aria-selected', 'true'); tabs.raw.setAttribute('aria-selected', 'false'); tabs.raw.tabIndex = -1;
  if (!formOk) select('raw');

  function apply() {
    let inner = raw.value;
    if (tab === 'form') {
      const c = collect();
      if (c.error) { setErr(c.error); return false; }
      inner = applyOps(base, formOps(c, snap));
    }
    const m = validateYaml(inner);
    if (m) { setErr(m); return false; }
    if (inner === orig) return;
    const view = documents.editorRun('view'), cur = view ? view.state.doc.toString() : documents.getEntry(id).doc.text, r = replaceBlock(cur, inner);
    if (r.insert === cur.slice(0, r.to)) return;
    if (view) view.dispatch({ changes: { from: r.from, to: r.to, insert: r.insert }, userEvent: 'input.properties' });
    else { documents.syncText(id, r.insert + r.body); documents.editorRun('reload'); }
  }

  openDialog({ title: 'Edit Properties', icon: 'pencil', width: 520, cls: 'pe-dlg', body, focus: 'input,textarea', buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: apply }] });
}
