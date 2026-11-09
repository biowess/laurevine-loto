// Pure: Reference-update calculation (relative paths, encoded spaces, ./ and ../,
// reference-style and angle-bracket links, wiki-links, HTML media; code spans ignored).

export const posix = (p) => String(p || '').replace(/\\/g, '/');

export const dirOf = (p) => {
  const s = posix(p);
  const idx = s.lastIndexOf('/');
  return idx < 0 ? '' : s.slice(0, idx);
};

export function normPath(p) {
  const parts = posix(p).split('/');
  const out = [];
  for (const s of parts) {
    if (s === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop();
      else out.push('..');
    } else if (s && s !== '.') {
      out.push(s);
    }
  }
  return out.join('/');
}

// Computes relative path from directory `fromDir` to target file `toPath`.
export function computeRelative(fromDir, toPath) {
  const fromClean = normPath(fromDir);
  const toClean = normPath(toPath);
  if (!fromClean) return toClean;
  const fromParts = fromClean.split('/').filter(Boolean);
  const toParts = toClean.split('/').filter(Boolean);
  let k = 0;
  while (k < fromParts.length && k < toParts.length - 1 && fromParts[k] === toParts[k]) k++;
  const up = fromParts.length - k;
  const down = toParts.slice(k);
  const res = [];
  for (let i = 0; i < up; i++) res.push('..');
  res.push(...down);
  return res.join('/') || '.';
}

