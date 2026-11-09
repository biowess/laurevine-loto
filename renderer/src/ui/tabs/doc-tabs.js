import { h, $ } from '../kit/dom.js';
import { describeSave } from '../../core/documents/save-state.js';
import { icon } from '../kit/icons.js';
import { reducedMotion } from '../kit/a11y.js';
import { openContextMenu, openMenu } from '../kit/menu.js';
import { store } from '../../state/store.js';
import { documentActions } from '../../state/slices/documents.js';
import { registerAll, register, canRun } from '../../commands/registry.js';
import { runCommand } from '../shell/panels.js';
import { targets } from '../../core/tabs/tab-ops.js';
import { attachDrag } from './tab-drag.js';
import { disambiguate } from '../../core/documents/disambiguate.js';

registerAll('Tabs', [
  ['tab.save', 'Save', 'save'], ['tab.save-as', 'Save As…', 'save-all'], ['tab.pin', 'Pin', 'pin'], ['tab.unpin', 'Unpin', 'pin-off'],
  ['tab.close', 'Close', 'x'], ['tab.close-others', 'Close Other Tabs', 'x'], ['tab.close-left', 'Close Tabs to the Left', 'x'],
  ['tab.close-right', 'Close Tabs to the Right', 'x'], ['tab.reopen', 'Reopen Closed Tab', 'rotate-ccw'], ['tab.new', 'New Tab', 'plus'],
]);

const P = {};

function menuFor(t) {
  const { tabs } = store.get().documents;
  const it = (id, label, extra) => ({ label, onSelect: () => { if (/save/.test(id)) store.dispatch(documentActions.activate(t.id)); runCommand(id, t.id); }, ...extra });
  const cl = (id, label, kind) => it(id, label, { disabled: !targets(tabs, t.id, kind).length });
  return [
    it('tab.save', 'Save'), it('tab.save-as', 'Save As…'), '-',
    it('tab.copy-path', 'Copy Path', { disabled: !t.path }), it('tab.reveal', 'Reveal in File Manager', { disabled: !t.path }), '-',
    t.pinned ? it('tab.unpin', 'Unpin') : it('tab.pin', 'Pin'), '-',
    it('group.open-side', 'Open to the Side', { disabled: !canRun('group.open-side') }), '-',
    it('tab.close', 'Close'), cl('tab.close-others', 'Close Other Tabs', 'others'), cl('tab.close-left', 'Close Tabs to the Left', 'left'),
    cl('tab.close-right', 'Close Tabs to the Right', 'right'), it('tab.close-all', 'Close All'), '-',
    it('tab.reopen', 'Reopen Closed Tab', { disabled: !canRun('tab.reopen') }),
  ];
}

const scrollBy = (left) => () => { if (P.scroller) P.scroller.scrollBy({ left, behavior: reducedMotion() ? 'auto' : 'smooth' }); };
register({ id: 'tab.scroll-left', title: 'Scroll Tabs Left', icon: 'chevron-left', group: 'Tabs', run: scrollBy(-240) });
register({ id: 'tab.scroll-right', title: 'Scroll Tabs Right', icon: 'chevron-right', group: 'Tabs', run: scrollBy(240) });
register({
  id: 'tab.list', title: 'All Tabs', icon: 'chevron-down', group: 'Tabs',
  run: () => {
    const { tabs, activeId } = store.get().documents, nm = disambiguate(tabs);
    openMenu(P.allBtn, tabs.map((t) => ({
      label: nm.get(t.id).label + (t.dirty ? ' •' : ''), icon: t.pinned ? 'pin' : undefined, checked: t.id === activeId ? true : undefined,
      onSelect: () => store.dispatch(documentActions.activate(t.id)),
    })));
  },
});

