import { katexCss, docInput } from '../publish/index.js';
import { writeExport, reveal } from '../../services/doc-client.js';
import { destDir, stemFor } from './dest.js';

const NS = 'http://www.w3.org/2000/svg';
const LABEL = { diagram: 'diagram', equation: 'equation', code: 'code block' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dark = () => document.documentElement.dataset.theme === 'dark';

export function targetOf(el) {
  if (!el || !el.closest) return null;
  const mm = el.closest('.lt-mermaid'), svg = mm && mm.querySelector('svg');
  if (svg) return { kind: 'diagram', node: svg };
  const eq = el.closest('.lv-math');
  if (eq && eq.querySelector('.katex')) return { kind: 'equation', node: eq.querySelector('.katex') };
  const pre = el.closest('pre');
  return pre ? { kind: 'code', node: pre } : null;
}

async function build({ kind, node }) {
  if (kind === 'diagram') {
    const vb = node.viewBox && node.viewBox.baseVal, r = node.getBoundingClientRect();
    const w = Math.ceil(vb && vb.width ? vb.width : r.width) || 1, h = Math.ceil(vb && vb.height ? vb.height : r.height) || 1, bg = dark() ? '#1e1e1e' : '#ffffff';
    const c = node.cloneNode(true);
    c.setAttribute('xmlns', NS);
    c.setAttribute('width', w);
    c.setAttribute('height', h);
    c.setAttribute('style', `background:${bg}`);
    return { svg: new XMLSerializer().serializeToString(c), w, h, bg };
  }
  if (kind === 'equation') {
    const r = node.getBoundingClientRect(), w = Math.ceil(r.width) + 28, h = Math.ceil(r.height) + 24, css = await katexCss();
    const html = new XMLSerializer().serializeToString(node.cloneNode(true));
    const svg = `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#ffffff"/><foreignObject x="12" y="12" width="${w - 24}" height="${h - 24}"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#000;font-size:${getComputedStyle(node).fontSize}"><style>${esc(css)}</style>${html}</div></foreignObject></svg>`;
    return { svg, w, h, bg: '#ffffff' };
  }
  const text = (node.querySelector('code') || node).textContent.replace(/\t/g, '    ').replace(/\n$/, '');
  const lines = text.split('\n').slice(0, 2000), pad = 16, lh = 18;
  const w = Math.ceil(Math.max(1, ...lines.map((l) => [...l].length)) * 8.4) + pad * 2, h = lines.length * lh + pad * 2;
  const rows = lines.map((l, i) => `<text x="${pad}" y="${pad + 14 + i * lh}" xml:space="preserve">${esc(l)}</text>`).join('');
  return { svg: `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" rx="6" fill="#f6f8fa"/><g font-family="Consolas, Menlo, 'DejaVu Sans Mono', monospace" font-size="14" fill="#1f2328">${rows}</g></svg>`, w, h, bg: '#f6f8fa' };
}

async function toPng({ svg, w, h, bg }) {
  const scale = Math.max(1, Math.min(3, 8000 / Math.max(w, h)));
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('The picture could not be rendered.'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * scale);
  cv.height = Math.round(h * scale);
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const url = cv.toDataURL('image/png');
  return url.slice(url.indexOf(',') + 1);
}

export async function exportDiagram(ctx, target, format) {
  const { ui } = ctx, d = docInput(ctx), label = LABEL[target.kind];
  try {
    const b = await build(target);
    const entry = format === 'svg' ? { name: 'export.svg', text: b.svg } : { name: 'export.png', data: await toPng(b) };
    const stem = d ? stemFor(d) : 'Document';
    const r = await writeExport({ kind: 'file', ext: format, defaultName: `${stem} ${label}`, dir: destDir(d ? d.baseDir : ''), entries: [entry] });
    if (r.canceled) { ui.toast(`${format.toUpperCase()} export canceled.`); return null; }
    const t = ui.toast(`${label[0].toUpperCase()}${label.slice(1)} saved as ${format.toUpperCase()}.`, { timeout: 10000 });
    t.append(ui.h('button', { class: 'lv-toast__btn', onclick: () => { t.remove(); reveal(r.path).catch(() => {}); } }, 'Show in Folder'));
    return r;
  } catch (err) {
    ui.toast(`Could not export the ${label}: ${err.message}`, { timeout: 8000 });
    return null;
  }
}
