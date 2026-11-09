import { register, execute } from '../registry.js';
import { store } from '../../state/store.js';
import { groupActions } from '../../state/slices/editor-groups.js';
import { documentActions } from '../../state/slices/documents.js';
import { activeIndex, activeDocId } from '../../core/documents/groups.js';
import { releaseAll, getEntry, findByPath } from '../../services/documents.js';

const gs = () => store.get().editorGroups;
const two = () => gs().groups.length > 1;
const canMove = () => two() || gs().groups[0].tabIds.length > 1;
const move = (o) => (a) => {
  const id = typeof a === 'string' ? a : activeDocId(gs());
  if (!id) return;
  releaseAll();
  store.dispatch(groupActions.move(id, o));
};
const split = (o) => () => (two() ? store.dispatch(groupActions.orientation(o)) : move(o)());
const G = 'Editor Groups', why = 'Needs two open tabs in the group';

register({ id: 'group.split-right', title: 'Split Editor Right', icon: 'columns-2', group: G, enabled: canMove, reason: why, run: split('horizontal') });
register({ id: 'group.split-down', title: 'Split Editor Down', icon: 'rows-2', group: G, enabled: canMove, reason: why, run: split('vertical') });
register({ id: 'group.move-other', title: 'Move to Other Group', icon: 'arrow-right-left', group: G, enabled: canMove, reason: why, run: move() });
register({ id: 'group.toggle-orientation', title: 'Toggle Group Layout', icon: 'columns-2', group: G, enabled: two, reason: 'Only one editor group is open', run: () => store.dispatch(groupActions.orientation(gs().orientation === 'horizontal' ? 'vertical' : 'horizontal')) });
const one = 'Only one editor group is open';
const focus = () => {
  const i = 1 - activeIndex(gs());
  store.dispatch(groupActions.focus(i));
  setTimeout(() => { const c = document.querySelectorAll('#groups > .md-group')[i]; const t = c && c.querySelector('.cm-content'); if (t) t.focus(); });
};
// Accepts a document id or an open document's path (from tabs, file lists, menus); a document already on the other side is just shown.
const side = (a) => {
  const g = gs(), id = typeof a === 'string' ? (getEntry(a) ? a : findByPath(a)) : activeDocId(g);
  const i = id ? g.groups.findIndex((x) => x.tabIds.includes(id)) : -1;
  if (i < 0) return;
  if (two() && i !== activeIndex(g)) return store.dispatch(documentActions.activate(id));
  if (g.groups[i].tabIds.length > 1) move()(id);
};
const closeGroup = async () => {
  for (const id of [...gs().groups[activeIndex(gs())].tabIds]) {
    await execute('tab.close', id);
    if (store.get().documents.tabs.some((t) => t.id === id)) return;
  }
};

register({ id: 'group.focus-next', title: 'Focus Other Group', icon: 'arrow-right-left', group: G, shortcut: 'Ctrl+Alt+Right', enabled: two, reason: one, run: focus });
register({ id: 'group.open-side', title: 'Open to the Side', icon: 'columns-2', group: G, enabled: canMove, reason: why, run: side });
register({ id: 'group.close', title: 'Close Group', icon: 'x', group: G, enabled: two, reason: one, run: closeGroup });
register({ id: 'group.merge', title: 'Merge Groups', icon: 'arrow-right-left', group: G, enabled: two, reason: one, run: () => { releaseAll(); store.dispatch(groupActions.merge()); } });
document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault();
  execute('group.focus-next');
}, true);
