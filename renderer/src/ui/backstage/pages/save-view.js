import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { store } from '../../../state/store.js';
import { canRun, get } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import { getEntry, onDocChange } from '../../../services/documents.js';
import { describeDoc } from '../../../core/backstage/doc-state.js';

const BTN = [
  ['file.save', 'Save', 'save', 'Write changes to the current file.'],
  ['file.save-as', 'Save As…', 'save-all', 'Save under a new name or location.'],
  ['file.save-copy', 'Save a Copy…', 'copy', 'Keep a copy and continue with the original.'],
  ['file.save-as-template', 'Save as Template…', 'layout-template', 'Reuse this document as a starting point.'],
  ['file.revert', 'Revert to Last Saved', 'rotate-ccw', 'Discard unsaved changes.'],
  ['file.reveal', 'Show in File Manager', 'folder-search', 'Reveal the file on disk.'],
];
const LABELS = ['Document', 'Location', 'State', 'Format'];

export function saveView(primary) {
  const order = [...BTN.filter((b) => b[0] === primary), ...BTN.filter((b) => b[0] !== primary)];
  const cells = LABELS.map(() => h('span', { class: 'lv-sv__v' }));
  const note = h('p', { class: 'lv-note lv-sv__note' });
  const btns = order.map(([id, label, ic, desc]) => h('button', { type: 'button', class: 'lv-sv__act' + (id === primary ? ' is-primary' : ''), dataset: { cmd: id }, onclick: () => runCommand(id) },
    h('span', { class: 'lv-sv__ic' }, icon(ic)), h('span', { class: 'lv-sv__t' }, h('b', {}, label), h('small', {}, desc))));
  const el = h('div', { class: 'lv-sv' },
    h('div', { class: 'lv-sv__info' }, ...LABELS.map((l, i) => h('div', { class: 'lv-sv__r' }, h('span', { class: 'lv-sv__k' }, l), cells[i]))),
    note,
    h('h4', {}, 'Actions'),
    h('div', { class: 'lv-sv__grid' }, ...btns));
  const offs = [];
  let seen = false;
  const refresh = () => {
    if (el.isConnected) seen = true;
    else if (seen) return offs.splice(0).forEach((f) => f());
    const s = store.get().documents, tab = s.tabs.find((t) => t.id === s.activeId), e = tab && getEntry(tab.id), d = describeDoc(tab, e && e.doc);
    [d ? d.name : 'No document open', d ? d.path || '—' : '—', d ? d.state : '—', d ? d.format || '—' : '—'].forEach((v, i) => {
      cells[i].textContent = v;
      cells[i].title = v;
    });
    note.hidden = d && !d.untitled;
    note.textContent = !d ? 'Open or create a document to save it.' : d.untitled ? 'This document has no location yet. Save and Save As will ask where to put it; nothing is written until you choose.' : '';
    if (d) cells[2].dataset.state = /unsaved|not saved|failed|deleted/i.test(d.state) ? 'warn' : 'ok'; else cells[2].removeAttribute('data-state');
    order.forEach(([id], i) => { const ok = canRun(id); btns[i].disabled = !ok; btns[i].title = ok ? '' : d ? get(id).reason || '' : 'No document open'; });
  };
  offs.push(onDocChange(refresh), store.subscribe((s) => s.documents.activeId, refresh));
  refresh();
  return el;
}
