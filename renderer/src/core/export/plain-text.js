import { render } from '../markdown/renderer.js';

const BLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'DIV', 'SECTION', 'FIGURE', 'FIGCAPTION', 'DL', 'DT', 'DD', 'ASIDE', 'DETAILS', 'SUMMARY']);
const SKIP = ['header-anchor', 'lt-code-head', 'footnote-backref', 'lt-props'];
const len = (s) => [...s].length;
const pad = (s, w, a) => {
  const n = Math.max(0, w - len(s));
  return a === 'right' ? ' '.repeat(n) + s : a === 'center' ? ' '.repeat(n >> 1) + s + ' '.repeat(n - (n >> 1)) : s + ' '.repeat(n);
};
const indent = (s) => s.replace(/\n$/, '').split('\n').map((l) => (l ? `    ${l}` : '')).join('\n');
const prefix = (s, first, rest) => s.split('\n').map((l, i) => (i ? rest : first) + l).join('\n');

function inl(n, o) {
  if (n.nodeType === 3) return n.nodeValue.replace(/[ \t\r\n]+/g, ' ');
  if (n.nodeType !== 1) return '';
  const t = n.tagName;
  if (SKIP.some((c) => n.classList.contains(c))) return '';
  if (t === 'BR') return '\n';
  if (t === 'IMG') { o.images++; return n.getAttribute('alt') || ''; }
  if (t === 'INPUT') return n.hasAttribute('checked') ? '[x] ' : '[ ] ';
  let s = [...n.childNodes].map((k) => inl(k, o)).join('');
  if (t === 'A') {
    const href = n.getAttribute('href') || '';
    if (/^(?:https?:|mailto:)/i.test(href) && href.replace(/^mailto:/i, '') !== s.trim()) s += ` (${href})`;
  }
  return s;
}

function flow(n, o, sep) {
  const out = [];
  let run = '';
  const flush = () => {
    const s = run.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').trim();
    if (s) out.push(s);
    run = '';
  };
  for (const c of n.childNodes) {
    if (c.nodeType === 1 && BLOCK.has(c.tagName)) { flush(); const b = block(c, o); if (b) out.push(b); } else run += inl(c, o);
  }
  flush();
  return out.join(sep);
}

function table(t, o) {
  const rows = [...t.rows].map((r) => [...r.cells].map((c) => ({
    s: inl(c, o).replace(/\s+/g, ' ').trim(),
    a: c.getAttribute('align') || (/text-align:\s*(\w+)/.exec(c.getAttribute('style') || '') || [])[1] || 'left',
  })));
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const w = Array.from({ length: cols }, (_, i) => Math.max(1, ...rows.map((r) => (r[i] ? len(r[i].s) : 0))));
  const out = rows.map((r) => w.map((x, i) => pad(r[i] ? r[i].s : '', x, r[i] ? r[i].a : 'left')).join('  ').replace(/\s+$/, ''));
  if (t.tHead && t.tHead.rows.length) out.splice(t.tHead.rows.length, 0, w.map((x) => '-'.repeat(x)).join('  '));
  return out.join('\n');
}

function block(n, o) {
  const t = n.tagName, c = n.classList;
  if (SKIP.some((k) => c.contains(k))) return '';
  if (c.contains('lt-mermaid')) { o.diagrams++; const code = n.querySelector('code'); return code ? indent(code.textContent) : ''; }
  if (c.contains('lv-math')) return inl(n, o).trim();
  if (t === 'PRE') return indent((n.querySelector('code') || n).textContent);
  if (t === 'HR') return '-----';
  if (t === 'TABLE') return table(n, o);
  if (/^H[1-6]$/.test(t)) {
    const s = inl(n, o).replace(/\s+/g, ' ').trim();
    return t === 'H1' ? `${s}\n${'='.repeat(len(s))}` : t === 'H2' ? `${s}\n${'-'.repeat(len(s))}` : s;
  }
  if (t === 'UL' || t === 'OL') {
    let k = Number(n.getAttribute('start')) || 1;
    return [...n.children].filter((li) => li.tagName === 'LI').map((li) => {
      const m = t === 'OL' ? `${k++}. ` : '- ';
      return prefix(flow(li, o, '\n'), m, ' '.repeat(m.length));
    }).join('\n');
  }
  if (t === 'BLOCKQUOTE') return prefix(flow(n, o, '\n\n'), '> ', '> ').replace(/> $/gm, '>');
  return flow(n, o, '\n\n');
}

// -> { text, warnings: [{ kind, message, line, level }] }. Pure apart from the DOM parser; the source text is never changed.
export function plainText(text, opts = {}) {
  const r = render(String(text ?? ''), { profile: opts.profile, anchorStrategy: opts.anchorStrategy });
  const body = new DOMParser().parseFromString(r.html, 'text/html').body, o = { images: 0, diagrams: 0 }, warnings = [];
  const out = flow(body, o, '\n\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  if (o.images) warnings.push({ kind: 'image', message: `${o.images} image${o.images === 1 ? ' is' : 's are'} left out; only the alt text is kept.`, line: 0, level: 'info' });
  if (o.diagrams) warnings.push({ kind: 'mermaid', message: `${o.diagrams} diagram${o.diagrams === 1 ? ' is' : 's are'} exported as source text.`, line: 0, level: 'warn' });
  return { text: out ? `${out}\n` : '', warnings };
}
