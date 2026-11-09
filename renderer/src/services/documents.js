// Runtime registry of open documents. The store holds tab metadata only; text and EditorState live here.
import { store } from '../state/store.js';
import { documentActions } from '../state/slices/documents.js';
import { createDocument, withText, untitledName } from '../core/documents/document.js';
import { getSetting } from './settings-client.js';
import { samePath } from '../core/documents/paths.js';
import { WELCOME } from '../core/documents/welcome.js';

const entries = new Map(), subs = new Set();
let seq = 0, bridge = null;
const notify = (id) => subs.forEach((f) => f(id));
export const onDocChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function setDocProfile(id, profile) {
  const e = entries.get(id);
  if (e) { e.profile = profile; notify(id); }
}

export function openDocument({ name, path = null, text = '', caret = null, ...meta } = {}) {
  const id = `doc-${++seq}`, names = store.get().documents.tabs.map((t) => t.title);
  if (!path && !meta.eol && !meta.encoding) {
    const enc = getSetting('files.defaultEncoding');
    Object.assign(meta, { encoding: enc.startsWith('utf-8') ? 'utf-8' : enc, bom: enc !== 'utf-8', eol: getSetting('files.defaultEol') });
  }
  const doc = createDocument({ id, name: name || untitledName(names, getSetting('files.newExtension')), path, text, ...meta, names });
  entries.set(id, { doc, state: null, scroll: null, heavy: false, profile: null, mode: null, caret });
  store.dispatch(documentActions.open({ id, title: doc.name, path: doc.path, dirty: doc.dirty }));
  return doc;
}

export const openWelcome = () => openDocument({ text: WELCOME });
export const getEntry = (id) => entries.get(id);
export const activate = (id) => store.dispatch(documentActions.activate(id));
export function findByPath(path) {
  for (const [id, e] of entries) if (samePath(e.doc.path, path)) return id;
  return null;
}

// Applies saved/renamed metadata (path, name, diskHash, savedHash, dirty) to an open document.
export function updateDoc(id, patch) {
  const e = entries.get(id);
  if (!e) return;
  e.doc = { ...e.doc, ...patch };
  store.dispatch(documentActions.update(id, { title: e.doc.name, path: e.doc.path || undefined, dirty: e.doc.dirty, saveFailed: !!e.doc.saveFailed, deleted: !!e.doc.deleted, saving: !!e.doc.saving, conflict: !!e.doc.conflict }));
  notify(id);
}

// Replaces the document with freshly read disk content (revert) and rebuilds the editor state.
export function reloadDocument(id, d) {
  const e = entries.get(id);
  if (!e) return;
  e.doc = createDocument({ id, name: d.name, path: d.path, text: d.text, encoding: d.encoding, bom: d.bom, eol: d.eol, dominantEol: d.dominantEol, diskHash: d.diskHash });
  store.dispatch(documentActions.update(id, { title: e.doc.name, dirty: false, saveFailed: false, conflict: false, saving: false }));
  editorRun('reload', id);
  notify(id);
}

export function syncText(id, text) {
  const e = entries.get(id);
  if (!e) return;
  e.doc = withText(e.doc, text);
  store.dispatch(documentActions.update(id, { dirty: e.doc.dirty }));
  notify(id);
}

export function closeDocument(id) {
  entries.delete(id);
  store.dispatch(documentActions.close(id));
}

// The editor registers { undo, redo, flush }; commands reach it only through here.
export const setEditorBridge = (b) => { bridge = b; };
export const editorRun = (name, ...args) => (bridge && bridge[name] ? bridge[name](...args) : undefined);

// Every editor host registers release (flush text, keep state); callers run releaseAll before moving documents between groups.
const releasers = new Set();
export const onRelease = (fn) => { releasers.add(fn); return () => releasers.delete(fn); };
export const releaseAll = () => releasers.forEach((f) => f());