export function mountDocTabs(bar = $('#doctabs'), slot = 0) {
  const scroller = h('div', { class: 'md-tabs__scroll', role: 'tablist', 'aria-label': 'Open documents' });
  const ctl = (cls, id, label, ic) => h('button', { type: 'button', class: `tbtn ${cls}`, title: label, 'aria-label': label, onclick: () => runCommand(id) }, icon(ic));
  const lft = ctl('md-tabscroll', 'tab.scroll-left', 'Scroll tabs left', 'chevron-left'), rgt = ctl('md-tabscroll', 'tab.scroll-right', 'Scroll tabs right', 'chevron-right');
  const allBtn = ctl('md-taball', 'tab.list', 'All tabs', 'chevron-down'), own = { scroller, allBtn };
  if (!slot) P.home = own;
  if (!P.scroller) Object.assign(P, own);
  bar.addEventListener('pointerdown', () => Object.assign(P, own), true);
  bar.replaceChildren(lft, scroller, rgt, allBtn, ctl('md-tabnew', 'tab.new', 'New tab', 'plus'));
  let focusId = null;
  const sync = () => {
    lft.hidden = rgt.hidden = scroller.scrollWidth <= scroller.clientWidth + 1;
    lft.disabled = scroller.scrollLeft <= 0;
    rgt.disabled = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
  };
  const draw = () => {
    const all = store.get().documents.tabs, g = store.get().editorGroups.groups[slot];
    const tabs = g ? all.filter((t) => g.tabIds.includes(t.id)) : [], activeId = g ? g.activeId : null;
    const names = disambiguate(tabs);
    const el = tabs.map((t) => {
      const nm = names.get(t.id), dup = nm.suffix;
      const on = t.id === activeId, pick = () => store.dispatch(documentActions.activate(t.id));
      return h('div', {
        class: `md-tab${on ? ' is-on' : ''}${t.pinned ? ' md-tab--pin' : ''}`, role: 'tab', tabindex: on ? '0' : '-1',
        'aria-selected': String(on), title: nm.tip, dataset: { id: t.id },
        'aria-label': t.dirty || t.saving || t.saveFailed || t.conflict ? `${nm.label}, ${describeSave(t).label.toLowerCase()}` : nm.label,
        onclick: pick, oncontextmenu: (e) => openContextMenu(e, menuFor(t)),
        onmousedown: (e) => { if (e.button === 1) e.preventDefault(); },
        onauxclick: (e) => { if (e.button === 1) { e.preventDefault(); runCommand('tab.close', t.id); } },
        onpointerdown: (e) => attachDrag(e, t.id, scroller),
        onkeydown: (e) => {
          if (e.target !== e.currentTarget) return;
          const k = e.key;
          if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(); return; }
          if (k === 'Delete') { e.preventDefault(); runCommand('tab.close', t.id); return; }
          if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
          e.preventDefault();
          const left = k === 'ArrowLeft';
          if (e.altKey && e.shiftKey) { focusId = t.id; runCommand(left ? 'tab.move-left' : 'tab.move-right', t.id); }
          else { const n = tabs[tabs.findIndex((x) => x.id === t.id) + (left ? -1 : 1)]; if (!n) return; focusId = n.id; store.dispatch(documentActions.activate(n.id)); }
          setTimeout(() => { focusId = null; });
        },
      },
      t.pinned ? icon('pin') : null, h('span', {}, t.title), dup ? h('small', {}, `· ${dup}`) : null, t.deleted ? h('small', { class: 'md-tab__del' }, '· file deleted') : null, t.dirty || t.saving || t.saveFailed || t.conflict ? h('i', { class: 'dot', dataset: { s: describeSave(t).state }, title: describeSave(t).label }) : null,
      h('em', {
        role: 'button', tabindex: '-1', 'aria-label': `Close ${t.title}`,
        onclick: (e) => { e.stopPropagation(); runCommand('tab.close', t.id); },
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); runCommand('tab.close', t.id); } },
      }, icon('x')));
    });
    scroller.replaceChildren(...el);
    if (focusId) { const f = scroller.querySelector(`[data-id="${focusId}"]`); if (f) f.focus(); focusId = null; }
    const on = scroller.querySelector('.is-on');
    if (on) {
      if (on.offsetLeft < scroller.scrollLeft) scroller.scrollLeft = on.offsetLeft;
      else if (on.offsetLeft + on.offsetWidth > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = on.offsetLeft + on.offsetWidth - scroller.clientWidth;
    }
    sync();
  };
  scroller.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); scroller.scrollLeft += e.deltaY; }
  }, { passive: false });
  scroller.addEventListener('scroll', sync);
  const ro = new ResizeObserver(sync);
  ro.observe(scroller);
  const off = store.subscribe((s) => s.documents, draw), off2 = store.subscribe((s) => s.editorGroups, draw);
  draw();
  return () => { off(); off2(); ro.disconnect(); if (P.scroller === scroller && P.home) Object.assign(P, P.home); };
}
