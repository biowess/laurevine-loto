// Problems panel: search and filters, grouped virtual list (fixed row height), click jumps, Fix buttons.
import { TITLES } from '../../core/problems/model.js';
import { getProblems, counts, onProblems } from '../../services/problems.js';

const HEAD = new Set(['heading-structure', 'a11y-headings']), RH = 30, SEVL = { error: 'Error', warning: 'Warning', info: 'Info' };
const title = (k) => TITLES[k] || k;

export function createView({ ui: { h } }, S, A) {
  let rows = [], lastA = -1, raf = 0;
  const sel = (label, opts, key) => {
    const s = h('select', { class: 'select', 'aria-label': label }, opts.map(([v, t]) => h('option', { value: v }, t)));
    s.addEventListener('change', () => { S[key] = s.value; build(); });
    return s;
  };
  const q = h('input', { type: 'search', class: 'input pr__q', placeholder: 'Filter problems', 'aria-label': 'Search problems' });
  q.addEventListener('input', () => { S.q = q.value; build(); });
  const sev = sel('Severity', [['', 'All severities'], ['error', 'Errors'], ['warning', 'Warnings'], ['info', 'Info']], 'sev');
  const grp = sel('Rule group', [['', 'All groups'], ...Object.entries(TITLES)], 'group');
  const by = sel('Group by', [['category', 'By category'], ['severity', 'By severity']], 'by');
  const note = h('div', { class: 'pr__n', 'aria-live': 'polite' });
  const sp = h('div', { class: 'pr__sp' }), sc = h('div', { class: 'pr__sc', role: 'list', 'aria-label': 'Problems' }, sp);
  const el = h('div', { class: 'pr' }, h('div', { class: 'pr__bar' }, q, h('div', { class: 'pr__f' }, sev, grp, by)), note, sc);

  function mk(r, y) {
    let e;
    if (r.hd) {
      const x = r.hd;
      e = h('div', { class: 'pr__r pr__hd', role: 'listitem', tabindex: '0', title: x.text, dataset: { key: 'h' + x.line }, style: { paddingLeft: 8 + (x.level - 1) * 14 + 'px' } },
        h('span', { class: 'pr__s' }, 'H' + x.level), h('span', { class: 'pr__m' }, x.text || '(empty heading)'),
        x.n ? h('span', { class: 'pr__l', style: { color: '#b7791f' } }, x.n + (x.n > 1 ? ' issues' : ' issue')) : null, h('span', { class: 'pr__l' }, 'Ln ' + (x.line + 1)));
      e.addEventListener('click', () => A.heading(x));
    } else if (r.head) e = h('div', { class: 'pr__h', role: 'presentation' }, r.head);
    else {
      const p = r.p;
      e = h('div', { class: 'pr__r', role: 'listitem', tabindex: '0', title: p.message, dataset: { key: p.key } },
        h('span', { class: 'pr__s is-' + p.severity }, SEVL[p.severity]), h('span', { class: 'pr__m' }, p.message), h('span', { class: 'pr__l' }, 'Ln ' + p.line),
        p.fix ? h('button', { type: 'button', class: 'btn pr__x', title: p.fix.label, 'aria-label': p.fix.label, onclick: (ev) => { ev.stopPropagation(); A.fix(p); } }, 'Fix') : null);
      e.addEventListener('click', () => A.jump(p));
    }
    e.style.top = y + 'px';
    return e;
  }

  function paint() {
    const a = Math.max(0, Math.floor(sc.scrollTop / RH) - 3);
    if (a === lastA) return;
    lastA = a;
    const n = Math.ceil((sc.clientHeight || 500) / RH) + 7;
    sp.replaceChildren(...rows.slice(a, a + n).map((r, i) => mk(r, (a + i) * RH)));
  }

  function build() {
    const focus = document.activeElement && sc.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const qq = S.q.trim().toLowerCase(), all = getProblems();
    const items = all.filter((p) => (!S.sev || p.severity === S.sev) && (!S.group || p.cat === S.group)
      && (!qq || p.message.toLowerCase().includes(qq) || title(p.cat).toLowerCase().includes(qq) || String(p.line) === qq));
    const bySev = S.by === 'severity', keyOf = bySev ? (p) => p.severity : (p) => p.cat;
    const g = new Map(Object.keys(bySev ? SEVL : TITLES).map((k) => [k, []]));
    for (const p of items) { const k = keyOf(p); if (!g.has(k)) g.set(k, []); g.get(k).push(p); }
    rows = [];
    const hds = S.has && HEAD.has(S.group) && !qq && !S.sev ? A.headings() : [];
    if (hds.length) {
      const n = new Map();
      for (const p of all) if (HEAD.has(p.cat)) n.set(p.line, (n.get(p.line) || 0) + 1);
      rows.push({ head: `Heading outline (${hds.length})` }, ...hds.map((x) => ({ hd: { ...x, n: n.get(x.line + 1) || 0 } })));
    }
    for (const [k, v] of g) if (v.length) rows.push({ head: `${bySev ? SEVL[k] : title(k)} (${v.length})` }, ...v.map((p) => ({ p })));
    const c = counts();
    note.textContent = !S.has ? 'No document open. Open a file to inspect syntax and accessibility issues.' : !all.length ? 'No problems found. Your document passes all active lint checks.' : !items.length ? 'No problems match the filters. Clear the search box or select all severities.'
      : `${items.length} shown · ${c.error} errors, ${c.warning} warnings, ${c.info} info${S.capped ? ` (list limited to the first ${all.length})` : ''}`;

    sp.style.height = rows.length * RH + 'px';
    lastA = -1;
    paint();
    if (focus) { const f = sp.querySelector(`[data-key="${focus}"]`); if (f) f.focus(); }
  }

  sc.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }, { passive: true });
  sc.addEventListener('keydown', (e) => {
    const r = e.target.closest && e.target.closest('.pr__r');
    if (!r) return;
    if (e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.click(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const dn = e.key === 'ArrowDown';
    let n = dn ? r.nextElementSibling : r.previousElementSibling;
    while (n && !n.classList.contains('pr__r')) n = dn ? n.nextElementSibling : n.previousElementSibling;
    if (n) n.focus();
  });
  onProblems(build);

  return {
    el,
    sync() { q.value = S.q; sev.value = S.sev; grp.value = S.group; by.value = S.by; build(); },
    focus() { (sc.querySelector('.pr__r') || q).focus(); },
  };
}
