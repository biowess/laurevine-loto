export const formatWhen = (t) => (t ? new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');

// Summary of a tab (+ its runtime document) for the Save pages.
export function describeDoc(tab, doc) {
  if (!tab) return null;
  const path = tab.path || '';
  const state = !path ? 'Not saved yet' : tab.deleted ? 'File deleted on disk' : tab.saveFailed ? 'Save failed' : tab.dirty ? 'Unsaved changes' : 'Saved';
  const format = doc && doc.encoding ? [doc.encoding, doc.eol].filter(Boolean).join(' · ') : '';
  return { name: tab.title, path, state, format, untitled: !path };
}
