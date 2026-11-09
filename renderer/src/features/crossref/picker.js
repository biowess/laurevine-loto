// Picker dialog for cross-references: Link to Section, Figure, Table, Equation.
import { h } from '../../ui/kit/dom.js';
import { scanCrossReferences, formatCrossReference } from '../../core/crossref/numbering.js';

export function openCrossrefPicker(ctx, { initialKind = 'figure', text = '', initialText = '', onInsert }) {
  const { ui: { openDialog }, settings } = ctx;
  const strategy = settings.get('markdown.anchorStrategy') || 'github';
  const data = scanCrossReferences(text, { strategy });

  let activeKind = initialKind;
  let selectedTarget = null;
  let filterQuery = '';

  const container = h('div', { class: 'crossref-picker' });
  const nav = h('div', { class: 'crossref-picker__nav', role: 'tablist' });
  const listEl = h('div', { class: 'crossref-picker__list', role: 'listbox' });
  const searchInput = h('input', {
    type: 'text',
    class: 'crossref-picker__search',
    placeholder: 'Filter targets by number, label, anchor ID, or title...',
  });

  const labelInput = h('input', {
    type: 'text',
    class: 'crossref-picker__label-in',
    placeholder: 'Link label',
    value: initialText || '',
  });

  const preview = h('code', { class: 'crossref-picker__preview' });
  const issuesEl = h('div', { class: 'crossref-picker__issues' });

  function renderIssues() {
    issuesEl.replaceChildren();
    if (data.duplicates.length) {
      for (const d of data.duplicates) {
        issuesEl.append(h('div', { class: 'crossref-picker__warn' },
          `Duplicate label: #${d.id} on lines ${d.lines.join(', ')}`
        ));
      }
    }
    if (data.missing.length) {
      for (const m of data.missing) {
        issuesEl.append(h('div', { class: 'crossref-picker__warn crossref-picker__warn--missing' },
          `Unresolved link #${m.id} on line ${m.line}`
        ));
      }
    }
  }

  function getKindList() {
    if (activeKind === 'figure') return data.figures;
    if (activeKind === 'table') return data.tables;
    if (activeKind === 'equation') return data.equations;
    return data.sections;
  }

  function updatePreview() {
    if (!selectedTarget) {
      preview.textContent = 'Select a target above';
      return;
    }
    const custom = labelInput.value.trim() || selectedTarget.label;
    preview.textContent = formatCrossReference(selectedTarget, custom);
  }

  function renderList() {
    listEl.replaceChildren();
    const all = getKindList();
    const q = filterQuery.toLowerCase();
    const filtered = all.filter((t) => {
      if (!q) return true;
      return (t.label || '').toLowerCase().includes(q)
        || (t.id || '').toLowerCase().includes(q)
        || (t.title || '').toLowerCase().includes(q);
    });

    if (!filtered.length) {
      const hint = activeKind === 'section'
        ? 'No sections found in document.'
        : `No labelled ${activeKind}s found. Add an explicit anchor like <a id="${activeKind.slice(0, 3)}-name"></a> before the element.`;
      listEl.append(h('div', { class: 'crossref-picker__empty' }, hint));
      selectedTarget = null;
      updatePreview();
      return;
    }

    if (!selectedTarget || !filtered.includes(selectedTarget)) {
      selectedTarget = filtered[0];
      if (!initialText) labelInput.value = selectedTarget.label;
      updatePreview();
    }

    filtered.forEach((target) => {
      const isSel = target === selectedTarget;
      const row = h('div', {
        class: `crossref-picker__item${isSel ? ' is-selected' : ''}`,
        role: 'option',
        'aria-selected': String(isSel),
        onclick: () => {
          selectedTarget = target;
          if (!initialText) labelInput.value = target.label;
          renderList();
          updatePreview();
        },
      },
        h('span', { class: 'crossref-picker__badge' }, target.label),
        h('span', { class: 'crossref-picker__id' }, `#${target.id}`),
        h('span', { class: 'crossref-picker__title' }, target.title || '(untitled)'),
        h('span', { class: 'crossref-picker__line' }, `L${target.line}`)
      );
      listEl.append(row);
    });
  }

  function renderNav() {
    const tabs = [
      ['figure', 'Figures', data.figures.length],
      ['table', 'Tables', data.tables.length],
      ['equation', 'Equations', data.equations.length],
      ['section', 'Sections', data.sections.length],
    ];

    nav.replaceChildren(
      ...tabs.map(([k, title, count]) => h('button', {
        type: 'button',
        class: `crossref-picker__tab${activeKind === k ? ' is-active' : ''}`,
        role: 'tab',
        'aria-selected': String(activeKind === k),
        onclick: () => {
          activeKind = k;
          selectedTarget = null;
          renderNav();
          renderList();
        },
      }, `${title} (${count})`))
    );
  }

  searchInput.addEventListener('input', () => {
    filterQuery = searchInput.value.trim();
    renderList();
  });

  labelInput.addEventListener('input', updatePreview);

  renderNav();
  renderIssues();
  renderList();

  container.append(
    issuesEl,
    nav,
    searchInput,
    listEl,
    h('div', { class: 'crossref-picker__field' },
      h('label', { class: 'crossref-picker__lbl' }, 'Link Text'),
      labelInput
    ),
    h('div', { class: 'crossref-picker__field' },
      h('label', { class: 'crossref-picker__lbl' }, 'Markdown Preview'),
      preview
    )
  );

  openDialog({
    title: 'Insert Cross-Reference',
    icon: 'link-2',
    body: container,
    width: 560,
    cls: 'crossref-dlg',
    buttons: [
      {
        label: 'Insert Cross-Reference',
        primary: true,
        onClick: () => {
          if (!selectedTarget) return false;
          const custom = labelInput.value.trim() || selectedTarget.label;
          const link = formatCrossReference(selectedTarget, custom);
          if (onInsert) onInsert(link);
          return true;
        },
      },
      { label: 'Cancel' },
    ],
  });
}
