import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILTIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '../resources/templates');
export const MAX = 200000;
const META = {
  blank: ['Blank Document', 'An empty page with just a title.', 'General'],
  'general-article': ['General Article', 'Title, lede and clean prose.', 'Writing'],
  'blog-article': ['Blog Article', 'A post with intro, sections and a closing.', 'Writing'],
  'daily-journal': ['Daily Journal', 'Date-stamped entry for the day.', 'Personal'],
  'meeting-notes': ['Meeting Notes', 'Attendees, agenda, decisions and actions.', 'Work'],
  'project-plan': ['Project Plan', 'Goals, milestones, risks and owners.', 'Work'],
  'structured-report': ['Structured Report', 'Summary, findings and recommendations.', 'Work'],
  'academic-report': ['Academic Report', 'Abstract, method, results and references.', 'Academic'],
  'research-notes': ['Research Notes', 'Questions, sources and observations.', 'Academic'],
  readme: ['README', 'Project overview, install and usage.', 'Technical'],
  'technical-documentation': ['Technical Documentation', 'Concepts, reference and examples.', 'Technical'],
  changelog: ['Changelog', 'Versioned list of notable changes.', 'Technical'],
};

export async function readMeta(dir) {
  try { const m = JSON.parse(await fsp.readFile(path.join(dir, '_meta.json'), 'utf8')); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

async function read(dir, builtin, meta = {}) {
  let ents;
  try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents.filter((x) => x.isFile() && /\.md$/i.test(x.name) && !x.name.includes(',')).sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const file = path.join(dir, e.name), stem = e.name.slice(0, -3);
      if ((await fsp.stat(file)).size > MAX) continue;
      const text = (await fsp.readFile(file, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      const m = builtin ? META[stem] : null;
      if (builtin && !m) continue;
      out.push({ id: builtin ? stem : `user:${stem}`, name: m ? m[0] : stem, description: m ? m[1] : String(meta[stem]?.description || 'Your template.'), category: m ? m[2] : String(meta[stem]?.category || 'Yours'), builtin, text, ...(builtin ? {} : { path: file }) });
    } catch { /* unreadable template: skipped */ }
  }
  return builtin ? out.sort((a, b) => (a.id === 'blank' ? -1 : b.id === 'blank' ? 1 : 0)) : out;
}

export async function listTemplates(userDir) {
  return [...(await read(BUILTIN, true)), ...(await read(userDir, false, await readMeta(userDir)))];
}
