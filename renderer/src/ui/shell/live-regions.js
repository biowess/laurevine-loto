import { store } from '../../state/store.js';
import { describeSave, SAVE } from '../../core/documents/save-state.js';
import { counts, onProblems } from '../../services/problems.js';
import { announce } from '../kit/a11y.js';

const PROBLEM_DELAY = 1200;
const noun = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Announces save completion and failures per document; routine dirty/saving transitions stay silent while typing.
function watchSave() {
  const last = new Map();
  const check = ({ tabs }) => {
    const ids = new Set();
    for (const t of tabs) {
      ids.add(t.id);
      const state = describeSave(t).state, prev = last.get(t.id);
      last.set(t.id, state);
      if (prev === undefined || prev === state) continue;
      if (state === SAVE.SAVED && prev === SAVE.SAVING) announce(`${t.title} saved`);
      else if (state === SAVE.FAILED) announce(`Save failed: ${t.title}`, { assertive: true });
      else if (state === SAVE.EXTERNAL) announce(`${t.title} was modified on disk`, { assertive: true });
    }
    for (const id of last.keys()) if (!ids.has(id)) last.delete(id);
  };
  check(store.get().documents);
  return store.subscribe((s) => s.documents, check);
}

// Announces problem counts after they settle; switching documents re-baselines without speaking.
function watchProblems() {
  let timer = 0, last = null;
  const fire = () => {
    const c = counts(), sig = `${c.error}|${c.warning}|${c.info}`, prev = last;
    last = sig;
    if (prev === null || prev === sig) return;
    announce(`Problems: ${noun(c.error, 'error', 'errors')}, ${noun(c.warning, 'warning', 'warnings')}, ${c.info} info`);
  };
  const offProblems = onProblems(() => { clearTimeout(timer); timer = setTimeout(fire, PROBLEM_DELAY); });
  const offDoc = store.subscribe((s) => s.documents.activeId, () => { last = null; });
  return () => { clearTimeout(timer); offProblems(); offDoc(); };
}

export function mountLiveRegions() {
  const offs = [watchSave(), watchProblems()];
  return () => offs.forEach((f) => f());
}
