import { pageMm } from '../../../../shared/export-config.js';
import { esc } from './document.js';

const RTL = /^(ar|he|fa|ur|ps|sd|yi|dv|ug)(-|$)/i;
const LAYOUT = { editorial: 'centered', academic: 'centered', scientific: 'left', minimal: 'left', 'modern-report': 'band', magazine: 'band', technical: 'left', classic: 'framed', thesis: 'centered' };
const VAR = { decoration: '--dc', accent: '--ac', heading: '--hd', divider: '--dv' };
const ORN = { fleuron: '\\2766', stars: '\\2217\\00a0\\00a0\\2217\\00a0\\00a0\\2217', diamond: '\\25C6', dots: '\\00B7\\00a0\\00a0\\00B7\\00a0\\00a0\\00B7' };

export const isRtl = (c) => c.page.direction === 'rtl' || (c.page.direction === 'auto' && RTL.test(c.metadata.language));
export const coverLayout = (c) => (c.cover.layout === 'auto' ? LAYOUT[c.template] || 'centered' : c.cover.layout);
const dims = (c) => { const [w, h] = pageMm(c.page); return c.page.orientation === 'landscape' ? [h, w] : [w, h]; };
const str = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v : '');

// Cover fields: override field > ExportConfig metadata > frontmatter of the first document.
export function coverModel(c, fm, base) {
  const o = c.cover;
  return { title: o.title || base.title, subtitle: o.subtitle || str(fm.subtitle), author: o.author || base.author, date: o.date || c.metadata.date || str(fm.date),
    organisation: o.organisation || str(fm.organisation || fm.organization || fm.org), logo: o.logo, layout: coverLayout(c), dir: c.page.direction };
}

export function coverCss(c) {
  const [, h] = dims(c), m = c.page.margins;
  return `.lv-cover{min-height:${(h - m.top - m.bottom - 6).toFixed(1)}mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:.6em;break-after:page}
.lv-cover .lv-sub{font-size:1.3em;color:var(--t2);margin:0}.lv-cover .lv-org{letter-spacing:.08em;text-transform:uppercase;font-size:.9em;color:var(--t2);margin:0}
.lv-cover .lv-logo{max-width:40mm;max-height:30mm;object-fit:contain;margin-bottom:1.2em}
.lv-cv-left{align-items:flex-start;text-align:start;justify-content:flex-end;padding-bottom:20mm}.lv-cv-left .lv-title{border-inline-start:3mm solid var(--ac);padding-inline-start:5mm}
.lv-cv-band .lv-title{align-self:stretch;background:var(--ac);color:var(--bg);padding:.7em .9em;text-align:start}.lv-cv-band{justify-content:flex-start;align-items:stretch;text-align:start;padding-top:25mm}
.lv-cv-framed{border:1.5pt double var(--dv);padding:15mm}`;
}

const xml = (s) => esc(s);

// One page background as SVG (mm user units). edge: 'left'|'right' = physical edge of the side bar.
function svg(c, edge, wm) {
  const [w, h] = dims(c), { decor: d, watermark: k, palette: p } = c, col = p[d.colour], o = [];
  const b = d.border, i = b.inset, bw = b.width, bc = b.color || p.divider;
  const rect = (x, y, sw, dash, cap = '') => `<rect x="${x}" y="${y}" width="${w - 2 * x}" height="${h - 2 * y}" fill="none" stroke="${bc}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${cap}/>`;
  if (b.style === 'solid') o.push(rect(i, i, bw));
  if (b.style === 'double') o.push(rect(i, i, bw), rect(i + bw * 3, i + bw * 3, bw));
  if (b.style === 'dashed') o.push(rect(i, i, bw, `${bw * 4} ${bw * 2}`));
  if (b.style === 'dotted') o.push(rect(i, i, bw, `0 ${bw * 2}`, ' stroke-linecap="round"'));
  if (d.corners) {
    const g = b.style === 'none' ? 8 : i + 3, s = 14;
    for (const [x, y, sx, sy] of [[g, g, 1, 1], [w - g, g, -1, 1], [g, h - g, 1, -1], [w - g, h - g, -1, -1]]) o.push(`<path d="M${x} ${y + sy * s}V${y}H${x + sx * s}" fill="none" stroke="${col}" stroke-width=".6"/><circle cx="${x + sx * 3}" cy="${y + sy * 3}" r="1.2" fill="${col}"/>`);
  }
  if (d.accentBar) o.push(`<rect width="${w}" height="6" fill="${col}"/>`);
  if (d.sideBar) o.push(`<rect x="${edge === 'left' ? 0 : w - 5}" width="5" height="${h}" fill="${col}"/>`);
  if (wm) {
    const [px, py] = { centre: [.5, .5], top: [.5, .22], bottom: [.5, .78], start: [edge === 'left' ? .2 : .8, .5], end: [edge === 'left' ? .8 : .2, .5] }[k.position], x = w * px, y = h * py, bw2 = w * k.size / 100;
    const rot = `transform="rotate(${k.angle} ${x} ${y})" opacity="${k.opacity}"`;
    if (k.kind === 'image' && k.image) o.push(`<image href="${k.image}" x="${x - bw2 / 2}" y="${y - bw2 / 2}" width="${bw2}" height="${bw2}" preserveAspectRatio="xMidYMid meet" ${rot}/>`);
    else if (k.kind === 'text' && k.text) o.push(`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="${Math.min(bw2 / Math.max(1, k.text.length * .6), w / 4).toFixed(2)}" fill="${k.color || p.text}" ${rot}>${xml(k.text)}</text>`);
  }
  return o.length ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">${o.join('')}</svg>` : '';
}

// Page-level decorations, watermark and ornaments between top-level sections; pages follow the text direction.
export function decorCss(c) {
  const d = c.decor, k = c.watermark, rtl = isRtl(c), face = c.page.facing;
  const bg = (s) => `background-image:url("data:image/svg+xml,${encodeURIComponent(s)}");background-size:100% 100%;background-repeat:no-repeat`;
  const bar = d.sideBar || d.corners || d.accentBar || d.border.style !== 'none';
  const out = [];
  if (rtl) out.push('html[dir=rtl] .pagedjs_pages{direction:rtl}');
  if (bar || k.on) {
    const start = rtl ? 'right' : 'left', end = rtl ? 'left' : 'right', rec = rtl ? ':left' : ':right', ver = rtl ? ':right' : ':left';
    const edgeR = face ? end : start, edgeV = face ? start : end, wmOn = k.on;
    const page = (sel, edge, wm) => { const s = svg(c, edge, wm); return s ? `@page${sel}{${bg(s)}}` : ''; };
    out.push(face ? page(rec, edgeR, wmOn) + page(ver, edgeV, wmOn) : page('', edgeR, wmOn));
    if (wmOn && k.skipFirst) out.push(page(':first', edgeR, false));
  }
  if (d.divider !== 'none') {
    const v = VAR[d.colour];
    out.push(d.divider === 'rule' ? `.lv-orn{display:block;width:30%;margin:0 auto .8em;border-top:.75pt solid var(${v});break-after:avoid}` : `.lv-orn::before{content:"${ORN[d.divider]}";display:block;text-align:center;color:var(${v});font-size:.7em;letter-spacing:.3em;margin-bottom:.6em;font-weight:400;font-style:normal}`);
  }
  return out.join('\n');
}
