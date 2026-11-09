// Pure: GFM table text -> {header[],align[],rows[][],range}. Cells hold literal text: `|` unescaped, <br> as "\n".
const DELIM = /^:?-+:?$/;

export function splitRow(line) {
  const s = line.trim(), cells = [];
  let cur = '', sep = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    sep = false;
    if (c === '\\' && i + 1 < s.length) { cur += s[i + 1] === '|' ? '|' : c + s[i + 1]; i++; }
    else if (c === '`') {
      let n = 1;
      while (s[i + n] === '`') n++;
      const run = '`'.repeat(n);
      let j = i + n, end = -1;
      while ((j = s.indexOf(run, j)) !== -1) {
        let m = n;
        while (s[j + m] === '`') m++;
        if (m === n) { end = j; break; }
        j += m;
      }
      if (end < 0) { cur += run; i += n - 1; }
      else { cur += s.slice(i, end + n).replace(/\\\|/g, '|'); i = end + n - 1; }
    } else if (c === '|') { cells.push(cur); cur = ''; sep = true; }
    else cur += c;
  }
  cells.push(cur);
  if (s.startsWith('|')) cells.shift();
  if (sep) cells.pop();
  return cells.map((x) => x.trim().replace(/<br\s*\/?>/gi, '\n'));
}

export function isDelimiter(line) {
  if (!/-/.test(line) || !/^[\s|:-]+$/.test(line)) return false;
  const c = splitRow(line);
  return c.length > 0 && c.every((x) => x === '' || DELIM.test(x)) && (c.length > 1 || line.includes('|'));
}

const alignOf = (c) => (!c ? null : c[0] === ':' ? (c.endsWith(':') && c.length > 1 ? 'center' : 'left') : c.endsWith(':') ? 'right' : null);

export function parseTable(text, base = 0) {
  const lines = text.split('\n').filter((l) => l.trim());
  const header = splitRow(lines[0] || ''), delim = splitRow(lines[1] || '');
  const rows = lines.slice(2).map(splitRow);
  const n = Math.max(1, header.length, delim.length, ...rows.map((r) => r.length));
  const pad = (a, f = '') => Array.from({ length: n }, (_, i) => a[i] ?? f);
  return { header: pad(header), align: pad(delim.map(alignOf), null), rows: rows.map((r) => pad(r)), range: { from: base, to: base + text.length } };
}
