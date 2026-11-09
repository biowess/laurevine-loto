// Search Bibliography popover with arrow navigation and instant insert.
import { h } from '../../ui/kit/dom.js';
import { openPopover, closePopover } from '../../ui/kit/popover.js';
import { formatAuthors } from '../../core/bibliography/format.js';
import { searchBibliography } from '../../core/bibliography/index.js';

export function openBibSearchPopover(anchor, { entries = [], onSelect }) {
  let selectedIdx = 0;
  let filtered = [...entries];

  const input = h('input', {
    class: 'bib-search__input',
    type: 'text',
    placeholder: 'Search references (key, author, title, year)...',
    'aria-label': 'Search bibliography',
  });

  const list = h('div', { class: 'bib-search__list', role: 'listbox' });

  function renderList() {
    list.replaceChildren();
    if (!filtered.length) {
      list.append(h('div', { class: 'bib-search__empty' }, 'No matching references found.'));
      return;
    }

    filtered.slice(0, 30).forEach((entry, idx) => {
      const authStr = formatAuthors(entry.authors || [], { inverted: false, initials: true }) || 'Anonymous';
      const yearStr = entry.year ? `(${entry.year})` : '';

      const item = h('div', {
        class: `bib-search__item${idx === selectedIdx ? ' is-active' : ''}`,
        role: 'option',
        'aria-selected': String(idx === selectedIdx),
        onclick: () => {
          closePopover();
          if (onSelect) onSelect(entry.id);
        },
        onmouseenter: () => {
          selectedIdx = idx;
          updateActive();
        },
      },
        h('div', { class: 'bib-search__header' },
          h('span', { class: 'bib-search__key' }, `@${entry.id}`),
          h('span', { class: 'bib-search__year' }, yearStr)
        ),
        h('div', { class: 'bib-search__title' }, entry.title || 'Untitled'),
        h('div', { class: 'bib-search__authors' }, authStr)
      );

      list.append(item);
    });
  }

  function updateActive() {
    const items = list.querySelectorAll('.bib-search__item');
    items.forEach((it, idx) => {
      const active = idx === selectedIdx;
      it.classList.toggle('is-active', active);
      it.setAttribute('aria-selected', String(active));
      if (active) it.scrollIntoView({ block: 'nearest' });
    });
  }

  function filter(q) {
    filtered = searchBibliography(entries, q);
    selectedIdx = 0;
    renderList();
  }

  input.addEventListener('input', () => filter(input.value));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length) {
        selectedIdx = (selectedIdx + 1) % Math.min(filtered.length, 30);
        updateActive();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length) {
        selectedIdx = (selectedIdx - 1 + Math.min(filtered.length, 30)) % Math.min(filtered.length, 30);
        updateActive();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIdx]) {
        closePopover();
        if (onSelect) onSelect(filtered[selectedIdx].id);
      }
    }
  });

  const pop = h('div', { class: 'bib-search-popover popover' }, input, list);
  renderList();

  const opened = openPopover(anchor, pop);
  if (opened) requestAnimationFrame(() => input.focus());
  return opened;
}
