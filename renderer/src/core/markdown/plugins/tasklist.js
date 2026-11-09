// GFM task lists: `- [ ] item` / `- [x] item` render a checkbox span (inputs are sanitised away); the preview toggles the source.
const RE = /^\[([ xX])\][ \t]+/;

export function tasklistPlugin(md) {
  md.core.ruler.push('tasklist', (s) => {
    const tk = s.tokens;
    for (let i = 2; i < tk.length; i++) {
      const t = tk[i], c = t.children && t.children[0], li = tk[i - 2];
      if (t.type !== 'inline' || li.type !== 'list_item_open' || tk[i - 1].type !== 'paragraph_open' || !c || c.type !== 'text') continue;
      const m = RE.exec(c.content);
      if (!m) continue;
      c.content = c.content.slice(m[0].length);
      const on = m[1] !== ' ', box = new s.Token('html_inline', '', 0);
      box.content = `<span class="lt-task" role="checkbox" tabindex="0" aria-checked="${on}" aria-label="${on ? 'Completed' : 'Not completed'} task"></span>`;
      t.children.unshift(box);
      li.attrJoin('class', 'lt-task-item');
      for (let j = i - 3; j >= 0; j--) {
        if (tk[j].level < li.level && /_list_open$/.test(tk[j].type)) { tk[j].attrJoin('class', 'lt-task-list'); break; }
      }
    }
  });
}
