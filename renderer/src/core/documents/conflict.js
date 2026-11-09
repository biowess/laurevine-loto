export const initConflict = (path, diskHash) => ({ phase: 'ok', path, diskHash, prev: 'ok', attempt: 0 });

const ACTIONS = {
  ok: [],
  external: ['reload', 'compare', 'dismiss'],
  conflict: ['reload', 'compare', 'merge', 'keepMine', 'saveAs', 'overwrite'],
  deleted: ['saveAs', 'restoreFromHistory'],
  unreadable: ['retry'],
};
const LABELS = {
  ok: '', external: 'Changed on disk', conflict: 'Conflict: changed on disk and here',
  deleted: 'Deleted on disk', unreadable: 'File temporarily inaccessible',
};

export const actions = (s) => ACTIONS[s.phase];
export const describe = (s) => ({ label: LABELS[s.phase], actions: ACTIONS[s.phase], retrying: s.phase === 'unreadable', attempt: s.attempt });

const next = (s, patch, ...effects) => ({ state: { ...s, ...patch }, effects });

function changed(s, hash, ctx) {
  const base = { diskHash: hash, attempt: 0 };
  if (hash === ctx.savedHash) return next(s, { ...base, phase: 'ok', prev: 'ok' }, { do: 'clear' });
  if (ctx.dirty) return next(s, { ...base, phase: 'conflict', prev: 'conflict' }, { do: 'conflict' });
  if (ctx.autoReload) return next(s, { ...base, phase: 'ok', prev: 'ok' }, { do: 'reload' }, { do: 'clear' });
  return next(s, { ...base, phase: 'external', prev: 'external' }, { do: 'banner', kind: 'modified' });
}

export function reduce(s, ev, ctx = {}) {
  switch (ev.type) {
    case 'modified': return changed(s, ev.hash, ctx);
    case 'renamed': return next(s, { path: ev.to }, { do: 'follow', from: s.path, path: ev.to });
    case 'deleted': return next(s, { phase: 'deleted', attempt: 0 }, { do: 'markDeleted' });
    case 'unreadable':
      return next(s, { phase: 'unreadable', prev: s.phase === 'unreadable' ? s.prev : s.phase, attempt: ev.attempt || s.attempt + 1 }, { do: 'retry', attempt: ev.attempt || s.attempt + 1 });
    case 'restored': {
      const phase = s.phase === 'unreadable' ? s.prev : 'ok';
      return next(s, { phase, attempt: 0 }, { do: phase === 'ok' ? 'clear' : 'retryDone' });
    }
    case 'edited':
      return s.phase === 'external' && ev.dirty ? next(s, { phase: 'conflict', prev: 'conflict' }, { do: 'conflict' }) : next(s, {});
    case 'synced': return next(s, { phase: 'ok', prev: 'ok', attempt: 0, diskHash: ev.hash ?? s.diskHash }, { do: 'clear' });
    default: return next(s, {});
  }
}

export function saveGate(s, { savedHash }) {
  if (s.phase === 'deleted') return 'saveAs';
  if (s.diskHash && savedHash && s.diskHash !== savedHash) return 'conflict';
  return 'write';
}
