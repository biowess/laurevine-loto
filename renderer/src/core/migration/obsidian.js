// Reads .obsidian settings as data only. Plugins and their scripts are identified by id and never run.
export const OBSIDIAN_FILES = Object.freeze(['app.json', 'core-plugins.json', 'community-plugins.json', 'plugins/templater-obsidian/data.json']);

const FLAGS = { dataview: 'dataview', 'templater-obsidian': 'templater', 'obsidian-tasks-plugin': 'tasks', 'obsidian-excalidraw-plugin': 'excalidraw', 'obsidian-kanban': 'kanban' };
const json = (t) => { try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : null; } catch { return null; } };
const names = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : v ? Object.keys(v).filter((k) => v[k] === true) : []);
const str = (v) => (typeof v === 'string' ? v.slice(0, 300) : '');

export function attachmentFolder(v) {
  const p = str(v).trim();
  if (!p || p === '/') return { mode: 'vault-root', path: '' };
  if (p === './') return { mode: 'same-folder', path: '' };
  if (p.startsWith('./')) return { mode: 'note-subfolder', path: p.slice(2) };
  return { mode: 'folder', path: p.replace(/^\/+|\/+$/g, '') };
}

// texts: { 'app.json': string, ... } for the files that exist; canvas: number of .canvas files.
export function parseObsidian(texts = {}, canvas = 0) {
  const app = json(texts['app.json']) || {}, core = names(json(texts['core-plugins.json'])), community = names(json(texts['community-plugins.json']));
  const tpl = json(texts['plugins/templater-obsidian/data.json']) || {};
  const flagged = community.filter((id) => FLAGS[id]).map((id) => ({ id, kind: FLAGS[id] }));
  if (core.includes('canvas') || canvas) flagged.push({ id: 'canvas', kind: 'canvas', files: canvas });
  const newLinkFormat = ['shortest', 'relative', 'absolute'].includes(app.newLinkFormat) ? app.newLinkFormat : 'shortest';
  return {
    attachmentFolder: attachmentFolder(app.attachmentFolderPath), linkFormat: newLinkFormat, wikiLinks: app.useMarkdownLinks !== true,
    plugins: { core, community }, flagged, templatesFolder: str(tpl.templates_folder),
  };
}
