// Keyboard operation: skip links, F6 region cycling, F10/Alt ribbon access, overlay isolation (inert) with focus return, Esc then Tab to leave the editor.
import { h, $, $$ } from '../../ui/kit/dom.js';
import { editorRun } from '../../services/documents.js';
import { focusTabs } from '../../ui/ribbon/ribbon.js';
import { uiActions } from '../../state/slices/ui.js';

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const BEHIND = '.tabrow, .ribbon, .md-work, .md-status';
const OUTSIDE = '#backstage, #studio, .dlg-backdrop, .popover';
const shown = (n) => !!n && n.getClientRects().length > 0 && !n.closest('[inert]');
const firstIn = (root, sel = FOCUSABLE) => { const n = root && $$(sel, root).find(shown); if (n) n.focus(); return !!n; };

function focusEditor() {
  const v = editorRun('view');
  if (v && shown(v.dom)) { v.focus(); return true; }
  const p = $$('.md-prev').find(shown);
  if (p) { p.focus({ preventScroll: true }); return true; }
  return false;
}

function focusSoon(find, tries = 20) {
  const n = find();
  if (n && shown(n)) n.focus();
  else if (tries > 0) requestAnimationFrame(() => focusSoon(find, tries - 1));
}

const side = (id) => () => { const el = $(id); return firstIn($('.md-sb', el)) || firstIn($('.md-sw', el)); };
const REGIONS = [
  { sel: '.tabrow, .ribbon', go: () => focusTabs() },
  { sel: '#left', go: side('#left') },
  { sel: '.md-tabs', go: () => { const t = $$('.md-tab[tabindex="0"]').find(shown); if (t) t.focus(); return !!t; } },
  { sel: '.md-editor', go: focusEditor },
  { sel: '#right', go: side('#right') },
];

function cycle(step) {
  const n = REGIONS.length, at = document.activeElement;
  const here = REGIONS.findIndex((r) => $$(r.sel).some((x) => x.contains(at)));
  for (let k = 1; k <= n; k++) if (REGIONS[(here + step * k + n * 2) % n].go()) return true;
  return false;
}

function leaveEditor(step, from) {
  const ed = from.closest('.cm-editor');
  if (!ed) return;
  const flag = step > 0 ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
  const list = $$(FOCUSABLE).filter((n) => shown(n) && !ed.contains(n) && !n.contains(ed) && (ed.compareDocumentPosition(n) & flag));
  const to = step > 0 ? list[0] : list[list.length - 1];
  if (to) to.focus();
}

function mountSkipLinks(run) {
  const link = (label, id) => h('button', { type: 'button', class: 'skip-link', onclick: () => run(id) }, label);
  document.body.prepend(h('div', { class: 'skip-links', role: 'navigation', 'aria-label': 'Skip links' }, link('Skip to editor', 'nav.focus-editor'), link('Skip to outline', 'nav.focus-outline')));
}

function mountOverlays(store) {
  let lastOutside = null, opener = null, was = false;
  const isOpen = () => { const { backstage, studio } = store.get().ui; return backstage.open || studio.open; };
  document.addEventListener('focusin', (e) => { if (!e.target.closest(OUTSIDE) && !e.target.closest('[inert]')) lastOutside = e.target; }, true);
  const sync = () => {
    const open = isOpen();
    for (const n of $$(BEHIND)) n.toggleAttribute('inert', open);
    if (open === was) return;
    was = open;
    if (open) {
      opener = lastOutside;
      if (store.get().ui.studio.open) focusSoon(() => $('#studio') && $$(FOCUSABLE, $('#studio')).find(shown));
    } else {
      const back = opener;
      opener = null;
      requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) { if (back && back.isConnected) back.focus(); else focusEditor(); } });
    }
  };
  const offs = [store.subscribe((s) => s.ui.backstage.open, sync), store.subscribe((s) => s.ui.studio.open, sync)];
  sync();
  return () => offs.forEach((f) => f());
}

function mountEditorEscape() {
  let armed = false;
  const inSrc = (t) => !!(t && t.closest && t.closest('.md-src'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && armed && !e.ctrlKey && !e.altKey && !e.metaKey && inSrc(e.target)) {
      e.preventDefault(); e.stopPropagation();
      armed = false;
      leaveEditor(e.shiftKey ? -1 : 1, e.target);
    } else if (e.key !== 'Escape' && e.key !== 'Shift') armed = false;
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.defaultPrevented && inSrc(e.target)) armed = true; });
  document.addEventListener('focusout', () => { armed = false; });
}

export function register(ctx) {
  const { commands, store } = ctx;
  const run = (id) => ctx.ui.runCommand(id);
  const blocked = () => store.get().ui.backstage.open || store.get().ui.studio.open;
  const inRibbon = (n) => !!(n && n.closest && n.closest('.tabrow, .ribbon'));
  let back = null;
  const access = () => {
    const at = document.activeElement;
    if (inRibbon(at)) {
      const to = back;
      back = null;
      if (to && to.isConnected && !inRibbon(to)) to.focus(); else focusEditor();
      return;
    }
    back = at;
    if (!focusTabs()) back = null;
  };
  const def = (id, title, icon, extra, fn) => commands.register({ id, title, icon, group: 'Navigate', run: fn, ...extra });
  def('nav.ribbon-access', 'Focus Ribbon (toggle)', 'keyboard', { shortcut: 'F10', aliases: ['ribbon keys', 'access keys', 'menu bar', 'alt'], enabled: () => !blocked(), reason: 'Close the File view first' }, access);
  def('nav.focus-editor', 'Focus Editor', 'pencil', { shortcut: 'Ctrl+Alt+E', aliases: ['skip to editor', 'go to editor'], reason: 'No editor is visible' }, () => { focusEditor(); });
  def('nav.focus-outline', 'Focus Outline', 'list-tree', { shortcut: 'Ctrl+Alt+O', aliases: ['skip to outline', 'go to outline'], enabled: () => !blocked(), reason: 'Close the File view first' }, () => {
    store.dispatch(uiActions.panel('right', { view: 'outline', open: true }));
    focusSoon(() => $('#right .ol__sc'));
  });
  def('nav.next-region', 'Move Focus to Next Area', 'layout-dashboard', { shortcut: 'F6', aliases: ['next region', 'cycle panes', 'next pane'], enabled: () => !blocked(), reason: 'Close the File view first' }, () => { cycle(1); });
  def('nav.prev-region', 'Move Focus to Previous Area', 'layout-dashboard', { shortcut: 'Shift+F6', aliases: ['previous region', 'previous pane', 'shift f6'], enabled: () => !blocked(), reason: 'Close the File view first' }, () => { cycle(-1); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F6' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); commands.execute('nav.prev-region'); }
  });

  let altDown = false;
  document.addEventListener('keydown', (e) => { altDown = e.key === 'Alt' && !e.repeat && !e.ctrlKey && !e.shiftKey && !e.metaKey; });
  document.addEventListener('keyup', (e) => {
    const fire = altDown && e.key === 'Alt' && !e.ctrlKey && !e.shiftKey && !e.metaKey && !document.querySelector('.dlg-backdrop');
    altDown = false;
    if (fire) commands.execute('nav.ribbon-access');
  });
  document.addEventListener('mousedown', () => { altDown = false; }, true);
  window.addEventListener('blur', () => { altDown = false; });

  mountSkipLinks(run);
  mountOverlays(store);
  mountEditorEscape();
}
