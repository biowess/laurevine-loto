import { expandSnippet } from '../../../../shared/snippets.js';
import * as SC from '../../services/snippets-client.js';
import { addKeyHook } from '../../services/editor-hooks.js';
import { openPopover, closePopover } from '../../ui/kit/popover.js';
import { openManager } from './dialog.js';

const NO_EDITOR = 'Needs an open document in Source or Split mode';

export function register(ctx) {
  const { commands, store, services: { documents }, ui: { h, toast } } = ctx;
  let snippets = [];
  let activeSession = null;

  const view = () => documents.editorRun('view') || null;
  const ready = () => !!view() && store.get().ui.mode !== 'preview';

  async function refresh() {
    try {
      const res = await SC.list();
      snippets = res.items || [];
      registerCommands();
    } catch { /* keep existing */ }
  }

  function registerCommands() {
    for (const s of snippets) {
      commands.register({
        id: `snippet.${s.id}`,
        title: `Snippet: ${s.name}`,
        icon: 'scissors',
        group: 'Snippets',
        aliases: [s.trigger, 'snippet', 'insert snippet'],
        enabled: ready,
        reason: NO_EDITOR,
        run: () => insertSnippet(s),
      });
    }
  }

  function insertSnippet(snippet, { from = null, to = null } = {}) {
    const v = view();
    if (!v) { toast(NO_EDITOR); return; }
    const sel = v.state.selection.main;
    const startPos = from != null ? from : sel.from;
    const endPos = to != null ? to : sel.to;
    const selectionText = v.state.sliceDoc(startPos, endPos);

    const { text, stops } = expandSnippet(snippet.body, { selection: selectionText });

    const insertChanges = { from: startPos, to: endPos, insert: text };
    let initialSel;
    if (stops.length > 0) {
      const first = stops[0];
      initialSel = { anchor: startPos + first.from, head: startPos + first.to };
    } else {
      initialSel = { anchor: startPos + text.length };
    }

    v.dispatch({
      changes: insertChanges,
      selection: initialSel,
      userEvent: 'input.snippet',
      scrollIntoView: true,
    });
    v.focus();

    if (stops.length > 1) {
      const absStops = stops.map((s) => ({ num: s.num, from: startPos + s.from, to: startPos + s.to }));
      activeSession = {
        v,
        stops: absStops,
        currIdx: 0,
      };
    } else {
      activeSession = null;
    }
  }

  function pickSnippetPopover() {
    const v = view();
    if (!v) { toast(NO_EDITOR); return; }
    if (snippets.length === 0) { toast('No snippets available in library.'); return; }

    const c = v.coordsAtPos(v.state.selection.main.head);
    const a = document.activeElement;
    const anchor = (a && a.closest('.ribbon, .tabrow')) ? a : { x: c ? c.left : 80, y: c ? c.bottom : 80, restore: v.contentDOM };

    const searchInput = h('input', { class: 'ct-q', type: 'text', placeholder: 'Search snippets…', 'aria-label': 'Search snippets' });
    const list = h('div', { class: 'ct-list', role: 'listbox', style: 'max-height:220px;overflow-y:auto' });

    function renderList(query) {
      const q = query.toLowerCase();
      const filtered = snippets.filter((s) => s.name.toLowerCase().includes(q) || s.trigger.toLowerCase().includes(q));
      list.replaceChildren(...filtered.map((s) => h('button', {
        type: 'button',
        class: 'ct-opt',
        role: 'option',
        onclick: () => {
          closePopover();
          insertSnippet(s);
        },
      }, h('span', { style: 'font-weight:500' }, s.name),
         h('span', { style: 'font-size:11px;color:var(--text-2);margin-left:auto' }, s.trigger))));
    }

    renderList('');
    searchInput.addEventListener('input', () => renderList(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = list.querySelector('.ct-opt');
        if (first) first.focus();
      } else if (e.key === 'Enter') {
        const first = list.querySelector('.ct-opt');
        if (first) { e.preventDefault(); first.click(); }
      }
    });

    list.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const opts = [...list.querySelectorAll('.ct-opt')];
      const i = opts.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
      if (i < 0) searchInput.focus();
      else if (i < opts.length) opts[i].focus();
    });

    const pop = h('div', { class: 'ct-pop popover--list', style: 'min-width:220px' }, searchInput, list);
    if (openPopover(anchor, pop)) searchInput.focus();
  }

  // Tools -> Customization: Snippets
  commands.register({
    id: 'custom.snippets',
    title: 'Snippets',
    icon: 'scissors',
    group: 'Tools',
    aliases: ['snippets', 'manage snippets', 'snippet library'],
    run: () => openManager(ctx, { onInsert: (s) => insertSnippet(s) }),
  });

  // Insert -> Snippets
  commands.register({
    id: 'ins.snippet',
    title: 'Insert Snippet…',
    icon: 'scissors',
    group: 'Insert',
    enabled: ready,
    reason: NO_EDITOR,
    run: (arg) => {
      if (arg && (arg.snippet || arg.id)) {
        const found = snippets.find((x) => x.id === (arg.id || arg.snippet?.id));
        if (found) return insertSnippet(found);
      }
      pickSnippetPopover();
    },
  });

  // Key hook: Tab stop navigation + trigger prefix + Tab
  addKeyHook((e, v) => {
    if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return false;

    // Active session navigation
    if (activeSession && activeSession.v === v) {
      if (e.key === 'Escape') {
        activeSession = null;
        return true;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const { stops, currIdx } = activeSession;
        const curStop = stops[currIdx];
        const sel = v.state.selection.main;

        const delta = sel.head - curStop.to;
        curStop.to = sel.head;
        for (let i = currIdx + 1; i < stops.length; i++) {
          stops[i].from += delta;
          stops[i].to += delta;
        }

        const nextIdx = e.shiftKey ? currIdx - 1 : currIdx + 1;
        if (nextIdx < 0) {
          return true;
        }
        if (nextIdx >= stops.length) {
          activeSession = null;
          return true;
        }

        activeSession.currIdx = nextIdx;
        const target = stops[nextIdx];
        v.dispatch({
          selection: { anchor: target.from, head: target.to },
          scrollIntoView: true,
        });
        return true;
      }
    }

    // Trigger prefix + Tab expansion
    if (e.key === 'Tab' && !e.shiftKey) {
      const sel = v.state.selection.main;
      if (sel.empty) {
        const line = v.state.doc.lineAt(sel.head);
        const textBefore = line.text.slice(0, sel.head - line.from);
        const match = textBefore.match(/([^\s]+)$/);
        if (match) {
          const prefix = match[1];
          const found = snippets.find((s) => s.trigger === prefix);
          if (found) {
            e.preventDefault();
            const from = sel.head - prefix.length;
            const to = sel.head;
            insertSnippet(found, { from, to });
            return true;
          }
        }
      }
    }

    return false;
  });

  SC.onChange(refresh);
  refresh();
}