// Finds all fenced code blocks and inline code spans.
export function findCodeRanges(text) {
  const str = String(text || '');
  const ranges = [];
  // 1. Fenced code
  const fenceRe = /^[ ]{0,3}(`{3,}|~{3,})(?:[^\r\n]*)/gm;
  let m;
  while ((m = fenceRe.exec(str)) !== null) {
    const marker = m[1][0];
    const len = m[1].length;
    const start = m.index;
    const endRe = new RegExp(`^[ ]{0,3}${marker}{${len},}[ \\t]*$`, 'gm');
    endRe.lastIndex = fenceRe.lastIndex;
    const endM = endRe.exec(str);
    if (endM) {
      ranges.push([start, endM.index + endM[0].length]);
      fenceRe.lastIndex = endM.index + endM[0].length;
    } else {
      ranges.push([start, str.length]);
      break;
    }
  }
  // 2. Inline code spans outside fenced code
  const inFenced = (pos) => ranges.some(([s, e]) => pos >= s && pos < e);
  const inlineRe = /(`+)((?:[^\\]|\\.)*?)\1/g;
  while ((m = inlineRe.exec(str)) !== null) {
    if (!inFenced(m.index)) {
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

// Scans links, reference definitions, wiki-links, and HTML media outside code.
export function scanDocumentLinks(text) {
  const str = String(text || '');
  const codeRanges = findCodeRanges(str);
  const inCode = (pos) => codeRanges.some(([s, e]) => pos >= s && pos < e);
  const links = [];

  // 1. Markdown inline links & images: [label](<url> "title") or [label](url "title")
  const INLINE = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*(?:<([^>]*)>|([^\s\)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  let m;
  while ((m = INLINE.exec(str)) !== null) {
    if (inCode(m.index)) continue;
    const hasAngle = m[3] !== undefined;
    const rawTarget = hasAngle ? m[3] : m[4];
    if (!rawTarget) continue;
    // Find offset of rawTarget inside m[0]
    const off = hasAngle ? m[0].indexOf('<' + rawTarget + '>') + 1 : m[0].indexOf(rawTarget);
    const from = m.index + off;
    const to = from + rawTarget.length;
    links.push({
      kind: 'inline',
      raw: rawTarget,
      from,
      to,
      hasAngle,
      fullFrom: hasAngle ? from - 1 : from,
      fullTo: hasAngle ? to + 1 : to,
    });
  }

  // 2. Reference definitions: [ref]: url "title" or [ref]: <url> "title"
  const REF_DEF = /^[ ]{0,3}\[([^\]]+)\]:\s*(?:<([^>]*)>|(\S+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?/gm;
  while ((m = REF_DEF.exec(str)) !== null) {
    if (inCode(m.index)) continue;
    const hasAngle = m[2] !== undefined;
    const rawTarget = hasAngle ? m[2] : m[3];
    if (!rawTarget) continue;
    const off = hasAngle ? m[0].indexOf('<' + rawTarget + '>') + 1 : m[0].indexOf(rawTarget);
    const from = m.index + off;
    const to = from + rawTarget.length;
    links.push({
      kind: 'ref',
      raw: rawTarget,
      from,
      to,
      hasAngle,
      fullFrom: hasAngle ? from - 1 : from,
      fullTo: hasAngle ? to + 1 : to,
    });
  }

  // 3. Wiki-links & wiki-embeds: [[target#anchor|label]] or ![[target]]
  const WIKI = /(!?)\[\[([^\]|#\r\n]+)(?:#([^\]|\r\n]+))?(?:\|([^\]\r\n]+))?\]\]/g;
  while ((m = WIKI.exec(str)) !== null) {
    if (inCode(m.index)) continue;
    const target = m[2].trim();
    if (!target) continue;
    // target starts after [[ or ![[
    const prefixLen = m[1] ? 3 : 2;
    const from = m.index + prefixLen;
    const to = from + m[2].length;
    links.push({
      kind: 'wiki',
      raw: target,
      from,
      to,
      anchor: (m[3] || '').trim(),
      alias: m[4] || '',
    });
  }

  // 4. HTML media tags: <img src="url">, <audio src="...">, <video src="...">, <source src="...">
  const HTML = /<(?:img|audio|video|source)\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  while ((m = HTML.exec(str)) !== null) {
    if (inCode(m.index)) continue;
    const rawTarget = m[1] ?? m[2];
    if (!rawTarget) continue;
    const quote = m[1] !== undefined ? '"' : "'";
    const off = m[0].indexOf(quote + rawTarget + quote) + 1;
    const from = m.index + off;
    const to = from + rawTarget.length;
    links.push({
      kind: 'html',
      raw: rawTarget,
      from,
      to,
      hasAngle: false,
    });
  }

  return links.sort((a, b) => a.from - b.from);
}

const stem = (p) => posix(p).toLowerCase().replace(/\.(md|markdown|mdown|txt)$/, '');

// Resolves a target string into clean workspace path, query, and anchor.
export function parseTarget(docDir, rawTarget) {
  const s = String(rawTarget || '').trim();
  if (!s || s.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(s)) return null;

  let pathPart = s;
  let anchorPart = '';
  let queryPart = '';

  const hashIdx = pathPart.indexOf('#');
  if (hashIdx >= 0) {
    anchorPart = pathPart.slice(hashIdx);
    pathPart = pathPart.slice(0, hashIdx);
  }
  const qIdx = pathPart.indexOf('?');
  if (qIdx >= 0) {
    queryPart = pathPart.slice(qIdx);
    pathPart = pathPart.slice(0, qIdx);
  }

  const isEncoded = pathPart.includes('%20') || /%[0-9a-f]{2}/i.test(pathPart);
  const hadDotSlash = pathPart.startsWith('./');

  let decPath = pathPart;
  try { decPath = decodeURI(pathPart); } catch {}

  const fullPath = decPath.startsWith('/')
    ? normPath(decPath.slice(1))
    : normPath(docDir ? `${docDir}/${decPath}` : decPath);

  return {
    path: fullPath,
    anchor: anchorPart,
    query: queryPart,
    isEncoded,
    hadDotSlash,
  };
}

// Computes edits for a document given a map/array of renamed workspace files.
// renames: Map<oldPath, newPath> or [{ from, to }] (paths are workspace-relative posix).
export function computeReferenceEdits(text, docPath, renames) {
  const map = renames instanceof Map ? renames : new Map((renames || []).map((r) => [posix(r.from), posix(r.to)]));
  if (!map.size) return [];

  const curDoc = posix(docPath);
  const newDoc = map.get(curDoc) || curDoc;
  const oldDir = dirOf(curDoc);
  const newDir = dirOf(newDoc);
  const docMoved = oldDir !== newDir;

  const links = scanDocumentLinks(text);
  const edits = [];

  for (const l of links) {
    if (l.kind === 'wiki') {
      const oldTarget = l.raw;
      const oldClean = normPath(oldTarget);
      const oldStem = stem(oldClean).split('/').pop();
      let matchedNew = null;

      for (const [from, to] of map.entries()) {
        const fromStem = stem(from).split('/').pop();
        const toStem = stem(to).split('/').pop();

        // Exact match with or without ext
        if (oldClean === from || stem(oldClean) === stem(from)) {
          matchedNew = oldTarget.includes('/') ? (oldTarget.endsWith('.md') ? to : stem(to)) : toStem;
          break;
        }
        // Stem match (e.g. [[Note]] -> Note was renamed)
        if (oldStem === fromStem && (!oldTarget.includes('/') || stem(from).endsWith(stem(oldTarget)))) {
          matchedNew = oldTarget.includes('/') ? stem(to) : toStem;
          break;
        }
      }

      if (matchedNew && matchedNew !== oldTarget) {
        edits.push({ from: l.from, to: l.to, insert: matchedNew });
      }
      continue;
    }

    // Inline, ref, or html links
    const parsed = parseTarget(oldDir, l.raw);
    if (!parsed) continue;

    const oldTgt = parsed.path;
    let newTgt = map.get(oldTgt);
    if (!newTgt) {
      // Also check with/without .md extension
      if (!oldTgt.endsWith('.md') && map.has(`${oldTgt}.md`)) {
        newTgt = map.get(`${oldTgt}.md`).replace(/\.md$/, '');
      }
    }
    const tgtMoved = !!newTgt && newTgt !== oldTgt;
    const finalTgt = newTgt || oldTgt;

    if (!tgtMoved && !docMoved) continue;

    let newRel = computeRelative(newDir, finalTgt);
    if (parsed.hadDotSlash && !newRel.startsWith('../') && !newRel.startsWith('/')) {
      newRel = './' + newRel;
    }
    if (parsed.isEncoded || (!l.hasAngle && newRel.includes(' '))) {
      newRel = newRel.replace(/ /g, '%20');
    }

    const newRaw = `${newRel}${parsed.query}${parsed.anchor}`;
    if (newRaw !== l.raw) {
      edits.push({ from: l.from, to: l.to, insert: newRaw });
    }
  }

  return edits;
}
