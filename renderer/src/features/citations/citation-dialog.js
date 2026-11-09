// Citation dialog for inserting pandoc citations: [@key], [@key, p. 12], [-@key].
import { h } from '../../ui/kit/dom.js';
import { buildCitation } from '../../core/bibliography/citations.js';

export function openCitationDialog(ctx, { entries = [], initialKey = '', onInsert }) {
  const { ui: { openDialog } } = ctx;

  const keyInput = h('input', {
    class: 'cite-dlg__input',
    type: 'text',
    placeholder: 'Citation key (e.g. knuth1984)',
    value: initialKey,
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-label': 'Citation key',
  });

  const sug = h('div', { class: 'lp-list cite-sug', role: 'listbox', 'aria-label': 'Bibliography entries' });
  const showSug = () => {
    const q = keyInput.value.trim().toLowerCase();
    const hits = entries.filter((e) => !q || `${e.id} ${e.title || ''}`.toLowerCase().includes(q)).slice(0, 50);
    sug.hidden = !hits.length;
    sug.replaceChildren(...hits.map((e) => h('button', { type: 'button', class: 'lp-item', role: 'option', 'aria-selected': String(e.id === keyInput.value), onclick: () => { keyInput.value = e.id; showSug(); updatePreview(); locInput.focus(); } },
      `${e.id}${e.title ? ` — ${e.title.slice(0, 45)}` : ''}${e.year ? ` (${e.year})` : ''}`)));
  };

  const locInput = h('input', {
    class: 'cite-dlg__input',
    type: 'text',
    placeholder: 'e.g. p. 12, pp. 33-35, ch. 2',
  });

  const suppressChk = h('input', {
    type: 'checkbox',
    id: 'cite-suppress',
    class: 'cite-dlg__chk',
  });

  const preview = h('code', { class: 'cite-dlg__preview' });

  function updatePreview() {
    const key = keyInput.value.trim() || 'key';
    const loc = locInput.value.trim();
    const suppress = suppressChk.checked;
    preview.textContent = buildCitation(key, { locator: loc, suppressAuthor: suppress });
  }

  keyInput.addEventListener('input', () => { showSug(); updatePreview(); });
  locInput.addEventListener('input', updatePreview);
  suppressChk.addEventListener('change', updatePreview);
  showSug();
  updatePreview();

  const body = h('div', { class: 'cite-dlg__form' },
    h('div', { class: 'cite-dlg__field' },
      h('label', { class: 'cite-dlg__label' }, 'Citation Key'),
      keyInput,
      sug
    ),
    h('div', { class: 'cite-dlg__field' },
      h('label', { class: 'cite-dlg__label' }, 'Locator / Page (optional)'),
      locInput
    ),
    h('div', { class: 'cite-dlg__field cite-dlg__field--chk' },
      h('label', { class: 'cite-dlg__chk-label', for: 'cite-suppress' },
        suppressChk,
        'Suppress author name (in-text citation: [-@key])'
      )
    ),
    h('div', { class: 'cite-dlg__field' },
      h('label', { class: 'cite-dlg__label' }, 'Syntax Preview (Pandoc / Extended)'),
      preview
    )
  );

  openDialog({
    title: 'Insert Citation',
    icon: 'quote',
    body,
    width: 440,
    cls: 'cite-dlg',
    focus: '.cite-dlg__input',
    buttons: [
      {
        label: 'Insert Citation',
        primary: true,
        onClick: () => {
          const key = keyInput.value.trim();
          if (!key) {
            keyInput.focus();
            return false;
          }
          const cite = buildCitation(key, {
            locator: locInput.value.trim(),
            suppressAuthor: suppressChk.checked,
          });
          if (onInsert) onInsert(cite);
          return true;
        },
      },
      { label: 'Cancel' },
    ],
  });
}
