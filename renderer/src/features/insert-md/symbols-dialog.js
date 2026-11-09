// Insert > Symbols: categorised symbol library with search and live preview. Click inserts at the caret and keeps the dialog open.
import { h, $, $$ } from '../../ui/kit/dom.js';
import { symbols as S } from '../../core/text/symbols.js';

export function openSymbolsDialog({ openDialog }, { onPick }) {
  let cat = S.CATEGORIES[0].id, rows = [], cur = null;
  const qi = h('input', { id: 'symQ', class: 'sym-search', placeholder: 'Search by name, keyword or character...', autocomplete: 'off', 'aria-label': 'Search symbols' });
  const cats = h('div', { class: 'sym-cats' }, S.CATEGORIES.map((c) => h('div', { class: 'sym-cat' + (c.id === cat ? ' is-on' : ''), 'data-c': c.id, role: 'button', tabindex: 0 },
    h('span', { class: 'sym-cat-icon' }, c.icon), h('span', { class: 'sym-cat-label' }, c.label), h('span', { class: 'sym-cat-count' }, String(c.symbols.length)))));
  const grid = h('div', { class: 'sym-grid' }), wrap = h('div', { class: 'sym-grid-wrap' }, grid);
  const pBox = h('div', { class: 'sym-preview-box' }), pName = h('div', { class: 'sym-preview-name' }), pCode = h('div', { class: 'sym-preview-code' });
  const body = h('div', {},
    h('div', { class: 'sym-search-row' }, qi, h('span', { class: 'sym-hint' }, 'Click a symbol to insert it at the cursor.')),
    h('div', { class: 'sym-main' }, cats, wrap),
    h('div', { class: 'sym-footer' }, pBox, h('div', { class: 'sym-preview-info' }, pName, pCode)));

  const setPreview = (s) => {
    if (!s) { pBox.textContent = ''; pName.textContent = 'No symbol selected'; pCode.textContent = ''; return; }
    cur = s; pBox.textContent = S.label(s); pName.textContent = s.n;
    const tags = (s.k || '').trim().split(/\s+/).filter(Boolean).join(', ');
    pCode.textContent = S.hex(s.c) + (tags ? ' · ' + tags : '');
  };
  const show = () => {
    const q = qi.value.trim();
    rows = q ? S.search(q, cat) : (S.get(cat) || { symbols: [] }).symbols;
    if (q && !rows.length) rows = S.search(q);
    if (!rows.length) { grid.replaceChildren(h('div', { class: 'sym-empty' }, 'No symbols match')); setPreview(null); return; }
    grid.replaceChildren(...rows.map((s, i) => h('button', { type: 'button', class: 'sym-btn', 'data-i': i, 'aria-label': s.n }, S.label(s))));
    setPreview(cur && rows.includes(cur) ? cur : rows[0]);
  };

  cats.addEventListener('click', (e) => {
    const c = e.target.closest('.sym-cat'); if (!c) return;
    cat = c.dataset.c; $$('.sym-cat', cats).forEach((x) => x.classList.toggle('is-on', x === c));
    qi.value = ''; show(); wrap.scrollTop = 0;
  });
  cats.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } });
  qi.addEventListener('input', () => { show(); wrap.scrollTop = 0; });
  grid.addEventListener('mouseover', (e) => { const b = e.target.closest('.sym-btn'); if (b && rows[b.dataset.i]) setPreview(rows[b.dataset.i]); });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.sym-btn'), s = b && rows[b.dataset.i]; if (!s) return;
    setPreview(s);
    const keep = api.el.contains(document.activeElement) ? document.activeElement : null;
    onPick(s.c);
    if (keep) keep.focus();
  });
  show();
  const api = openDialog({ title: 'Symbols', icon: 'omega', width: 880, cls: 'dlg--symbols', body, focus: '#symQ', buttons: [] });
}
