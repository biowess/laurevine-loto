// Find / replace bar DOM. Every control runs a registered command.
export function createBar(ctx, S, run) {
  const { h, icon } = ctx.ui;
  const btn = (id, label, kids, cls = '') => h('button', { type: 'button', class: `lv-find-b ${cls}`, title: label, 'aria-label': label, dataset: { cmd: id }, onclick: () => run(id) }, ...kids);
  const q = h('input', { class: 'lv-find-q', type: 'text', placeholder: 'Find', 'aria-label': 'Find', spellcheck: 'false', autocomplete: 'off', list: 'lv-find-hist' });
  const r = h('input', { class: 'lv-find-r', type: 'text', placeholder: 'Replace', 'aria-label': 'Replace with', spellcheck: 'false', autocomplete: 'off' });
  const hist = h('datalist', { id: 'lv-find-hist' });
  const count = h('span', { class: 'lv-find-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const err = h('div', { class: 'lv-find-err', role: 'alert', hidden: true });
  const note = h('div', { class: 'lv-find-note', hidden: true }, 'Replace is unavailable in preview-only mode. Switch to Source or Split.');
  const rep = h('div', { class: 'lv-find-row', hidden: true }, r, btn('find.replace-one', 'Replace', ['Replace'], 'lv-find-t'), btn('find.replace-all', 'Replace All', ['All'], 'lv-find-t'));
  const el = h('div', { class: 'lv-find', role: 'search', 'aria-label': 'Find and replace', hidden: true },
    h('div', { class: 'lv-find-row' },
      btn('find.toggle-replace', 'Toggle Replace', [icon('chevron-right')], 'lv-find-x'), q, count,
      btn('find.toggle-case', 'Match Case', ['Aa'], 'lv-find-t'), btn('find.toggle-word', 'Whole Word', ['ab'], 'lv-find-t'),
      btn('find.toggle-regex', 'Regular Expression', ['.*'], 'lv-find-t'), btn('find.toggle-selection', 'In Selection', [icon('text-select')]),
      btn('edit.find-prev', 'Previous Match', [icon('chevron-up')]), btn('edit.find-next', 'Next Match', [icon('chevron-down')]),
      btn('find.close', 'Close', [icon('x')])),
    rep, note, err, hist);
  const sync = () => {
    el.hidden = !S.open;
    rep.hidden = !S.rrow;
    note.hidden = !S.pv;
    const on = { 'find.toggle-case': S.cs, 'find.toggle-word': S.ww, 'find.toggle-regex': S.rx, 'find.toggle-selection': S.sel, 'find.toggle-replace': S.rrow };
    el.querySelectorAll('[data-cmd]').forEach((b) => {
      const c = b.dataset.cmd;
      if (c in on) b.setAttribute(c === 'find.toggle-replace' ? 'aria-expanded' : 'aria-pressed', String(!!on[c]));
      b.disabled = !ctx.commands.canRun(c);
      const cm = ctx.commands.get(c);
      b.dataset.t = b.dataset.t || b.title;
      b.title = b.disabled && cm && cm.reason ? `${b.dataset.t} (${cm.reason})` : b.dataset.t;
    });
    const n = S.matches.length, cur = S.cur;
    count.textContent = S.msg || (!S.q ? '' : S.err ? '' : !n ? 'No results' : `${cur >= 0 ? cur + 1 : '–'} of ${n}${S.trunc ? '+' : ''}`);
    el.classList.toggle('is-none', !!S.q && !n && !S.err);
    err.hidden = !S.err; err.textContent = S.err ? `Invalid expression: ${S.err}` : '';
    q.setAttribute('aria-invalid', String(!!S.err));
  };
  const fillHistory = () => hist.replaceChildren(...S.hist.map((t) => h('option', { value: t })));
  return { el, q, r, sync, fillHistory };
}
