import { h, $, $$ } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { openContextMenu, openMenu } from '../kit/menu.js';
import { store } from '../../state/store.js';
import { registerAll, invalidate } from '../../commands/registry.js';
import { setEditorBridge } from '../../services/documents.js';
import { runCommand } from '../shell/panels.js';
import { createEditorHost } from './cm-host.js';

export const MODES = [['source', 'Source', 'view.mode-source'], ['split', 'Split', 'view.mode-split'], ['preview', 'Preview', 'view.mode-preview']];
const SPLITS = [['split', 'Split', 'view.mode-split'], ['previewLeft', 'Preview Left', 'view.preview-left'], ['previewRight', 'Preview Right', 'view.preview-right']];
const splitMenu = (e) => openMenu(e.currentTarget, SPLITS.map(([m, label, cmd]) => ({ label, checked: () => store.get().ui.mode === m, onSelect: () => runCommand(cmd) })));
const CTX = {
  table: [],
  pre: ['Copy Code', 'Language…', 'Block Properties'],
  a: ['Open Link', 'Edit Link…', 'Copy Link', 'Remove Link'],
  text: ['Cut', 'Copy', 'Paste', '-', 'Insert Link…'],
};
const cid = (k, l) => `preview.${k}-${l.replace('…', '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

let host = null, host2 = null;
const activity = new Set();
let tblMenu = null;
export const setPreviewMenu = (fn) => { tblMenu = fn; };
let extras = null;
export const setPreviewExtras = (fn) => { extras = fn; };
const cur = () => { const g = store.get().editorGroups; return host2 && g.groups[1] && g.activeGroupId === g.groups[1].id ? host2 : host; };
const bindBridge = () => { const x = cur(); if (x) setEditorBridge(x.bridge); invalidate('edit.undo'); invalidate('edit.redo'); };
export const editorMetrics = () => { const x = cur(); return x ? x.metrics() : { ln: 1, col: 1, words: 0, chars: 0 }; };

// Editor host for the second group; the bridge (commands, find, outline) follows the active group.
export function mountGroupEditor(el) {
  let gone = false;
  createEditorHost(el, { slot: 1, onActivity: () => activity.forEach((f) => f()) })
    .then((x) => { if (gone) x.destroy(); else { host2 = x; bindBridge(); activity.forEach((f) => f()); } })
    .catch((e) => console.error('[editor]', e));
  return () => { gone = true; if (host2) { host2.release(); host2.destroy(); host2 = null; bindBridge(); } };
}
export const onEditorActivity = (fn) => { activity.add(fn); return () => activity.delete(fn); };

export function mountEditor(root = document) {
  const seg = $('#modeseg', root), src = $('#src', root), prev = $('#prev', root);
  if (!seg || !src || !prev) return null;
  registerAll('Preview', Object.entries(CTX).flatMap(([k, ls]) => ls.filter((l) => l !== '-').map((l) => [cid(k, l), l])));
  seg.replaceChildren(
    h('div', { role: 'group', 'aria-label': 'View mode' }, ...MODES.flatMap(([m, label, cmd]) => [
      h('button', { type: 'button', dataset: { m }, onclick: () => runCommand(cmd) }, label),
      m === 'split' ? h('button', { type: 'button', class: 'md-seg__more', dataset: { m }, title: 'Split orientation', 'aria-label': 'Split orientation', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: splitMenu }, icon('chevron-down', 'ic--chev')) : null,
    ].filter(Boolean))),
    h('button', { type: 'button', id: 'profbtn', class: 'md-prof', title: 'Markdown profile', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: () => runCommand('preview.profile-menu') }, 'Profile'),
    h('button', { type: 'button', id: 'pvthemebtn', class: 'md-prof', title: 'Preview theme', 'aria-haspopup': 'menu', onclick: () => runCommand('view.preview-theme') }, 'Theme ', icon('chevron-down', 'ic--chev')), h('span', { class: 'sp' }),
  );
  const mark = () => {
    const m = store.get().ui.mode;
    $$('[data-m]', seg).forEach((b) => {
      const on = b.dataset.m === m || (b.dataset.m === 'split' && SPLITS.some(([x]) => x === m));
      b.classList.toggle('is-on', on);
      if (!b.classList.contains('md-seg__more')) b.setAttribute('aria-pressed', String(on));
    });
  };
  let gone = false;
  createEditorHost(src, { onActivity: () => activity.forEach((f) => f()) })
    .then((x) => { if (gone) x.destroy(); else { host = x; bindBridge(); activity.forEach((f) => f()); } })
    .catch((e) => { console.error('[editor]', e); src.replaceChildren(h('p', { class: 'md-cm-error', role: 'alert' }, 'The editor library is missing. Run "npm run vendor" and restart.')); });
  prev.replaceChildren(h('div', { class: 'md-prev-empty', role: 'status' }, h('strong', {}, 'Preview not rendered yet'), h('p', {}, 'No Markdown renderer is registered. Your text is unchanged.')));
  const onCtx = (e) => {
    e.preventDefault();
    const k = e.target.closest('table') ? 'table' : e.target.closest('pre') ? 'pre' : e.target.closest('a') ? 'a' : 'text';
    openContextMenu(e, [{ label: 'Go to Source', onSelect: () => runCommand('nav.go-to-source') }, '-', ...(k === 'table' && tblMenu && tblMenu(e) || CTX[k].map((l) => (l === '-' ? '-' : { label: l, onSelect: () => runCommand(cid(k, l)) }))), ...(extras ? extras(e) : [])]);
  };
  prev.addEventListener('contextmenu', onCtx);
  const off = store.subscribe((s) => s.ui.mode, mark), offB = store.subscribe((s) => `${s.editorGroups.activeGroupId}|${s.editorGroups.groups.length}`, bindBridge);
  mark();
  return () => { gone = true; off(); offB(); prev.removeEventListener('contextmenu', onCtx); if (host) { host.destroy(); host = null; } };
}
