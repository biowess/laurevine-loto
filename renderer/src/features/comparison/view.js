import { compareLines, fold } from '../../core/diff/compare-rows.js';
import { diffDocument } from '../../core/diff/meta-diff.js';
import { render } from '../../core/markdown/renderer.js';

const ROW = 20, CTX = 3;
const cut = (v, n = 60) => { const s = typeof v === 'string' ? v : JSON.stringify(v) ?? ''; return s.length > n ? s.slice(0, n) + '…' : s; };
const lk = (l) => `${cut(l.text || '', 40)} → ${cut(l.href || '', 60)}`;
const im = (i) => `${cut(i.alt || '', 40)} → ${cut(i.src || '', 60)}`;

export function openComparison(ctx, { title = 'Compare', oldText, newText, oldLabel = 'Original', newLabel = 'Current', edit = {}, restoreLabel, mode, buttons, onState, onClose }) {
  const { h, openDialog, runCommand } = ctx.ui;
  const S = { mode: 'side', ws: false, all: false, cur: -1 };
  let cmp, L = [], items = [], open = new Set(), doc = null, fail = false, ch = [], chBtns = [], last = '', io = null, dead = false;
  const vp = h('div', { class: 'cmp-vp', tabindex: '0', role: 'region', 'aria-label': 'Differences' });
  const rowsEl = h('div', { class: 'cmp-rows' }), spacer = h('div', { class: 'cmp-spacer' }, rowsEl), pv = h('div', { class: 'cmp-pv' });
  const sum = h('div', { class: 'cmp-sum', role: 'status' }), live = h('div', { class: 'cmp-live', 'aria-live': 'polite' });
  const heads = h('div', { class: 'cmp-heads' }, h('div', {}, oldLabel), h('div', {}, newLabel));
  const chHead = h('h3', {}, 'Changes'), chList = h('ul', { class: 'cmp-list', 'aria-label': 'Changes' }), difList = h('ul', { class: 'cmp-list', 'aria-label': 'Other differences' });
  const btn = (id, text, tip) => h('button', { type: 'button', class: 'btn', title: tip || text, dataset: { cmd: id }, onclick: () => runCommand(id) }, text);
  const B = {
    prev: btn('cmp.prev', 'Previous', 'Previous change (Shift+F7)'), next: btn('cmp.next', 'Next', 'Next change (F7)'),
    side: btn('cmp.mode-side', 'Side by side'), inline: btn('cmp.mode-inline', 'Inline'), pv: btn('cmp.mode-preview', 'Rendered preview'),
    ws: btn('cmp.ignore-ws', 'Ignore whitespace'), fold: btn('cmp.fold-toggle', 'Expand unchanged'),
    cl: btn('cmp.copy-left', 'Copy to Left', 'Apply the selected change to the left side'), cr: btn('cmp.copy-right', 'Copy to Right', 'Apply the selected change to the right side'),
    rs: btn('cmp.restore', restoreLabel || 'Restore'), ol: btn('cmp.open-left', 'Open Left'), or: btn('cmp.open-right', 'Open Right'),
  };
  B.cl.hidden = !edit.left; B.cr.hidden = !edit.right; B.rs.hidden = !(restoreLabel && edit.right); B.ol.hidden = !edit.openLeft; B.or.hidden = !edit.openRight;
  pv.hidden = true; vp.append(spacer, pv);

  const num = (v) => h('span', { class: 'cmp-n', 'aria-hidden': 'true' }, String(v ?? ''));
  const sign = (r) => h('span', { class: 'cmp-s', title: r.t === 'del' ? 'Removed' : r.t === 'add' ? 'Added' : '' }, r.t === 'del' ? '−' : r.t === 'add' ? '+' : '');
  const txt = (r) => h('span', { class: 'cmp-t' }, ...(r.words ? r.words.map((p) => (p.t === 'eq' ? p.s : h('mark', {}, p.s))) : [r.text]));
  const cell = (r, n) => (!r ? h('div', { class: 'cmp-c is-pad' })
    : h('div', { class: 'cmp-c' + (r.t === 'del' ? ' is-del' : r.t === 'add' ? ' is-add' : ''), title: r.text.length > 90 ? r.text : '' }, ...n.map(num), sign(r), txt(r)));
  const row = (it) => {
    if (it.gap !== undefined) return h('button', { type: 'button', class: 'cmp-gap', onclick: () => { open.add(it.gap); layout(); } }, `${it.count} unchanged lines — Expand`);
    const x = L[it.i], cls = 'cmp-r' + (x.c !== undefined ? ' is-chg' : '') + (x.c === S.cur ? ' is-cur' : '');
    return S.mode === 'side' ? h('div', { class: cls }, cell(x.l, [x.l && x.l.a]), cell(x.r, [x.r && x.r.b])) : h('div', { class: cls }, cell(x.r, [x.r.a, x.r.b]));
  };
  const paint = () => {
    if (S.mode === 'preview') return;
    const s = Math.max(0, Math.floor(vp.scrollTop / ROW) - 10), e = Math.min(items.length, s + Math.ceil((vp.clientHeight || 600) / ROW) + 20), k = `${s}:${e}:${S.cur}`;
    if (k === last) return;
    last = k;
    rowsEl.style.transform = `translateY(${s * ROW}px)`;
    rowsEl.replaceChildren(...items.slice(s, e).map(row));
  };

  const preview = () => {
    if (io) io.disconnect();
    pv.replaceChildren(); ch = [];
    if (!doc) { pv.append(h('p', { class: 'cmp-none' }, fail ? 'Rendered comparison unavailable.' : 'Analysing…')); return panel(); }
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); const r = render(e.target._t); e.target.innerHTML = r && r.html ? r.html : String(r); } }), { root: vp, rootMargin: '400px' });
    const pc = (b, cls) => { const c = h('div', { class: 'cmp-pc ' + cls }); if (b) { c._t = b.text; io.observe(c); } return c; };
    const blockRow = (b) => {
      const el = h('div', { class: 'cmp-pr' + (b.type !== 'same' ? ' is-chg' : '') }, pc(b.old, b.type === 'removed' || b.type === 'modified' ? 'is-del' : ''), pc(b.new, b.type === 'added' || b.type === 'modified' ? 'is-add' : ''));
      if (b.type !== 'same') ch.push({ label: `Line ${(b.new || b.old).line}`, kind: `${b.type} paragraph`, go: () => { pv.querySelectorAll('.is-cur').forEach((n) => n.classList.remove('is-cur')); el.classList.add('is-cur'); el.scrollIntoView({ block: 'center' }); } });
      return el;
    };
    (S.all ? doc.blocks : doc.items).forEach((it) => pv.append(it.type === 'gap'
      ? h('button', { type: 'button', class: 'cmp-gap', onclick: (e) => e.currentTarget.replaceWith(...it.blocks.map(blockRow)) }, `${it.count} unchanged paragraphs — Expand`)
      : blockRow(it)));
    panel();
  };

  const layout = () => {
    last = '';
    if (S.mode === 'preview') return preview();
    L = S.mode === 'inline' ? cmp.inline : cmp.side;
    const key = S.mode === 'inline' ? 'inline' : 'side';
    items = fold(L, CTX, S.all || open);
    ch = cmp.changes.map((c) => ({ label: `${c.old ? 'Old line' : 'Line'} ${c.line}`, add: c.add, del: c.del, go: () => { const i = items.findIndex((it) => it.i === c[key]); vp.scrollTop = Math.max(0, i * ROW - vp.clientHeight / 3); } }));
    spacer.style.height = items.length * ROW + 'px';
    paint(); panel();
  };

  const mark = () => chBtns.forEach((b, n) => { b.classList.toggle('is-cur', n === S.cur); b.setAttribute('aria-current', n === S.cur ? 'true' : 'false'); });
  const select = (n) => {
    S.cur = n; ch[n].go(); last = ''; paint(); mark(); if (onState) onState();
    if (chBtns[n]) chBtns[n].scrollIntoView({ block: 'nearest' });
    live.textContent = `Change ${n + 1} of ${ch.length}`;
  };
  const sumText = () => {
    const s = doc && doc.summary;
    sum.textContent = !cmp.changes.length && s && !s.changed ? 'No differences'
      : [`+${cmp.add} −${cmp.del} lines`, s ? `${s.modified} modified paragraphs · ${s.added} added · ${s.removed} removed · metadata ${s.frontmatter} · links ${s.links} · images ${s.images}` : fail ? '' : 'Analysing…'].filter(Boolean).join(' · ');
  };
  const btns = () => {
    const on = (b, v) => b.setAttribute('aria-pressed', String(v));
    on(B.side, S.mode === 'side'); on(B.inline, S.mode === 'inline'); on(B.pv, S.mode === 'preview'); on(B.ws, S.ws); on(B.fold, S.all);
    B.fold.textContent = S.all ? 'Collapse unchanged' : 'Expand unchanged';
  };
  function panel() {
    sumText();
    B.prev.disabled = B.next.disabled = !ch.length;
    chHead.textContent = `Changes (${ch.length})`;
    chBtns = ch.slice(0, 2000).map((c, n) => h('button', { type: 'button', class: 'cmp-chg', onclick: () => select(n) }, h('span', {}, c.label), h('small', {}, c.kind || `+${c.add} −${c.del}`)));
    chList.replaceChildren(...chBtns.map((b) => h('li', {}, b)));
    mark(); btns(); if (onState) onState();
  }
  const other = () => {
    const d = doc, rows = [
      ...d.frontmatter.added.map((x) => ['Metadata added', `${x.key}: ${cut(x.value)}`]),
      ...d.frontmatter.removed.map((x) => ['Metadata removed', x.key]),
      ...d.frontmatter.changed.map((x) => ['Metadata changed', `${x.key}: ${cut(x.from)} → ${cut(x.to)}`]),
    ];
    for (const [name, f, v] of [['Link', lk, d.links], ['Image', im, d.images]]) {
      rows.push(...v.added.map((x) => [`${name} added`, f(x)]), ...v.removed.map((x) => [`${name} removed`, f(x)]), ...v.changed.map((x) => [`${name} changed`, `${f(x.from)} ⇒ ${f(x.to)}`]));
    }
    difList.replaceChildren(...(rows.length ? rows.slice(0, 300).map(([a, b]) => h('li', { class: 'cmp-dif' }, h('b', {}, a), ' ', b)) : [h('li', { class: 'cmp-none' }, 'None')]));
  };
  const rebuild = () => { cmp = compareLines(oldText, newText, S.ws); open = new Set(); S.cur = -1; layout(); };
  const setMode = (m) => { S.mode = m; S.cur = -1; spacer.hidden = m === 'preview'; pv.hidden = m !== 'preview'; heads.hidden = m === 'inline'; vp.scrollTop = 0; layout(); };

  const dlg = openDialog({
    title, icon: 'git-compare', width: 1400, cls: 'lv-cmp-dlg', buttons: buttons || [{ label: 'Close' }],
    onClose: () => { dead = true; if (io) io.disconnect(); if (onClose) onClose(); },
    body: h('div', { class: 'lv-cmp' },
      h('div', { class: 'cmp-bar', role: 'toolbar', 'aria-label': 'Comparison' }, B.prev, B.next, B.side, B.inline, B.pv, B.ws, B.fold, B.cl, B.cr, B.rs, B.ol, B.or, sum),
      h('div', { class: 'cmp-main' }, h('div', { class: 'cmp-view' }, heads, vp),
        h('aside', { class: 'cmp-side', 'aria-label': 'Comparison details' }, chHead, chList, h('h3', {}, 'Other differences'), difList)),
      live),
  });
  vp.addEventListener('scroll', paint, { passive: true });
  new ResizeObserver(() => { last = ''; paint(); }).observe(vp);
  rebuild();
  if (mode && mode !== S.mode) setMode(mode);
  vp.focus();
  const analyse = () => setTimeout(() => {
    if (dead) return;
    try { doc = diffDocument(oldText, newText); other(); } catch { fail = true; difList.replaceChildren(h('li', { class: 'cmp-none' }, 'Unavailable')); }
    if (S.mode === 'preview') layout(); else sumText();
  }, 0);
  analyse();
  const range = (c, k, n) => {
    const rows = cmp.side.slice(c.side, c.side + Math.max(c.add, c.del)).map((x) => x[k]).filter(Boolean);
    if (rows.length) return [rows[0][n] - 1, rows[rows.length - 1][n]];
    const p = c.side ? cmp.side[c.side - 1][k][n] : 0;
    return [p, p];
  };
  const lines = (t) => t.replace(/\r\n?/g, '\n').split('\n');
  const apply = async (dir, next) => {
    if (!edit[dir] || !(await edit[dir](next, dir === 'left' ? oldText : newText))) return false;
    if (dir === 'left') oldText = next; else newText = next;
    const n = S.cur;
    rebuild(); analyse();
    if (ch.length) select(Math.min(Math.max(n, 0), ch.length - 1));
    return true;
  };

  return {
    step: (d) => { if (ch.length) select(S.cur < 0 ? (d > 0 ? 0 : ch.length - 1) : (S.cur + d + ch.length) % ch.length); },
    mode: setMode, state: () => S, count: () => ch.length, close: () => dlg.close(),
    can: (k) => (k === 'rs' ? !!restoreLabel && !!edit.right : k === 'ol' ? !!edit.openLeft : k === 'or' ? !!edit.openRight : !!edit[k]),
    copy: (dir) => {
      const c = cmp.changes[S.cur];
      if (!c || S.mode === 'preview') return;
      const A = lines(oldText), Z = lines(newText), [oa, ob] = range(c, 'l', 'a'), [na, nb] = range(c, 'r', 'b'), L = dir === 'left';
      const [f, t] = L ? [oa, ob] : [na, nb], T = L ? A : Z;
      return apply(dir, [...T.slice(0, f), ...(L ? Z.slice(na, nb) : A.slice(oa, ob)), ...T.slice(t)].join('\n'));
    },
    restore: () => (restoreLabel ? apply('right', oldText) : undefined),
    openSide: (k) => { (k === 'left' ? edit.openLeft : edit.openRight)(); dlg.close(); },
    toggleWs: () => { S.ws = !S.ws; rebuild(); },
    toggleFold: () => { S.all = !S.all; open = new Set(); S.cur = -1; layout(); },
  };
}
