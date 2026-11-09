// Definition lists: a term line followed by one or more `: definition` lines (inline content only; lazy continuation lines join the definition).
const DEF = /^:[ \t]+(\S.*)$/;
const text = (s, n) => s.src.slice(s.bMarks[n] + s.tShift[n], s.eMarks[n]);
const isDef = (s, n, end) => n < end && s.sCount[n] - s.blkIndent < 4 && DEF.test(text(s, n));
const isTerm = (s, n, end) => n < end && !s.isEmpty(n) && s.sCount[n] - s.blkIndent < 4 && !DEF.test(text(s, n)) && isDef(s, n + 1, end);

function rule(s, start, end, silent) {
  if (!isTerm(s, start, end)) return false;
  if (silent) return true;
  const item = (tag, a, b, content) => {
    s.push(`${tag}_open`, tag, 1).map = [a, b];
    const t = s.push('inline', '', 0);
    t.map = [a, b];
    t.content = content;
    t.children = [];
    s.push(`${tag}_close`, tag, -1);
  };
  const open = s.push('dl_open', 'dl', 1);
  open.map = [start, start];
  let at = start;
  for (;;) {
    item('dt', at, at + 1, text(s, at).trim());
    at++;
    while (isDef(s, at, end)) {
      let body = DEF.exec(text(s, at))[1].trim();
      const a = at++;
      while (at < end && !s.isEmpty(at) && !isDef(s, at, end) && !isTerm(s, at, end)) body += '\n' + text(s, at++).trim();
      item('dd', a, at, body);
    }
    let n = at;
    while (n < end && s.isEmpty(n)) n++;
    if (!isTerm(s, n, end)) break;
    at = n;
  }
  s.push('dl_close', 'dl', -1);
  open.map[1] = at;
  s.line = at;
  return true;
}

export const deflistPlugin = (md) => md.block.ruler.before('paragraph', 'deflist', rule, { alt: ['paragraph'] });
