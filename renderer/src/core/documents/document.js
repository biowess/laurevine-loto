// Pure document model: no DOM, no store. `savedHash` is `<length>:<fnv1a>` of the last saved text.
export const hashText = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${s.length}:${(h >>> 0).toString(16)}`;
};

export function untitledName(names = [], ext = 'md') {
  const used = new Set(names);
  let n = 1;
  while (used.has(`Untitled-${n}.${ext}`)) n++;
  return `Untitled-${n}.${ext}`;
}

export function createDocument({ id, name, path = null, text = '', names = [], encoding, bom, eol, dominantEol, diskHash } = {}) {
  const body = typeof text === 'string' ? text : '';
  return { id: String(id), name: name || untitledName(names), path, text: body, encoding: encoding || 'utf-8', bom: !!bom, eol: eol || 'lf', dominantEol: dominantEol || (eol && eol !== 'mixed' ? eol : 'lf'), diskHash: diskHash || null, savedHash: hashText(body), dirty: false };
}

export const withText = (doc, text) => (text === doc.text ? doc : { ...doc, text, dirty: hashText(text) !== doc.savedHash });
export const markSaved = (doc, meta = {}) => ({ ...doc, ...meta, savedHash: hashText(doc.text), dirty: false });

// Very large documents or very long lines skip syntax highlighting and whitespace marks to stay responsive.
export const isHeavy = (text) => text.length > 1500000 || /[^\n]{20000}/.test(text);
