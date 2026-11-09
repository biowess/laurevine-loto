import { initialGroups, reconcile, focusIndex, moveDoc, setOrientation, mergeGroups } from '../../core/documents/groups.js';

const initial = initialGroups();

function reducer(s = initial, a) {
  switch (a.type) {
    case 'groups/reconcile': return reconcile(s, a.ids, a.activeId, a.closed);
    case 'groups/focus': return focusIndex(s, a.index);
    case 'groups/move': return moveDoc(s, a.id, a.orientation);
    case 'groups/orientation': return setOrientation(s, a.orientation);
    case 'groups/merge': return mergeGroups(s);
    case 'groups/replace': return a.state && Array.isArray(a.state.groups) ? a.state : s;
    default: return s;
  }
}

export const groupActions = {
  reconcile: (ids, activeId, closed) => ({ type: 'groups/reconcile', ids, activeId, closed: !!closed }),
  focus: (index) => ({ type: 'groups/focus', index }),
  move: (id, orientation) => ({ type: 'groups/move', id, orientation }),
  orientation: (orientation) => ({ type: 'groups/orientation', orientation }),
  merge: () => ({ type: 'groups/merge' }),
  replace: (state) => ({ type: 'groups/replace', state }),
};

export const editorGroups = { initial, reducer };
