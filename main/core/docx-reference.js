import { cleanStyle } from '../../shared/docx-style.js';
import { readZip, writeZip } from './zip.js';

const ORDER = ['rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline', 'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing', 'w', 'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath'];
const KID = /<w:([A-Za-z]+)\b[^>]*?\/>|<w:([A-Za-z]+)\b[^>]*>[\s\S]*?<\/w:\2>/g;
const TWIPS = (mm) => Math.round((mm / 25.4) * 1440);

// Replaces font, colour and size inside one style's run properties, keeping schema order.
function setRun(styleXml, { font, color, size }) {
  const m = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(styleXml), kids = new Map();
  if (m) for (const k of m[1].matchAll(KID)) kids.set(k[1] || k[2], k[0]);
  if (font) kids.set('rFonts', `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`);
  if (color) { kids.set('color', `<w:color w:val="${color.slice(1).toUpperCase()}"/>`); }
  if (size) { kids.set('sz', `<w:sz w:val="${size}"/>`); kids.set('szCs', `<w:szCs w:val="${size}"/>`); }
  const known = ORDER.filter((n) => kids.has(n)).map((n) => kids.get(n)), rest = [...kids].filter(([n]) => !ORDER.includes(n)).map(([, v]) => v);
  const rpr = `<w:rPr>${[...known, ...rest].join('')}</w:rPr>`;
  return m ? styleXml.replace(m[0], () => rpr) : styleXml.replace('</w:style>', () => `${rpr}</w:style>`);
}

function patchStyles(xml, st) {
  const half = (px, k = 0) => Math.round(px * 1.5 * (1 + (st.scale - 1) * k));
  const plan = { Normal: { font: st.body, color: st.text, size: half(st.sizePx) } };
  for (const id of ['BodyText', 'FirstParagraph', 'Compact']) plan[id] = { font: st.body, color: st.text };
  [4, 3, 2, 1, 0.4, 0].forEach((k, i) => { plan[`Heading${i + 1}`] = { font: st.heading, color: st.heading_color, size: half(st.sizePx, k) }; });
  plan.Title = { font: st.heading, color: st.heading_color, size: half(st.sizePx, 5) };
  for (const id of ['Subtitle', 'Author', 'Date', 'BlockText', 'Caption', 'ImageCaption', 'TableCaption']) plan[id] = { color: st.muted };
  plan.Hyperlink = { color: st.link };
  plan.VerbatimChar = { font: st.mono };
  plan.SourceCode = { font: st.mono };
  let out = xml;
  for (const [id, props] of Object.entries(plan)) {
    const m = new RegExp(`<w:style\\b[^>]*w:styleId="${id}"[^>]*>[\\s\\S]*?</w:style>`).exec(out);
    if (m) out = out.replace(m[0], () => setRun(m[0], props));
  }
  return out;
}

function patchPage(xml, pg) {
  const [w, h] = pg.landscape ? [pg.h, pg.w] : [pg.w, pg.h];
  return xml
    .replace(/<w:pgSz\b[^>]*\/>/, () => `<w:pgSz w:w="${TWIPS(w)}" w:h="${TWIPS(h)}"${pg.landscape ? ' w:orient="landscape"' : ''}/>`)
    .replace(/<w:pgMar\b[^>]*\/>/, () => `<w:pgMar w:top="${TWIPS(pg.top)}" w:right="${TWIPS(pg.right)}" w:bottom="${TWIPS(pg.bottom)}" w:left="${TWIPS(pg.left)}" w:header="708" w:footer="708" w:gutter="0"/>`);
}

// base: Pandoc's default reference.docx (Buffer); style: spec from shared/docx-style.js. Throws when the archive is not as expected.
export function buildReference(base, rawStyle) {
  const st = cleanStyle(rawStyle);
  if (!st) throw new Error('No usable style.');
  let styled = false;
  const entries = readZip(base).map(([name, data]) => {
    if (name === 'word/styles.xml') { styled = true; return [name, Buffer.from(patchStyles(data.toString('utf8'), st), 'utf8')]; }
    if (name === 'word/document.xml') return [name, Buffer.from(patchPage(data.toString('utf8'), st.page), 'utf8')];
    return [name, data];
  });
  if (!styled) throw new Error('The reference document has no styles.');
  return writeZip(entries);
}
