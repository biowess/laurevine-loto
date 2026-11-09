// Bibliography source resolution and parsing from frontmatter or workspace settings.
import { parseFrontmatter } from '../../core/markdown/frontmatter.js';
import { parseBibTeX } from '../../core/bibliography/bibtex.js';
import { parseCslJson } from '../../core/bibliography/csl.js';
import { readPath } from '../../services/doc-client.js';

const cache = new Map();

function dirOf(p) {
  return String(p || '').replace(/[\\/][^\\/]*$/, '');
}

function resolveRel(base, rel) {
  if (!rel) return '';
  // If already absolute
  if (/^([a-zA-Z]:[\\/]|[\\/])/.test(rel)) return rel;
  const b = String(base || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const r = String(rel || '').replace(/\\/g, '/');
  const segs = b ? b.split('/') : [];
  for (const s of r.split('/')) {
    if (s === '..') segs.pop();
    else if (s && s !== '.') segs.push(s);
  }
  return segs.join('/');
}

// Extract bibliography path(s) from document frontmatter or workspace settings default
export function resolveBibliographyPaths(docText, docPath, wsRoot, defaultPath = '') {
  const fm = parseFrontmatter(docText || '');
  const raw = fm.data?.bibliography;
  let paths = [];

  if (raw) {
    paths = Array.isArray(raw) ? raw.map(String) : [String(raw)];
  } else if (defaultPath) {
    paths = [String(defaultPath)];
  } else if (docPath && /(^|[\s[;(])-?@[\w]/.test(docText || '')) {
    paths = ['reference.bib'];
  }

  const base = docPath ? dirOf(docPath) : (wsRoot || '');
  return paths.map((p) => ({
    raw: p,
    resolved: resolveRel(base, p),
  }));
}

// Load and parse bibliography files into normalized entries, errors and duplicates
export async function loadBibliography(resolvedPaths, reader = readPath) {
  const allEntries = [];
  const entryMap = new Map();
  const errors = [];
  const duplicates = [];

  for (const p of resolvedPaths) {
    const filePath = typeof p === 'string' ? p : p.resolved;
    if (!filePath) continue;

    try {
      const cached = cache.get(filePath);
      const res = await reader(filePath);
      if (!res || !res.ok || !res.doc) {
        errors.push(`Could not read bibliography file: ${filePath}`);
        continue;
      }

      const doc = res.doc;
      if (cached && cached.hash === doc.hash) {
        for (const e of cached.entries) {
          if (entryMap.has(e.id)) duplicates.push(e.id);
          else { entryMap.set(e.id, e); allEntries.push(e); }
        }
        errors.push(...cached.errors);
        duplicates.push(...cached.duplicates);
        continue;
      }

      const isJson = filePath.endsWith('.json') || doc.text.trim().startsWith('[') || doc.text.trim().startsWith('{');
      const parsed = isJson ? parseCslJson(doc.text) : parseBibTeX(doc.text);

      const fileEntries = parsed.entries || [];
      const fileErrors = (parsed.errors || []).map((e) => `${filePath}: ${e}`);
      const fileDuplicates = [];

      for (const e of fileEntries) {
        if (entryMap.has(e.id)) {
          duplicates.push(e.id);
          fileDuplicates.push(e.id);
        } else {
          entryMap.set(e.id, e);
          allEntries.push(e);
        }
      }

      errors.push(...fileErrors);
      cache.set(filePath, {
        hash: doc.hash,
        entries: fileEntries,
        errors: fileErrors,
        duplicates: fileDuplicates,
      });
    } catch (err) {
      errors.push(`Error loading ${filePath}: ${err.message}`);
    }
  }

  return {
    entries: allEntries,
    entryMap,
    errors,
    duplicates,
    paths: resolvedPaths,
  };
}
