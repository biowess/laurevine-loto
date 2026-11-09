import { h, $, $$ } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { store } from '../../state/store.js';
import { documentActions } from '../../state/slices/documents.js';
import { groupActions } from '../../state/slices/editor-groups.js';
import { activeIndex, activeDocId } from '../../core/documents/groups.js';
import { getEntry, releaseAll } from '../../services/documents.js';
import { getSetting, setSetting, subscribeSettings } from '../../services/settings-client.js';
import { openMenu } from '../kit/menu.js';
import { mountGroupDivider } from './group-divider.js';
import { mountDivider } from './modes.js';
import { runCommand } from '../shell/panels.js';
import { mountDocTabs } from '../tabs/doc-tabs.js';
import { mountGroupEditor, MODES } from './editor-pane.js';

const gs = () => store.get().editorGroups;
const SPLIT = ['split', 'previewLeft', 'previewRight'];
const modeOf = (i) => { const g = gs().groups[i], e = g && g.activeId && getEntry(g.activeId); return (e && e.mode) || store.get().ui.mode; };
const ctl = (id, label, ic) => h('button', { type: 'button', class: 'tbtn md-gctl', title: label, 'aria-label': label, onclick: () => runCommand(id) }, icon(ic));
const swapPanes = () => runCommand(store.get().ui.mode === 'previewLeft' ? 'view.preview-right' : 'view.preview-left');
const groupMenu = (e) => openMenu(e.currentTarget, [['group.move-other', 'Move to Other Group'], ['group.toggle-orientation', 'Toggle Group Layout'], ['group.close', 'Close Group']].map(([id, label]) => ({ label, onSelect: () => runCommand(id) })));
const sync = (b) => { const on = !!getSetting('editor.syncScroll'); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); };
const addCtl = (seg) => {
  const b = ctl('sync.toggle', 'Synchronized Scrolling', 'link-2');
  sync(b); subscribeSettings(() => sync(b));
  seg.append(h('button', { type: 'button', class: 'tbtn md-gctl', title: 'Swap Source and Preview', 'aria-label': 'Swap Source and Preview', onclick: swapPanes }, icon('arrow-left-right')), b,
    h('button', { type: 'button', class: 'tbtn md-gctl', title: 'Editor Group Actions', 'aria-label': 'Editor Group Actions', 'aria-haspopup': 'menu', onclick: groupMenu }, icon('ellipsis')));
};

export function mountGroups(root = document) {
  const wrap = $('#groups', root);
  if (!wrap) return null;
  const first = $('.md-group', wrap), slots = [{ el: first }];
  const focus = (i) => { if (i !== activeIndex(gs())) store.dispatch(groupActions.focus(i)); };
  const bind = (i) => { slots[i].el.addEventListener('pointerdown', () => focus(i), true); slots[i].el.addEventListener('focusin', () => focus(i)); };
  addCtl($('#modeseg', root));
  bind(0);
  try { store.dispatch(groupActions.orientation(getSetting('ui.groupOrientation'))); } catch { /* defaults */ }
  const offO = store.subscribe((s) => s.editorGroups.orientation, (o) => Promise.resolve().then(() => setSetting('ui.groupOrientation', o)).catch((e) => console.warn('[groups]', e.message)));

  const open2 = () => {
    const bar = h('div', { class: 'md-tabs' }), seg = h('div', { class: 'md-seg' }), src = h('div', { class: 'md-src md-cm' }), prev = h('article', { class: 'md-prev', id: 'prev', tabindex: '0', 'aria-label': 'Preview' });
    const el = h('div', { class: 'md-group' }, bar, h('section', { class: 'md-editor' }, seg, h('div', { class: 'md-panes' }, src, prev)));
    seg.append(h('div', { role: 'group', 'aria-label': 'View mode' }, ...MODES.map(([m, label, cmd]) => h('button', { type: 'button', dataset: { m }, onclick: () => runCommand(cmd) }, label))), h('span', { class: 'sp' }));
    addCtl(seg);
    const dv = mountGroupDivider(wrap);
    wrap.append(dv.el, el);
    slots[1] = { el, offs: [mountDocTabs(bar, 1), mountGroupEditor(src), mountDivider(document, { panes: $('.md-panes', el), src }), dv.off] };
    const pv = { el: prev, slot: 1, offs: [] };
    document.dispatchEvent(new CustomEvent('loto:group-preview', { detail: pv }));
    slots[1].offs.push(...pv.offs);
    bind(1);
  };
  const close2 = () => { slots[1].offs.forEach((f) => f()); slots[1].el.remove(); slots.length = 1; };

  const paint = () => {
    const s = gs(), ai = activeIndex(s);
    if (s.groups.length === 2 && !slots[1]) open2();
    else if (s.groups.length === 1 && slots[1]) close2();
    wrap.dataset.orient = s.orientation;
    wrap.dataset.count = String(s.groups.length);
    slots.forEach((sl, i) => {
      const m = modeOf(i);
      sl.el.classList.toggle('is-active', i === ai);
      sl.el.setAttribute('aria-current', String(i === ai));
      $('.md-editor', sl.el).dataset.mode = m;
      $$('.md-seg [data-m]', sl.el).forEach((b) => {
        const on = b.dataset.m === m || (b.dataset.m === 'split' && SPLIT.includes(m));
        b.classList.toggle('is-on', on);
        if (!b.classList.contains('md-seg__more')) b.setAttribute('aria-pressed', String(on));
      });
    });
  };

  // Documents slice -> groups (membership, focus); groups -> documents (active document).
  let sig = '', last = null;
  const onDocs = () => {
    const { tabs, activeId } = store.get().documents, ids = tabs.map((t) => t.id), k = `${ids.join()}|${activeId}`;
    if (k === sig) return;
    sig = k;
    const closed = !!last && !ids.includes(last);
    last = activeId;
    releaseAll();
    store.dispatch(groupActions.reconcile(ids, activeId, closed));
  };
  const onGroups = () => {
    const id = activeDocId(gs());
    if (id && id !== store.get().documents.activeId) store.dispatch(documentActions.activate(id));
    paint();
  };
  const offs = [store.subscribe((s) => s.documents, onDocs), store.subscribe((s) => s.editorGroups, onGroups), store.subscribe((s) => s.ui.mode, paint)];
  onDocs();
  onGroups();
  return () => { offs.forEach((f) => f()); offO(); if (slots[1]) close2(); };
}
