const OPEN = /^\uFEFF?---[ \t]*(\r?\n|$)/;
const CLOSE = /^(---|\.\.\.)[ \t]*$/;

// Split text into untouched raw block and body; raw + body === text.
export function splitFrontmatter(text) {
  const m = OPEN.exec(text);
  if (!m) return { present: false, raw: '', body: text, inner: '' };
  let pos = m[0].length;
  const start = pos;
  while (pos <= text.length) {
    let nl = text.indexOf('\n', pos);
    const end = nl < 0 ? text.length : nl;
    if (CLOSE.test(text.slice(pos, end).replace(/\r$/, ''))) {
      const stop = nl < 0 ? text.length : nl + 1;
      return { present: true, raw: text.slice(0, stop), body: text.slice(stop), inner: text.slice(start, pos) };
    }
    if (nl < 0) break;
    pos = nl + 1;
  }
  return { present: false, raw: '', body: text, inner: '' };
}

function unquote(s) {
  const q = s[0];
  if (s.length < 2 || s[s.length - 1] !== q) throw new Error('unterminated string');
  const b = s.slice(1, -1);
  if (q === "'") return b.replace(/''/g, "'");
  return b.replace(/\\(["\\/nrt]|u[0-9a-fA-F]{4})/g, (_, c) => (c[0] === 'u' ? String.fromCharCode(parseInt(c.slice(1), 16)) : { n: '\n', r: '\r', t: '\t' }[c] || c));
}

function scalar(s) {
  s = s.trim();
  if (s === '') return null;
  if (s[0] === '"' || s[0] === "'") return unquote(s);
  s = s.replace(/\s+#.*$/, '');
  if (/^(null|~)$/i.test(s)) return null;
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
  if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  if (/^[{&*!|>]/.test(s)) throw new Error('unsupported value');
  return s;
}

function inlineList(s) {
  const t = s.trim();
  if (t[t.length - 1] !== ']') throw new Error('unterminated list');
  const out = [];
  let cur = '', q = '';
  for (const c of t.slice(1, -1)) {
    if (q) { cur += c; if (c === q) q = ''; } else if (c === '"' || c === "'") { q = c; cur += c; } else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  if (q) throw new Error('unterminated string');
  if (cur.trim() || out.length) out.push(cur);
  return out.filter((x, i) => x.trim() || i < out.length - 1).map(scalar);
}

export function parseFrontmatter(text) {
  const { present, raw, body, inner } = splitFrontmatter(text);
  const data = {};
  let error = false;
  if (present) {
    try {
      const lines = inner.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim() || line.trim()[0] === '#') continue;
        const m = /^([^\s#:'"][^:]*?|"[^"]+"|'[^']+')\s*:(?:\s+(.*)|\s*)$/.exec(line);
        if (!m) throw new Error('bad line');
        const key = /^["']/.test(m[1]) ? unquote(m[1]) : m[1];
        const val = (m[2] || '').trim();
        if (val === '') {
          const items = [];
          while (i + 1 < lines.length && /^\s*-(\s|$)/.test(lines[i + 1])) items.push(scalar(lines[++i].replace(/^\s*-\s*/, '')));
          data[key] = items.length ? items : null;
        } else data[key] = val[0] === '[' ? inlineList(val) : scalar(val);
      }
    } catch {
      error = true;
    }
  }
  return { present, raw, body, data: error ? {} : data, error };
}
