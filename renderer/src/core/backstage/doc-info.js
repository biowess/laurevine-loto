import { formatWhen } from './doc-state.js';
import { problems } from '../links/resolve.js';

const EOL = { lf: 'LF', crlf: 'CRLF', cr: 'CR', mixed: 'Mixed' };
const num = (n) => Number(n).toLocaleString('en-US');

export function fmtSize(n) {
  if (n < 1024) return `${num(n)} bytes`;
  const u = ['KB', 'MB', 'GB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < 2) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]} (${num(n)} bytes)`;
}

// Pure model of the Document Information page. disk: { exists, size, mtimeMs, birthtimeMs } or null; unknown values are '—'.
export function describeInfo({ tab, doc, disk, fm, links, images, profile, index, from, anchors, strategy }) {
  const d = disk && disk.exists ? disk : null, keys = fm.present && !fm.error ? Object.keys(fm.data) : [];
  const p = problems(links, images, { from, index, anchors, strategy });
  return {
    file: [['file-text', 'Name', tab.title], ['folder', 'Full path', tab.path || 'Not saved yet'], ['hard-drive', 'Size', d ? fmtSize(d.size) : '—'],
      ['calendar', 'Created', d && d.birthtimeMs ? formatWhen(d.birthtimeMs) : '—'], ['calendar-clock', 'Modified', d ? formatWhen(d.mtimeMs) : '—']],
    format: [['book-open', 'Markdown dialect', profile.label], ['binary', 'Encoding', doc ? `${String(doc.encoding || 'utf-8').toUpperCase()}${doc.bom ? ' with BOM' : ''}` : '—'], ['corner-down-left', 'Line endings', (doc && EOL[doc.eol]) || '—']],
    front: !fm.present ? 'None' : fm.error ? 'Present, but not simple YAML' : keys.length ? `${keys.length} ${keys.length === 1 ? 'property' : 'properties'}: ${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '…' : ''}` : 'Empty',
    assets: p.assets, broken: index ? p.broken : null,
  };
}
