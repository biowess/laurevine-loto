import { pageMm } from './export-config.js';
import { normHex } from './palette.js';

export const WORD_FONT = Object.freeze({ serif: 'Georgia', classic: 'Palatino Linotype', sans: 'Calibri', mono: 'Consolas' });

// Plain style spec for the DOCX reference document, derived from an ExportConfig (light palettes only: Word pages stay white).
export function styleFromConfig(cfg) {
  const t = cfg.typography, p = cfg.palette, r = t.roles || {}, g = cfg.page, [w, h] = pageMm(g), m = g.margins || {};
  return {
    body: (r.body && r.body.font) || WORD_FONT[t.bodyFont] || WORD_FONT.serif,
    heading: (r.heading && r.heading.font) || WORD_FONT[t.headingFont] || WORD_FONT.sans,
    mono: WORD_FONT.mono, sizePx: t.fontSize, scale: t.headingScale,
    text: p.text, heading_color: p.heading, link: p.link, muted: p.textSecondary,
    page: { w, h, landscape: g.orientation === 'landscape', top: m.top, right: m.right, bottom: m.bottom, left: m.left },
  };
}

const FONT = /^[A-Za-z0-9][A-Za-z0-9 .-]{0,59}$/;
const num = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

// Validates and clamps a style spec from the renderer; null when unusable.
export function cleanStyle(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const font = (v, d) => (typeof v === 'string' && FONT.test(v) ? v : d);
  const c = (v) => normHex(v);
  const pg = raw.page && typeof raw.page === 'object' ? raw.page : {};
  return {
    body: font(raw.body, WORD_FONT.serif), heading: font(raw.heading, WORD_FONT.sans), mono: font(raw.mono, WORD_FONT.mono),
    sizePx: num(raw.sizePx, 8, 24, 16), scale: num(raw.scale, 1, 1.6, 1.25),
    text: c(raw.text), heading_color: c(raw.heading_color), link: c(raw.link), muted: c(raw.muted),
    page: { w: num(pg.w, 50, 1500, 210), h: num(pg.h, 50, 1500, 297), landscape: pg.landscape === true, top: num(pg.top, 0, 60, 20), right: num(pg.right, 0, 60, 20), bottom: num(pg.bottom, 0, 60, 20), left: num(pg.left, 0, 60, 20) },
  };
}
