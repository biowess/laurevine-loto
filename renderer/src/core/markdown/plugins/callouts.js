// Callouts: `> [!TYPE][+|-] Title` turns the blockquote into a div (or a details element when foldable: + open, - closed).
const TYPES = {
  note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution', info: 'Info',
  success: 'Success', question: 'Question', danger: 'Danger', bug: 'Bug', example: 'Example', quote: 'Quote',
};
const HEAD = /^\[!([A-Za-z]+)\]([+-]?)[ \t]*([^\n]*)/;

export function calloutsPlugin(md) {
  md.core.ruler.after('block', 'callouts', (state) => {
    const tk = state.tokens;
    for (let i = 0; i < tk.length; i++) {
      if (tk[i].type !== 'blockquote_open' || !tk[i + 1] || tk[i + 1].type !== 'paragraph_open' || !tk[i + 2] || tk[i + 2].type !== 'inline') continue;
      const inl = tk[i + 2], m = HEAD.exec(inl.content), type = m && m[1].toLowerCase();
      if (!m || !Object.hasOwn(TYPES, type)) continue;
      let j = i + 1;
      while (tk[j] && !(tk[j].type === 'blockquote_close' && tk[j].level === tk[i].level)) j++;
      if (!tk[j]) continue;
      const fold = m[2], rest = inl.content.slice(m[0].length).replace(/^\n/, ''), tag = fold ? 'details' : 'div';
      tk[i].tag = tk[j].tag = tag;
      tk[i].attrJoin('class', `lt-callout lt-callout-${type}`);
      tk[i].attrSet('data-callout', type);
      if (fold === '+') tk[i].attrSet('open', '');
      const mk = (t, g, n) => { const x = new state.Token(t, g, n); x.block = true; return x; };
      const sub = fold ? 'summary' : 'div', head = mk('callout_title_open', sub, 1), ti = new state.Token('inline', '', 0);
      head.attrSet('class', 'lt-callout-title');
      ti.content = m[3].trim() || TYPES[type];
      ti.children = [];
      ti.level = tk[i].level + 1;
      const parts = [head, ti, mk('callout_title_close', sub, -1)];
      if (rest.trim()) { inl.content = rest; tk.splice(i + 1, 0, ...parts); } else tk.splice(i + 1, 3, ...parts);
    }
  });
}
