const p2 = (n) => String(n).padStart(2, '0');

export const vars = (author, d = new Date()) => ({ title: 'Untitled', author: String(author || '').replace(/[\r\n]+/g, ' '), date: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, time: `${p2(d.getHours())}:${p2(d.getMinutes())}` });
const FM = /^---\n[\s\S]*?\n---(?:\n|$)/;
const swap = (s, v, f) => s.replace(/\{\{(title|author|date|time)\}\}/g, (_, k) => f(v[k]));
const yaml = (x) => x.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
export function fill(text, v) {
  const fm = (FM.exec(text) || [''])[0];
  return swap(fm, v, yaml) + swap(text.slice(fm.length), v, (x) => x);
}
export const firstLines = (text, n = 18) => text.split('\n').slice(0, n).join('\n');

// Caret goes below the first heading (past one blank line); end of text when there is none.
export function caretFor(text) {
  const m = /^# .*$/m.exec(text);
  if (!m) return text.length;
  const i = m.index + m[0].length;
  return Math.min(text.length, i + (text[i + 1] === '\n' ? 2 : 1));
}

export const categories = (items) => ['All', ...new Set(items.map((t) => t.category))];
export function filterTemplates(items, q, cat) {
  const s = String(q || '').trim().toLowerCase();
  return items.filter((t) => (!cat || cat === 'All' || t.category === cat) && (!s || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(s)));
}

export function pushRecent(csv, id) {
  const a = [id, ...String(csv || '').split(',').map((s) => s.trim()).filter((s) => s && s !== id)].slice(0, 8);
  while (a.join(',').length > 400) a.pop();
  return a.join(',');
}
