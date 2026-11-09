// Pure text search shared by the find bar and (later) workspace search.
const ESC = /[.*+?^${}()|[\]\\]/g;
const W = '[\\p{L}\\p{N}_]';

export function buildRegex({ query, caseSensitive, wholeWord, regex }) {
  if (!query) return { re: null };
  const flags = `g${caseSensitive ? '' : 'i'}m`;
  const src = regex ? query : query.replace(ESC, '\\$&');
  try {
    return { re: new RegExp(wholeWord ? `(?<!${W})(?:${src})(?!${W})` : src, `${flags}u`) };
  } catch (e) {
    if (regex) {
      try { return { re: new RegExp(wholeWord ? `(?<!\\w)(?:${src})(?!\\w)` : src, flags) }; } catch (e2) { e = e2; }
    }
    return { error: String(e.message).replace(/^Invalid regular expression: /, '') };
  }
}

export function findAll(text, opts, { limit = 10000, from = 0, to = text.length } = {}) {
  const { re, error } = buildRegex(opts);
  if (error) return { matches: [], error };
  if (!re) return { matches: [] };
  const matches = [];
  re.lastIndex = from;
  let m;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    if (end > to) break;
    if (!m[0].length) { re.lastIndex = m.index + (text.codePointAt(m.index) > 0xffff ? 2 : 1); continue; }
    matches.push({ from: m.index, to: end, g: m });
    if (matches.length >= limit) return { matches, truncated: true };
  }
  return { matches };
}

export function expand(tpl, m) {
  return tpl.replace(/\$(\$|&|\d{1,2}|<([^>]*)>)/g, (s, a, name) => {
    if (a === '$') return '$';
    if (a === '&') return m.g[0];
    if (name !== undefined) return m.g.groups ? (m.g.groups[name] ?? '') : s;
    const n = +a;
    if (n >= 1 && n < m.g.length) return m.g[n] ?? '';
    if (a.length === 2 && +a[0] >= 1 && +a[0] < m.g.length) return (m.g[+a[0]] ?? '') + a[1];
    return s;
  });
}
