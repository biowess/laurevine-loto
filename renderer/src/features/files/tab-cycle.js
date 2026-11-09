// Ctrl+Tab / Ctrl+Shift+Tab: next/previous tab in strip order, wrapping. Per-document view state (selection, undo,
// scroll, mode) is kept on the document entry by services/documents.js and restored by the editor on activation.
export function mountTabCycle(ctx) {
  const { commands, store } = ctx, D = ctx.services.documents;
  const go = (step) => () => {
    const { tabs, activeId } = store.get().documents;
    if (tabs.length < 2) return;
    D.activate(tabs[(tabs.findIndex((t) => t.id === activeId) + step + tabs.length) % tabs.length].id);
  };
  commands.register({ id: 'tab.next', title: 'Next Tab', icon: 'chevron-right', group: 'Tabs', shortcut: 'Ctrl+Tab', run: go(1) });
  commands.register({ id: 'tab.previous', title: 'Previous Tab', icon: 'chevron-left', group: 'Tabs', shortcut: 'Ctrl+Shift+Tab', run: go(-1) });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault(); e.stopPropagation();
    commands.execute(e.shiftKey ? 'tab.previous' : 'tab.next');
  }, true);
}
