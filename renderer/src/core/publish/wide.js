// Promotes wide blocks to span all columns: `<!-- laurevine:span -->` marker (lt-span) spans the next block; automatic by thresholds in ExportConfig.columns.
import { pageMm } from '../../../../shared/export-config.js';

const PX = 0.2646;

export function columnWidthMm(cfg) {
  const k = cfg.columns, g = cfg.page, [a, b] = pageMm(g), w = g.orientation === 'landscape' ? Math.max(a, b) : Math.min(a, b);
  return (w - g.margins.left - g.margins.right - k.gap * cfg.typography.fontSize * PX * (k.count - 1)) / k.count;
}

const figW = (el) => {
  const s = el.matches('svg') ? el : el.querySelector('svg'), i = el.matches('img') ? el : el.querySelector('img');
  const v = s && (s.getAttribute('viewBox') || '').split(/[\s,]+/)[2], w = +(v || (i && i.getAttribute('width')) || 0);
  return w * PX;
};

export function markWide(root, cfg) {
  const k = cfg.columns;
  if (k.count < 2) return;
  for (const m of root.querySelectorAll('.lt-span')) {
    const t = m.nextElementSibling;
    if (t) t.classList.add('lv-span');
    m.remove();
  }
  if (!k.autoSpan) return;
  const cw = columnWidthMm(cfg), ch = cfg.typography.fontSize * cfg.typography.codeSize * 0.6 * PX;
  const fit = k.maxCodeChars || Math.floor(cw / ch);
  for (const t of root.querySelectorAll('table')) {
    const n = Math.max(0, ...[...t.rows].map((r) => r.cells.length));
    if (n * k.minColumnWidthForTable > cw) t.classList.add('lv-span');
  }
  for (const p of root.querySelectorAll('pre')) {
    if (Math.max(0, ...p.textContent.split('\n').map((l) => l.length)) > fit) (p.closest('.lt-code') || p).classList.add('lv-span');
  }
  for (const f of root.querySelectorAll('figure,p>img:only-child,svg,.lv-mermaid')) {
    const el = f.matches('img') ? f.parentElement : f, w = figW(f);
    if (w ? w > cw : cw < k.minColumnWidthForFigure) el.classList.add('lv-span');
  }
}
