// Link dialog: URL, label, optional title, validation, remove (edit mode only).
import { validateUrl } from '../../core/text/link-edit.js';

export function openLinkDialog({ h, openDialog }, d, { apply, remove }) {
  const field = (name, text, value, ph) => {
    const input = h('input', { type: 'text', id: `lk-${name}`, value, placeholder: ph, autocomplete: 'off', spellcheck: 'false' });
    return { input, row: h('div', { class: 'lk-row' }, h('label', { for: `lk-${name}` }, text), input) };
  };
  const url = field('url', 'URL', d.url, 'https://example.com'), label = field('label', 'Label', d.label, 'Link text'), title = field('title', 'Title (optional)', d.title, 'Tooltip text');
  const err = h('div', { class: 'lk-err', role: 'alert' });
  const submit = () => {
    const m = validateUrl(url.input.value);
    err.textContent = m;
    url.input.toggleAttribute('aria-invalid', !!m);
    if (m) { url.input.focus(); return false; }
    apply({ url: url.input.value, label: label.input.value, title: title.input.value });
  };
  const body = h('div', { class: 'lk' }, url.row, label.row, title.row, err);
  const api = openDialog({
    title: d.edit ? 'Edit link' : 'Insert link', icon: 'link', width: 440, body, focus: '#lk-url',
    buttons: [...(d.edit ? [{ label: 'Remove link', onClick: () => { remove(); } }] : []), { label: 'Cancel' }, { label: d.edit ? 'Update' : 'Insert', primary: true, onClick: submit }],
  });
  body.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && submit() !== false) { e.preventDefault(); api.close(); }
  });
}
