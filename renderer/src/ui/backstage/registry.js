import home from './pages/home.js';
import newDoc from './pages/new.js';
import exportPage from './pages/export.js';
import migration from './pages/migration.js';
import info from './pages/info.js';
import preferences from './pages/preferences.js';
import about from './pages/about.js';
import open from './pages/open.js';
import openWorkspace from './pages/open-workspace.js';
import save from './pages/save.js';
import saveAs from './pages/save-as.js';

const ORDER = ['home', 'new', 'open', 'open-workspace', 'save', 'save-as', 'export', 'print', 'html-export', 'info', 'preferences', 'about', 'migration'];
const PLANNED = [];
const all = new Map([...[home, newDoc, open, openWorkspace, save, saveAs, exportPage, migration, info, preferences, about].map((p) => [p.id, p]),
  ...PLANNED.map(([id, title, icon]) => [id, { id, title, icon, planned: true }])]);


export const backstagePages = {
  get: (id) => all.get(id),
  register: (p) => { all.set(p.id, p); },
  list: () => ORDER.map((id) => all.get(id)).filter(Boolean),
};
