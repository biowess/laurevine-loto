import { splitFrontmatter } from './frontmatter.js';

const q = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
const KEY = /^("[^"]+"|'[^']+'|[^\s#:'"\-\[\]{}][^:]*?)\s*:(\s|$)/;
const keyOf = (l) => { const m = KEY.exec(l); return m && m[1].replace(/^(["'])(.*)\1$/, '$2'); };

// typed: keep true/false/null/numbers unquoted (custom keys); otherwise they are quoted to stay strings.
export function yamlValue(s, typed) {
  s = String(s);
  const plain = s !== '' && s === s.trim() && !/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s) && !/: |\s#|\n|:$/.test(s);
  const loose = /^(null|~|true|false)$/i.test(s) || /^[-+]?(\d+\.?\d*|\.\d+)$/.test(s);
  return plain && (typed || !loose) ? s : q(s);
}

const tag = (t) => (/[\[\]{}'"]/.test(t) ? q(t) : yamlValue(t));

// Set (val string) or delete (val null) one top-level key, keeping every other line and comment.
export function setKey(inner, key, val) {
  const eol = inner.includes('\r\n') ? '\r\n' : '\n';
  const lines = inner === '' ? [] : inner.split(/\r?\n/);
  const at = lines.findIndex((l) => keyOf(l) === key);
  const k = /^[A-Za-z_][\w.-]*$/.test(key) ? key : q(key);
  const line = val === null ? [] : [val === '' ? `${k}:` : `${k}: ${val}`];
  if (at < 0) lines.push(...line);
  else {
    let j = at + 1;
    while (j < lines.length && (/^\s+\S/.test(lines[j]) || /^-(\s|$)/.test(lines[j]))) j++;
    lines.splice(at, j - at, ...line);
  }
  return lines.join(eol);
}

export const applyOps = (inner, ops) => ops.reduce((s, [k, v]) => setKey(s, k, v), inner);

// cur/snap: { title, author, date, tags (comma string), custom: [[key, value]] } -> ops only for what changed.
export function formOps(cur, snap) {
  const ops = [];
  for (const k of ['title', 'author', 'date']) if (cur[k] !== snap[k]) ops.push([k, cur[k].trim() === '' ? null : yamlValue(cur[k].trim())]);
  if (cur.tags !== snap.tags) {
    const t = cur.tags.split(',').map((s) => s.trim()).filter(Boolean);
    ops.push(['tags', t.length ? `[${t.map(tag).join(', ')}]` : null]);
  }
  const was = new Map(snap.custom), now = new Map(cur.custom);
  for (const [k] of snap.custom) if (!now.has(k)) ops.push([k, null]);
  for (const [k, v] of cur.custom) if (was.get(k) !== v) ops.push([k, v.trim() === '' ? '' : yamlValue(v.trim(), true)]);
  return ops;
}

// Message for the first problem found, else null. Structural check of top-level lines (nested content is left alone).
export function validateYaml(inner) {
  const seen = new Set();
  let top = false;
  const lines = String(inner).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], n = `Line ${i + 1}: `;
    if (!l.trim() || l.trim()[0] === '#') continue;
    if (/^(---|\.\.\.)\s*$/.test(l)) return `${n}a line of --- would end the frontmatter.`;
    if (/^\s*\t/.test(l)) return `${n}tabs cannot indent YAML.`;
    if (/^\s/.test(l)) { if (!top) return `${n}unexpected indentation.`; continue; }
    if (/^-(\s|$)/.test(l)) { if (!top) return `${n}list item without a key.`; continue; }
    const m = KEY.exec(l);
    if (!m) return `${n}expected "key: value".`;
    const k = m[1].replace(/^(["'])(.*)\1$/, '$2'), v = l.slice(m[0].length).trim();
    if (seen.has(k)) return `${n}duplicate key "${k}".`;
    seen.add(k); top = true;
    if (v[0] === '"' && !/^"(?:[^"\\]|\\.)*"\s*(#.*)?$/.test(v)) return `${n}unterminated double-quoted string.`;
    if (v[0] === "'" && !/^'(?:[^']|'')*'\s*(#.*)?$/.test(v)) return `${n}unterminated single-quoted string.`;
    if (v[0] === '[' && !/\]\s*(#.*)?$/.test(v)) return `${n}unterminated list.`;
    if (v[0] === '{' && !/\}\s*(#.*)?$/.test(v)) return `${n}unterminated mapping.`;
  }
  return null;
}

// New frontmatter block text for `text` ('' removes it); BOM and line endings follow the document.
export function buildBlock(text, inner) {
  const sp = splitFrontmatter(text), t = inner.replace(/\s+$/, '');
  if (!t.trim()) return '';
  const eol = /\r\n/.test(sp.present ? sp.raw : text.slice(0, 4000)) ? '\r\n' : '\n';
  return `${sp.raw.startsWith('\uFEFF') ? '\uFEFF' : ''}---${eol}${t.replace(/\r?\n/g, eol)}${eol}---${eol}${sp.present || !sp.body ? '' : eol}`;
}

// The only text that changes: [0, raw.length) becomes the new block.
export const replaceBlock = (text, inner) => { const sp = splitFrontmatter(text); return { from: 0, to: sp.raw.length, insert: buildBlock(text, inner), body: sp.body }; };
