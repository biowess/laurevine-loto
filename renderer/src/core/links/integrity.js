// Pure: Link integrity checks (broken links, missing media, unused attachments, orphaned assets, external links).
import { slugify } from '../markdown/slug.js';
import { parseWiki, classifyLink } from './resolve.js';
import { refs as extractRefs } from '../text/attach.js';

export const ASSET_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg|ico|mp3|wav|ogg|m4a|flac|mp4|webm|mov|ogv|pdf|zip|docx?|xlsx?|pptx?|csv)$/i;

export const isAssetFile = (p) => ASSET_EXT.test(String(p || ''));

export const isAttachmentDir = (p) => {
  const parts = String(p || '').replace(/\\/g, '/').split('/');
  return parts.some((s) => s === 'assets' || s === 'attachments' || s.endsWith('.assets'));
};

const dec = (s) => { try { return decodeURI(s); } catch { return s; } };
const stem = (p) => p.toLowerCase().replace(/\.(md|markdown|mdown|txt)$/, '');
const dirOf = (p) => {
  const idx = p.lastIndexOf('/');
  return idx < 0 ? '' : p.slice(0, idx + 1);
};

function norm(p) {
  const o = [];
  for (const s of p.split('/')) {
    if (s === '..') { if (!o.pop()) return null; } else if (s && s !== '.') o.push(s);
  }
  return o.join('/');
}

export function hasHeading(headings, anchor, strategy = 'github') {
  if (!headings || !headings.length || !anchor) return false;
  const clean = dec(anchor).toLowerCase();
  return headings.some((h) => {
    const text = (Array.isArray(h) ? h[1] : h.text || '').trim();
    if (!text) return false;
    const lower = text.toLowerCase();
    if (lower === clean) return true;
    return slugify(text, strategy).toLowerCase() === clean;
  });
}

// Scans text of a single document (workspace-relative docPath) against known workspace files and headings.
export function checkDocumentIntegrity(text, docPath = '', { workspaceFiles = new Set(), headingsByFile = new Map(), strategy = 'github' } = {}) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const brokenLinks = [];
  const missingFiles = [];
  const externalMap = new Map();
  const fileDir = dirOf(docPath);

  // Wiki links and standard markdown links
  const WIKI = /\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]/g;
  const INLINE = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*(?:<([^>]*)>|([^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i], no = i + 1;
    // Strip inline code spans
    const s = ln.replace(/(`+)[^`]*\1/g, (m) => ' '.repeat(m.length));

    // Markdown inline links and images
    for (const m of s.matchAll(INLINE)) {
      const isImg = m[1] === '!';
      const target = m[3] ?? m[4] ?? '';
      if (!target) continue;

      if (/^([a-z][a-z0-9+.-]+:|\/\/)/i.test(target)) {
        if (!/^mailto:/i.test(target)) {
          const e = externalMap.get(target) || { url: target, count: 0, sources: [] };
          e.count++;
          e.sources.push({ from: docPath, line: no });
          externalMap.set(target, e);
        }
        continue;
      }

      if (isImg) {
        const raw = target.split('#')[0].split('?')[0];
        const decP = dec(raw);
        const resolved = norm(decP[0] === '/' ? decP : fileDir + decP);
        if (workspaceFiles.size && (!resolved || !workspaceFiles.has(resolved))) {
          missingFiles.push({ from: docPath, line: no, target, path: resolved || decP, kind: 'media', reason: 'missing-file' });
        }
        continue;
      }

      if (target.startsWith('#')) {
        const anchor = dec(target.slice(1));
        const selfHeadings = headingsByFile.get(docPath) || [];
        if (headingsByFile.size && !hasHeading(selfHeadings, anchor, strategy)) {
          brokenLinks.push({ from: docPath, line: no, target, kind: 'anchor', reason: 'missing-anchor', path: docPath, anchor });
        }
      } else {
        const [p, a = ''] = target.split('#');
        const anch = dec(a);
        const decP = dec(p.split('?')[0]);
        let resolved = norm(decP[0] === '/' ? decP : fileDir + decP);
        if (resolved !== null && !workspaceFiles.has(resolved) && workspaceFiles.has(`${resolved}.md`)) resolved += '.md';
        if (workspaceFiles.size) {
          if (resolved === null || !workspaceFiles.has(resolved)) {
            brokenLinks.push({ from: docPath, line: no, target, kind: 'file', reason: 'missing-file', path: resolved || decP, anchor: anch });
          } else if (anch) {
            const tgtHeadings = headingsByFile.get(resolved) || [];
            if (!hasHeading(tgtHeadings, anch, strategy)) {
              brokenLinks.push({ from: docPath, line: no, target, kind: 'file', reason: 'missing-anchor', path: resolved, anchor: anch });
            }
          }
        }
      }
    }

    // Wiki links
    for (const m of s.matchAll(WIKI)) {
      const tgt = m[1].trim(), anch = (m[2] || '').trim();
      if (!tgt && !anch) continue;
      if (!tgt && anch) {
        const selfHeadings = headingsByFile.get(docPath) || [];
        if (headingsByFile.size && !hasHeading(selfHeadings, anch, strategy)) {
          brokenLinks.push({ from: docPath, line: no, target: m[0], kind: 'wiki', reason: 'missing-anchor', path: docPath, anchor: anch });
        }
      } else if (workspaceFiles.size) {
        const k = stem(tgt);
        const hits = [...workspaceFiles].filter((x) => stem(x).endsWith(k));
        if (!hits.length) {
          brokenLinks.push({ from: docPath, line: no, target: tgt, kind: 'wiki', reason: 'missing-file', anchor: anch });
        } else if (anch) {
          const hit = hits[0];
          const tgtHeadings = headingsByFile.get(hit) || [];
          if (!hasHeading(tgtHeadings, anch, strategy)) {
            brokenLinks.push({ from: docPath, line: no, target: tgt, kind: 'wiki', reason: 'missing-anchor', path: hit, anchor: anch });
          }
        }
      }
    }
  }

  // HTML media tags (<img src="...">, <audio>, <video>)
  const htmlRefs = extractRefs(text);
  for (const r of htmlRefs) {
    if (r.kind !== 'html' || !workspaceFiles.size) continue;
    const p = dec(r.url.split('#')[0].split('?')[0]);
    const resolved = norm(p[0] === '/' ? p : fileDir + p);
    if (!resolved || !workspaceFiles.has(resolved)) {
      const lineNo = text.slice(0, r.from).split('\n').length;
      missingFiles.push({ from: docPath, line: lineNo, target: r.url, path: resolved || p, kind: 'media', reason: 'missing-file' });
    }
  }

  const externalLinks = [...externalMap.values()].sort((a, b) => b.count - a.count || a.url.localeCompare(b.url));
  return { brokenLinks, missingFiles, externalLinks };
}

