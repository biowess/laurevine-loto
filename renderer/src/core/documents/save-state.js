// Pure: derives a document's save state from its tab metadata. Priority: saving > external > failed > dirty > saved.
export const SAVE = Object.freeze({ SAVED: 'saved', SAVING: 'saving', UNSAVED: 'dirty', FAILED: 'failed', EXTERNAL: 'external' });

const INFO = {
  [SAVE.SAVED]: { label: 'Saved', tip: 'All changes are saved.' },
  [SAVE.SAVING]: { label: 'Saving…', tip: 'Writing the file.' },
  [SAVE.UNSAVED]: { label: 'Unsaved changes', tip: 'Changes are not yet written to the file.' },
  [SAVE.FAILED]: { label: 'Save failed', tip: 'The file could not be written. Autosave is paused; save again to retry.' },
  [SAVE.EXTERNAL]: { label: 'External modification detected', tip: 'The file changed on disk. Autosave is paused; save to choose Overwrite or Save As.' },
};

export function saveState(t) {
  if (!t) return SAVE.SAVED;
  if (t.saving) return SAVE.SAVING;
  if (t.conflict) return SAVE.EXTERNAL;
  if (t.saveFailed) return SAVE.FAILED;
  return t.dirty ? SAVE.UNSAVED : SAVE.SAVED;
}

export const describeSave = (t) => { const state = saveState(t); return { state, ...INFO[state] }; };

export const AUTOSAVE_MODES = Object.freeze(['off', 'delay', 'blur']);

// Only documents with a real file path are ever autosaved; untitled documents are left to recovery.
export const autosaveReady = (t) => !!t && !!t.path && !!t.dirty && !t.deleted && !t.saving && !t.saveFailed && !t.conflict;
