// One picker dialog for every link kind: hyperlink, workspace file, heading (this or another file), external URL, email.
import { listFiles, index } from '../../services/workspace-client.js';
import { fuzzy } from '../../core/search/fuzzy.js';
import { joinPath } from '../../core/search/quick-open-model.js';
import { extractHeadings } from '../../core/toc/headings.js';
import { validateUrl } from '../../core/text/link-edit.js';
import { KINDS, kindOf, relPath, externalUrl, validateExternal, validateEmail, emailUrl, parseMail, headingIds } from '../../core/text/link-pick.js';

const FOCUS = { link: '#lp-url', external: '#lp-url', email: '#lp-to', file: '#lp-ff', heading: '#lp-hf' };
const base = (p) => p.split('/').pop().replace(/\.[^.]+$/, '');

// d: link defaults; ctx: { text, path, strategy } of the active document; kind: initial kind (default from the existing link).
export function openLinkPicker({ h, openDialog }, d, { apply, remove }, { kind, text, path, strategy }) {
  let k = kind || kindOf(d.url), files = null, root = '', pick = '', hfile = '', heads = [], hsel = -1;
  const keep = d.edit ? d.url : '', mail = parseMail(k === 'email' ? d.url : '');
  const field = (id, label, value, ph, cls) => {
    const input = h('input', { type: 'text', id, value, placeholder: ph, autocomplete: 'off', spellcheck: 'false', class: cls });
    return { input, row: h('div', { class: 'lk-row' }, h('label', { for: id }, label), input) };
  };
  const url = field('lp-url', 'URL', k === 'link' || k === 'external' ? d.url : '', 'https://example.com');
  const to = field('lp-to', 'Email address', mail.to, 'name@example.com'), subj = field('lp-subj', 'Subject (optional)', mail.subject, '');
  const ff = field('lp-ff', 'Find a file', '', 'Type to filter workspace files', 'lp-f'), hf = field('lp-hf', 'File', '', 'Type to filter, or choose This document', 'lp-f');
  const label = field('lp-label', 'Label', d.label, 'Link text'), title = field('lp-title', 'Title (optional)', d.title, 'Tooltip text');
  const err = h('div', { class: 'lk-err', role: 'alert' });
  const fl = h('div', { class: 'lp-list', role: 'listbox', 'aria-label': 'Files' }), hl = h('div', { class: 'lp-list lp-heads', role: 'listbox', 'aria-label': 'Headings' });
  const hfl = h('div', { class: 'lp-list lp-short', role: 'listbox', 'aria-label': 'Files' });
  const target = (rel) => (path ? relPath(path, joinPath(root, rel)) : relPath('', rel));
  const rows = (el, list, cur, onPick) => el.replaceChildren(...(list.length ? list.map((r) => h('button', { type: 'button', class: 'lp-item', role: 'option', 'aria-selected': String(r.v === cur), style: { paddingLeft: `${8 + (r.pad || 0)}px` }, onclick: () => onPick(r.v) }, r.t)) : [h('div', { class: 'lp-none' }, files ? 'Nothing matches.' : 'Open a workspace to pick files.')]));
  const match = (q) => (files || []).map((p) => [p, fuzzy(q, p)]).filter((x) => x[1]).sort((a, b) => b[1].score - a[1].score).slice(0, 100).map((x) => x[0]);
  const showFiles = () => rows(fl, match(ff.input.value).map((p) => ({ v: p, t: p })), pick, (p) => { pick = p; showFiles(); });
  const showHeads = () => rows(hl, heads.map((x, i) => ({ v: i, t: x.text || '(empty)', pad: (x.level - 1) * 12 })), hsel, (i) => { hsel = i; showHeads(); });
  const showHFiles = () => rows(hfl, [{ v: '', t: 'This document' }, ...match(hf.input.value).map((p) => ({ v: p, t: p }))], hfile, async (p) => {
    hfile = p; hsel = -1; hf.input.value = p; showHFiles();
    let hs = [];
    if (!p) hs = extractHeadings(text);
    else { try { hs = ((await index('headings', { path: p })).files[0] || { headings: [] }).headings; } catch { /* no index yet */ } }
    heads = headingIds(hs, strategy); showHeads();
  });
  const panel = (kinds, ...kids) => ({ kinds, el: h('div', { class: 'lp-panel' }, ...kids) });
  const panels = [
    panel(['link', 'external'], url.row), panel(['email'], to.row, subj.row), panel(['file'], ff.row, fl),
    panel(['heading'], hf.row, hfl, h('div', { class: 'lk-row' }, h('label', {}, 'Heading'), hl)),
  ];
  const tabs = KINDS.map(([id, t]) => h('button', { type: 'button', role: 'tab', class: 'lp-tab', onclick: () => set(id) }, t));
  const set = (id) => {
    k = id; err.textContent = '';
    tabs.forEach((b, i) => { b.setAttribute('aria-selected', String(KINDS[i][0] === k)); });
    panels.forEach((p) => { p.el.hidden = !p.kinds.includes(k); });
    const f = body.querySelector(FOCUS[k]); if (f && body.isConnected) f.focus();
  };
  const submit = () => {
    let u = '', auto = '', m = '';
    if (k === 'link') { u = url.input.value.trim(); m = validateUrl(u); } else if (k === 'external') { m = validateExternal(url.input.value); u = externalUrl(url.input.value); } else if (k === 'email') { m = validateEmail(to.input.value); u = emailUrl(to.input.value, subj.input.value); auto = to.input.value.trim(); } else if (k === 'file') {
      if (pick) { u = target(pick); auto = base(pick); } else if (kindOf(keep) === 'file' && keep) u = keep; else m = 'Pick a file.';
    } else if (hsel >= 0) { u = (hfile ? target(hfile) : '') + '#' + heads[hsel].id; auto = heads[hsel].text; } else if (kindOf(keep) === 'heading' && keep) u = keep; else m = 'Pick a heading.';
    err.textContent = m;
    if (m) return false;
    apply({ url: u, label: label.input.value.trim() || auto, title: title.input.value });
  };
  const body = h('div', { class: 'lk lp' }, h('div', { class: 'lp-tabs', role: 'tablist' }, ...tabs), ...panels.map((p) => p.el), label.row, title.row, err);
  ff.input.addEventListener('input', showFiles); hf.input.addEventListener('input', showHFiles);
  const api = openDialog({
    title: d.edit ? 'Edit link' : 'Insert link', icon: 'link', width: 520, body, focus: FOCUS[k],
    buttons: [...(d.edit ? [{ label: 'Remove link', onClick: () => { remove(); } }] : []), { label: 'Cancel' }, { label: d.edit ? 'Update' : 'Insert', primary: true, onClick: submit }],
  });
  body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if (!e.target.classList.contains('lp-f') && submit() !== false) api.close();
  });
  heads = headingIds(extractHeadings(text), strategy);
  set(k); showFiles(); showHFiles(); showHeads();
  listFiles({}).then((f) => { files = f.files; root = f.root; showFiles(); showHFiles(); }).catch(() => {});
}
