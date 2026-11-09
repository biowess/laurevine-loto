export const SNIPPET_VERSION = 1;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

export const STARTER_SNIPPETS = Object.freeze([
  { name: 'Callout', trigger: 'callout', scope: '', body: '> [!${1:NOTE}]\n> $2' },
  { name: 'Footnote', trigger: 'fn', scope: '', body: '[^${1:label}]: ${2:content}' },
  { name: 'Table', trigger: 'tbl', scope: '', body: '| ${1:Header 1} | ${2:Header 2} |\n| --- | --- |\n| $3 | $4 |' },
  { name: 'Quote Selection', trigger: 'quote', scope: '', body: '> {{selection}}$1' },
  { name: 'Date and Time', trigger: 'dt', scope: '', body: '{{date}} $1' },
  { name: 'Frontmatter', trigger: 'meta', scope: '', body: '---\ntitle: ${1:Title}\ndate: {{date}}\n---$2' },
]);

export function cleanName(name) {
  const n = String(name ?? '').trim();
  if (!n || n.length > 60 || /[\\/:*?"<>|,\x00-\x1f]/.test(n) || n.startsWith('.') || n.endsWith('.') || RESERVED.test(n)) {
    throw new Error('Enter a name of up to 60 characters without folders or reserved characters.');
  }
  return n;
}

export function cleanTrigger(trigger) {
  const t = String(trigger ?? '').trim();
  if (!t || t.length > 30 || /\s/.test(t)) {
    throw new Error('Enter a trigger prefix up to 30 characters without spaces.');
  }
  return t;
}

export const snippetFile = (s) => JSON.stringify({
  format: 'laurevine-snippet',
  version: SNIPPET_VERSION,
  name: s.name,
  trigger: s.trigger,
  scope: s.scope || '',
  body: s.body || '',
}, null, 2);

export function parseSnippetFile(text) {
  try {
    const j = JSON.parse(text);
    if (!j || typeof j !== 'object') return null;
    const name = String(j.name || '').trim();
    const trigger = String(j.trigger || '').trim();
    if (!name || !trigger) return null;
    return {
      name,
      trigger,
      scope: String(j.scope || '').trim(),
      body: String(j.body ?? ''),
    };
  } catch { return null; }
}

export function expandSnippet(body, { selection = '', date = null } = {}) {
  const d = date || new Date().toISOString().slice(0, 10);
  let text = String(body || '')
    .replaceAll('{{date}}', d)
    .replaceAll('{{selection}}', selection);

  const rawStops = [];
  let out = '', i = 0;
  const regex = /(\$\$)|(?:\$\{([0-9]+):([^}]*)\})|(?:\$([0-9]+))/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    out += text.slice(i, m.index);
    if (m[1]) {
      out += '$';
    } else if (m[2] != null) {
      const num = Number(m[2]);
      const ph = m[3] || '';
      const from = out.length;
      out += ph;
      rawStops.push({ num, from, to: out.length });
    } else if (m[4] != null) {
      const num = Number(m[4]);
      rawStops.push({ num, from: out.length, to: out.length });
    }
    i = regex.lastIndex;
  }
  out += text.slice(i);

  const byNum = new Map();
  for (const s of rawStops) {
    if (!byNum.has(s.num)) byNum.set(s.num, s);
  }
  const nums = [...byNum.keys()].filter((n) => n > 0).sort((a, b) => a - b);
  const stops = nums.map((n) => byNum.get(n));
  if (byNum.has(0)) stops.push(byNum.get(0));
  else stops.push({ num: 0, from: out.length, to: out.length });

  return { text: out, stops };
}