// Replaces a link target at line `line` in text.
export function replaceLinkInText(text, { line, target }, replacement) {
  const lines = String(text).split(/\r?\n/);
  const idx = Math.max(0, line - 1);
  if (idx >= lines.length) return text;
  const ln = lines[idx];

  // Try replacing within markdown link [label](target)
  let next = ln;
  if (target) {
    const esc = target.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const mdRe = new RegExp(`(\\]\\()${esc}([\\s\\)])`);
    if (mdRe.test(next)) next = next.replace(mdRe, `$1${replacement}$2`);
    else if (next.includes(target)) next = next.replace(target, replacement);
  }
  lines[idx] = next;
  return lines.join('\n');
}

// Removes or unwraps a link at line `line` in text.
export function removeLinkInText(text, { line, target, kind }) {
  const lines = String(text).split(/\r?\n/);
  const idx = Math.max(0, line - 1);
  if (idx >= lines.length) return text;
  const ln = lines[idx];

  let next = ln;
  if (kind === 'media') {
    // Remove ![alt](src) or <img src="...">
    const esc = target.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    next = next.replace(new RegExp(`!\\[[^\\]]*\\]\\(\\s*<?${esc}>?[^)]*\\)`, 'g'), '');
    next = next.replace(new RegExp(`<[a-z]+\\b[^>]*?src=["']${esc}["'][^>]*>`, 'gi'), '');
  } else if (kind === 'wiki') {
    // [[Note|label]] -> label, or [[Note]] -> Note
    const esc = target.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    next = next.replace(new RegExp(`\\[\\[${esc}(?:#[^\\]|]*)?(?:\\|([^\\]]*))?\\]\\]`, 'g'), (_, lbl) => lbl || target);
  } else {
    // [label](target) -> label
    const esc = target.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    next = next.replace(new RegExp(`\\[([^\\]]+)\\]\\(\\s*<?${esc}>?[^)]*\\)`, 'g'), '$1');
  }
  lines[idx] = next;
  return lines.join('\n');
}
