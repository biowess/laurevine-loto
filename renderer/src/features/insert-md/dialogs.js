// Insert dialogs: Definition List, HTML Block (templates + snippets), Abbreviation.
import { h } from '../../ui/kit/dom.js';
import { selectField } from '../../ui/kit/select.js';
import { HTML_KINDS, htmlTemplate } from '../../core/text/insert-md.js';

const row = (label, ...c) => h('div', { class: 'img-row' }, h('span', { class: 'img-lbl' }, label), ...c);
const note = (t) => h('p', { class: 'img-note' }, t);
const area = (label, v, ph, rows = 3) => h('textarea', { class: 'img-in ins-area', rows, 'aria-label': label, placeholder: ph, spellcheck: 'false' }, v);
const text = (label, v, ph) => h('input', { type: 'text', class: 'img-in', 'aria-label': label, placeholder: ph, value: v, autocomplete: 'off', spellcheck: 'false' });
const enter = (body, go) => body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); go(); } });

export function openDeflistDialog({ openDialog }, { term: t0, onInsert }) {
  const term = text('Term', t0, 'Term'), defs = area('Definitions', '', 'One definition per line');
  const pre = h('pre', { class: 'toc-pre', 'aria-label': 'Markdown' }), dl = h('dl', { class: 'ins-dl' });
  const lines = () => defs.value.split('\n').map((x) => x.trim()).filter(Boolean);
  const upd = () => {
    const d = lines(), t = term.value.trim() || 'Term';
    pre.textContent = `${t}\n` + (d.length ? d : ['Definition']).map((x) => `: ${x}`).join('\n');
    dl.replaceChildren(h('dt', {}, t), ...(d.length ? d : ['Definition']).map((x) => h('dd', {}, x)));
  };
  const body = h('div', { class: 'img-form' },
    note('A definition list pairs a term with one or more definitions. Write the term on its own line, then start each definition on the next line with a colon and a space.'),
    h('pre', { class: 'toc-pre' }, 'Markdown\n: A lightweight markup language.\n: Also the name of a text format.'),
    row('Term', term), row('Definitions', defs), h('div', { class: 'img-lbl' }, 'Markdown'), pre, h('div', { class: 'img-lbl' }, 'Preview'), dl);
  body.addEventListener('input', upd); upd();
  const go = (api) => { onInsert(term.value, lines()); api.close(); };
  const api = openDialog({ title: 'Insert Definition List', icon: 'book-a', width: 520, body, focus: '.img-in', buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: (a) => { go(a); return false; } }] });
  enter(body, () => go(api));
}

export function openHtmlDialog({ openDialog }, { body: sel, onInsert }) {
  const kind = selectField(HTML_KINDS, HTML_KINDS[0][0], { label: 'Template' }), code = area('HTML', '', '', 10);
  code.classList.add('ins-code');
  const fill = () => { code.value = htmlTemplate(kind.value, sel); };
  kind.addEventListener('change', fill); fill();
  const body = h('div', { class: 'img-form' }, row('Template', kind), h('div', { class: 'img-lbl' }, 'HTML (editable)'), code,
    note(sel ? 'Your selected text is placed inside the template.' : 'Pick a template, adjust the snippet, then insert. Raw HTML is shown in the preview only when inline HTML is allowed.'));
  const api = openDialog({ title: 'Insert HTML Block', icon: 'code-xml', width: 560, body, focus: '.ins-code', buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: () => { if (!code.value.trim()) { code.focus(); return false; } onInsert(code.value); } }] });
  return api;
}

export function openAbbrDialog({ openDialog }, { term: t0, onInsert }) {
  const term = text('Abbreviation', t0, 'e.g. HTML'), exp = text('Expansion', '', 'e.g. Hypertext Markup Language');
  const pre = h('pre', { class: 'toc-pre', 'aria-label': 'Markdown' }), err = h('p', { class: 'img-err', role: 'alert' });
  const upd = () => { pre.textContent = `*[${term.value.trim() || 'HTML'}]: ${exp.value.trim() || 'Hypertext Markup Language'}`; };
  const body = h('div', { class: 'img-form' }, note('An abbreviation definition is added at the end of the document. Every whole-word match of the term then shows the expansion on hover.'),
    row('Term', term), row('Expansion', exp), h('div', { class: 'img-lbl' }, 'Added at the end of the document'), pre, err);
  body.addEventListener('input', () => { err.textContent = ''; upd(); }); upd();
  const go = (api) => {
    const ok = onInsert(term.value, exp.value);
    if (ok === false) { err.textContent = 'Enter a term (no line breaks or “]”) and its expansion.'; (term.value.trim() ? exp : term).focus(); return; }
    api.close();
  };
  const api = openDialog({ title: 'Insert Abbreviation', icon: 'case-sensitive', width: 480, body, focus: t0 ? '[aria-label="Expansion"]' : '.img-in', buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, onClick: (a) => { go(a); return false; } }] });
  enter(body, () => go(api));
}
