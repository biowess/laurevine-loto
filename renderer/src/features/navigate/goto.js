// Go to Line (Ctrl+G): "line" or "line:column"; validates against the document, scrolls and flashes the line.
import { openDialog } from '../../ui/kit/dialog.js';
import { parseGoto } from '../../core/text/goto.js';

export function registerGoto(ctx) {
  const { commands, ui: { h }, services: { documents } } = ctx;
  const view = () => { const v = documents.editorRun('view'); return v && v.dom.offsetParent ? v : null; };

  function jump(v, { line, col }) {
    const l = v.state.doc.line(line), pos = l.from + col - 1;
    v.dispatch({ selection: { anchor: pos }, effects: v.constructor.scrollIntoView(pos, { x: 'center', y: 'center' }), userEvent: 'select.goto' });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      v.focus();
      const n = v.domAtPos(l.from).node, e = n.nodeType === 1 ? n : n.parentElement, dom = e && e.closest('.cm-line');
      if (dom) { dom.classList.remove('nv-flash'); void dom.offsetWidth; dom.classList.add('nv-flash'); }
    }));
  }

  function open() {
    const v = view();
    if (!v) return;
    const d = v.state.doc, cur = d.lineAt(v.state.selection.main.head).number, lenOf = (n) => d.line(n).length;
    const input = h('input', { class: 'nv-goto-in', type: 'text', inputmode: 'numeric', placeholder: String(cur), 'aria-label': 'Line or line:column', spellcheck: 'false', autocomplete: 'off' });
    const hint = h('div', { class: 'nv-goto-hint', 'aria-live': 'polite' });
    const check = () => {
      const s = input.value.trim(), m = /^(\d+)/.exec(s), ln = m && +m[1] >= 1 && +m[1] <= d.lines ? +m[1] : cur;
      const r = s ? parseGoto(s, d.lines, lenOf) : null, bad = r && r.error;
      hint.textContent = bad || `Line 1–${d.lines}, or line:column (column 1–${lenOf(ln) + 1} on line ${ln})`;
      hint.classList.toggle('is-err', !!bad);
      input.setAttribute('aria-invalid', String(!!bad));
      return r;
    };
    const submit = () => {
      const r = check();
      if (!r) { hint.textContent = 'Enter a line number or line:column'; hint.classList.add('is-err'); return false; }
      if (r.error) return false;
      jump(v, r);
    };
    const dlg = openDialog({
      title: 'Go to Line', icon: 'corner-down-right', width: 400, focus: '.nv-goto-in', body: [input, hint],
      buttons: [{ label: 'Cancel' }, { label: 'Go', primary: true, onClick: submit }],
    });
    check();
    input.addEventListener('input', check);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (submit() !== false) dlg.close('Go'); } });
  }

  commands.register({ id: 'edit.goto-line', title: 'Go to Line', icon: 'corner-down-right', group: 'Find', shortcut: 'Ctrl+G', enabled: () => !!view(), reason: 'Needs an open document in Source or Split mode', run: open });
  document.addEventListener('keydown', (e) => {
    if (e.isComposing || e.altKey || e.shiftKey || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'g') return;
    const ed = document.querySelector('.md-editor');
    if (!ed || !ed.contains(e.target) || !commands.canRun('edit.goto-line')) return;
    e.preventDefault(); e.stopPropagation(); commands.execute('edit.goto-line');
  }, true);
}
