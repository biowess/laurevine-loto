// Citation Manager dialog showing entries, errors, duplicates, and missing keys used in document.
import { h } from '../../ui/kit/dom.js';
import { analyzeBibliography } from '../../core/bibliography/citations.js';
import { formatAuthors } from '../../core/bibliography/format.js';

export function openManagerDialog(ctx, { docText = '', bibData = {}, onRefreshBib }) {
  const { ui: { openDialog } } = ctx;
  const analysis = analyzeBibliography({
    text: docText,
    entries: bibData.entries || [],
    errors: bibData.errors || [],
  });

  const { entries, errors, duplicates, missingKeys } = analysis;
  let activeTab = 'entries';

  const container = h('div', { class: 'cite-manager' });
  const content = h('div', { class: 'cite-manager__content' });

  // Source info bar
  const sourcePath = (bibData.paths && bibData.paths[0]?.raw) || 'Workspace default / Not set';
  const infoBar = h('div', { class: 'cite-manager__info' },
    h('span', { class: 'cite-manager__source' }, `Source: ${sourcePath}`),
    h('span', { class: 'cite-manager__count' }, `${entries.length} entries`)
  );

  // Tab buttons
  const tabBtn = (id, label, count, isDanger) => {
    const badge = count > 0 ? ` (${count})` : ' (0)';
    const btn = h('button', {
      type: 'button',
      class: `cite-manager__tab${activeTab === id ? ' is-active' : ''}${isDanger && count > 0 ? ' is-danger' : ''}`,
      onclick: () => {
        activeTab = id;
        updateTabs();
      },
    }, `${label}${badge}`);
    return btn;
  };

  const nav = h('div', { class: 'cite-manager__nav' });

  function renderEntriesView() {
    let filterQ = '';
    const search = h('input', {
      type: 'text',
      class: 'cite-manager__search',
      placeholder: 'Filter entries by key, title, author, year...',
    });

    const tableBody = h('div', { class: 'cite-manager__table' });

    function fillTable() {
      tableBody.replaceChildren();
      const q = filterQ.toLowerCase();
      const list = entries.filter((e) => {
        if (!q) return true;
        const auth = (e.authors || []).map((a) => `${a.family} ${a.given || ''}`).join(' ');
        return (e.id || '').toLowerCase().includes(q)
          || (e.title || '').toLowerCase().includes(q)
          || String(e.year || '').includes(q)
          || auth.toLowerCase().includes(q);
      });

      if (!list.length) {
        tableBody.append(h('div', { class: 'cite-manager__empty' }, 'No bibliography entries found.'));
        return;
      }

      for (const e of list) {
        const authStr = formatAuthors(e.authors || [], { inverted: false, initials: true }) || 'Anonymous';
        const row = h('div', { class: 'cite-manager__row' },
          h('span', { class: 'cite-manager__cell-key' }, `@${e.id}`),
          h('span', { class: 'cite-manager__cell-title' }, e.title || 'Untitled'),
          h('span', { class: 'cite-manager__cell-meta' }, `${authStr} (${e.year || 'n.d.'})`),
          h('span', { class: 'cite-manager__cell-type' }, e.type || 'misc')
        );
        tableBody.append(row);
      }
    }

    search.addEventListener('input', () => {
      filterQ = search.value.trim();
      fillTable();
    });

    fillTable();
    return h('div', { class: 'cite-manager__pane' }, search, tableBody);
  }

  function renderErrorsView() {
    const list = h('div', { class: 'cite-manager__list' });
    if (!errors.length) {
      list.append(h('div', { class: 'cite-manager__empty' }, 'No parsing errors detected.'));
    } else {
      for (const err of errors) {
        list.append(h('div', { class: 'cite-manager__item cite-manager__item--error' }, err));
      }
    }
    return list;
  }

  function renderDuplicatesView() {
    const list = h('div', { class: 'cite-manager__list' });
    if (!duplicates.length) {
      list.append(h('div', { class: 'cite-manager__empty' }, 'No duplicate keys found.'));
    } else {
      for (const dup of duplicates) {
        list.append(h('div', { class: 'cite-manager__item cite-manager__item--warn' },
          h('span', { class: 'cite-manager__tag' }, `@${dup}`),
          ' Key defined more than once in bibliography'
        ));
      }
    }
    return list;
  }

  function renderMissingView() {
    const list = h('div', { class: 'cite-manager__list' });
    if (!missingKeys.length) {
      list.append(h('div', { class: 'cite-manager__empty' }, 'All citations used in this document exist in the bibliography.'));
    } else {
      for (const m of missingKeys) {
        list.append(h('div', { class: 'cite-manager__item cite-manager__item--missing' },
          h('span', { class: 'cite-manager__tag' }, `@${m.key}`),
          ` Cited on line ${m.line}, but missing from bibliography`
        ));
      }
    }
    return list;
  }

  function updateTabs() {
    nav.replaceChildren(
      tabBtn('entries', 'Entries', entries.length, false),
      tabBtn('errors', 'Errors', errors.length, true),
      tabBtn('duplicates', 'Duplicates', duplicates.length, true),
      tabBtn('missing', 'Missing Keys Used', missingKeys.length, true)
    );

    content.replaceChildren();
    if (activeTab === 'entries') content.append(renderEntriesView());
    else if (activeTab === 'errors') content.append(renderErrorsView());
    else if (activeTab === 'duplicates') content.append(renderDuplicatesView());
    else if (activeTab === 'missing') content.append(renderMissingView());
  }

  updateTabs();
  container.append(infoBar, nav, content);

  openDialog({
    title: 'Citation Manager',
    icon: 'library-big',
    body: container,
    width: 620,
    cls: 'cite-manager-dlg',
    buttons: [
      {
        label: 'Insert / Refresh Bibliography',
        primary: true,
        onClick: () => {
          if (onRefreshBib) onRefreshBib();
          return true;
        },
      },
      { label: 'Close' },
    ],
  });
}
