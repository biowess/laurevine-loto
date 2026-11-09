import { planPages } from './site.js';
import { safeName } from './collection-run.js';

export const FORMATS = Object.freeze([
  { id: 'pdf', label: 'PDF (one file per document)', ext: 'pdf' },
  { id: 'html', label: 'HTML (one standalone page per document)', ext: 'html' },
  { id: 'site', label: 'HTML publication site (linked pages, sidebar)', folder: true },
  { id: 'docx', label: 'Word DOCX (needs Pandoc)', ext: 'docx' },
  { id: 'package', label: 'Markdown package (folder with images)', folder: true },
  { id: 'text', label: 'Plain text (one file per document)', ext: 'txt' },
]);

export function expandSelection(paths, root, mdFiles) {
  const base = String(root).replace(/\\/g, '/').replace(/\/+$/, '') + '/', hit = new Set();
  for (const p of paths) {
    const n = String(p).replace(/\\/g, '/'), rel = n === base.slice(0, -1) ? '' : n.startsWith(base) ? n.slice(base.length) : null;
    if (rel == null) continue;
    for (const f of mdFiles) if (!rel || f === rel || f.startsWith(`${rel}/`)) hit.add(f);
  }
  return [...hit];
}

// -> [{ src, out }] where out is relative to the chosen folder; site and package outputs live in a folder called name.
export function outputNames(files, format, name, titles = {}) {
  const f = FORMATS.find((x) => x.id === format), dir = safeName(name, 'Export');
  if (format === 'site') {
    const pages = planPages(files.map((p) => ({ path: p, title: titles[p] || p })));
    return [{ out: `${dir}/index.html` }, ...pages.map((p) => ({ src: p.path, out: `${dir}/${p.out}` })), { out: `${dir}/assets/site.css` }];
  }
  if (format === 'package') return files.map((p) => ({ src: p, out: `${dir}/${p}` }));
  const used = new Set();
  return files.map((p) => {
    const stem = safeName(p.split('/').pop().replace(/\.[^.]+$/, ''));
    let out = `${stem}.${f.ext}`, n = 2;
    while (used.has(out.toLowerCase())) out = `${stem} (${n++}).${f.ext}`;
    used.add(out.toLowerCase());
    return { src: p, out };
  });
}
