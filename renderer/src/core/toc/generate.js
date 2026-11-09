import { createSlugger } from '../markdown/slug.js';
import { buildNodes } from '../outline/model.js';

export const TOC_DEFAULTS = Object.freeze({
  title: '', titleLevel: 2, levels: [1, 2, 3, 4, 5, 6], startLevel: 0, maxDepth: 6, nested: true,
  numbers: false, links: true, style: 'bullet', includeContainer: false,
});

const lv = (v) => Math.min(6, Math.max(1, v | 0));
const esc = (s) => s.replace(/[[\]\\]/g, '\\$&');

// Ids as the renderer would assign them (every heading counts for duplicates); kept when all are present.
export function withIds(hs, strategy) {
  if (hs.every((h) => h.id != null)) return hs;
  const s = createSlugger(strategy);
  return hs.map((h) => ({ ...h, id: s.slug(h.text || 'section') }));
}

// headings: [{level, text, line?, id?, synthetic?}] in document order -> Markdown (title + list of links).
// options: title, titleLevel, levels (array of 1-6), startLevel (0 = shallowest kept), maxDepth, nested, numbers, links,
// style (bullet|numbered|none), includeContainer + containerLine (the heading holding the TOC), strategy (anchor strategy).
export function generateToc(headings, options = {}) {
  const o = { ...TOC_DEFAULTS, ...options };
  const set = new Set((Array.isArray(o.levels) ? o.levels : TOC_DEFAULTS.levels).map(Number).filter((n) => n >= 1 && n <= 6));
  const all = withIds(headings, o.strategy);
  let cont = -1;
  if (!o.includeContainer && o.containerLine != null) all.forEach((h, i) => { if (!h.synthetic && h.line < o.containerLine) cont = i; });
  let hs = all.filter((h, i) => !h.synthetic && i !== cont && set.has(h.level));
  const start = o.startLevel > 0 ? lv(o.startLevel) : Math.min(...hs.map((h) => h.level));
  hs = hs.filter((h) => h.level >= start && h.level < start + Math.max(1, o.maxDepth | 0));
  const style = ['bullet', 'numbered', 'none'].includes(o.style) ? o.style : 'bullet', nums = [];
  const lines = buildNodes(hs).map((n, k) => {
    nums.length = n.depth + 1;
    nums[n.depth] = (nums[n.depth] || 0) + 1;
    const d = o.nested ? n.depth : 0, txt = (o.numbers ? `${nums.join('.')} ` : '') + n.text;
    const lab = o.links ? `[${esc(txt)}](#${hs[n.i].id})` : esc(txt);
    if (style === 'none') return '&emsp;'.repeat(d) + lab;
    if (style === 'numbered') return `${'    '.repeat(d)}${o.nested ? nums[n.depth] : k + 1}. ${lab}`;
    return `${'  '.repeat(d)}- ${lab}`;
  });
  const list = lines.join(style === 'none' ? '  \n' : '\n');
  const title = String(o.title || '').replace(/[\r\n]+/g, ' ').trim();
  const head = title ? `${'#'.repeat(lv(o.titleLevel))} ${title}` : '';
  return head && list ? `${head}\n\n${list}` : head || list;
}
