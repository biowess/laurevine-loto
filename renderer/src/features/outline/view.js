import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { openContextMenu } from '../../ui/kit/menu.js';
import { render } from '../../core/markdown/renderer.js';
import { getProfile } from '../../core/markdown/profiles.js';
import { buildNodes, visibleNodes, activeIndex, shownAncestor, headingLink, parentIds } from '../../core/outline/model.js';
import { subscribeSettings } from '../../services/settings-client.js';
import * as clip from '../../services/clipboard-client.js';

const RH = 26, VIRT = 300, OVER = 8;

const topLinePrev = (p) => {
  const bs = p.querySelectorAll(':scope > [data-src-line]'), top = p.getBoundingClientRect().top + 4;
  let lo = 0, hi = bs.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (bs[m].getBoundingClientRect().bottom > top) { r = m; hi = m - 1; } else lo = m + 1; }
  return r < 0 ? 1 : +bs[r].dataset.srcLine || 1;
};

export function createOutline(ctx) {
  const { store, settings, services: { documents }, ui: { runCommand, toast } } = ctx;
  const sc = h('div', { class: 'ol__sc', role: 'tree', tabindex: '0', 'aria-label': 'Document outline' }), sp = h('div', { class: 'ol__sp' }), note = h('div', { class: 'ol__note' });
  sc.append(sp);
  const el = h('div', { class: 'ol' }, note, sc);
  const pool = new Map(), free = [], coll = new Map();
  let nodes = [], rows = [], cs = new Set(), docId = null, lastText = null, lastKey = '', curLine = 1, actRow = -1, cur = -1, saved = 0, hold = 0, raf = 0, kind = '';

  const mkRow = () => h('div', { class: 'ol__row', role: 'treeitem' }, h('span', { class: 'ol__tw' }, icon('chevron-right')), h('span', { class: 'ol__t' }));

  function paint(r, n, i) {
    r._n = n;
    const open = n.kids && !cs.has(n.id), on = i === actRow, s = `${i}|${n.depth}|${n.text}|${n.level}|${n.kids ? (open ? 1 : 2) : 0}|${on ? 1 : 0}|${i === cur ? 1 : 0}`;
    if (r._s === s) return;
    r._s = s;
    r.style.top = `${i * RH}px`; r.style.paddingLeft = `${6 + n.depth * 14}px`;
    r.className = `ol__row ol__h${n.level}${n.kids ? ' has-kids' : ''}${open ? ' is-open' : ''}${on ? ' is-on' : ''}${i === cur ? ' is-cur' : ''}`;
    r.id = `ol-r${i}`; r.title = `H${n.level} · ${n.text}`;
    r.setAttribute('aria-level', String(n.depth + 1)); r.setAttribute('aria-selected', String(on));
    if (n.kids) r.setAttribute('aria-expanded', String(open)); else r.removeAttribute('aria-expanded');
    r.lastChild.textContent = n.text;
  }

  function layout() {
    const n = rows.length, virt = n > VIRT, y = sc.scrollTop, hgt = sc.clientHeight || 600;
    sp.style.height = `${n * RH}px`;
    const a = virt ? Math.max(0, Math.floor(y / RH) - OVER) : 0, b = virt ? Math.min(n, Math.ceil((y + hgt) / RH) + OVER) : n, keep = new Set();
    for (let i = a; i < b; i++) keep.add(rows[i].id);
    for (const [k, r] of pool) if (!keep.has(k)) { r.remove(); pool.delete(k); free.push(r); }
    for (let i = a; i < b; i++) {
      let r = pool.get(rows[i].id);
      if (!r) { r = free.pop() || mkRow(); r._s = ''; pool.set(rows[i].id, r); sp.append(r); }
      paint(r, rows[i], i);
    }
    free.length = Math.min(free.length, 60);
    sc.setAttribute('aria-activedescendant', cur >= a && cur < b ? `ol-r${cur}` : '');
  }

  const ensure = (i) => {
    if (i < 0) return;
    const t = i * RH;
    if (t < sc.scrollTop) sc.scrollTop = t; else if (t + RH > sc.scrollTop + sc.clientHeight) sc.scrollTop = t + RH - sc.clientHeight;
  };

  function mark(reveal) {
    const a = activeIndex(nodes, curLine);
    actRow = a < 0 ? -1 : rows.indexOf(nodes[shownAncestor(nodes, a, cs)]);
    if (reveal) ensure(actRow);
    layout();
  }

  function draw(msg) {
    cs = coll.get(docId) || new Set();
    rows = visibleNodes(nodes, cs);
    note.textContent = msg || (nodes.length ? '' : 'No headings in this document. Add markdown headings (# Heading) to structure your document.');
    note.hidden = !note.textContent;
    cur = Math.min(cur, rows.length - 1);
    mark(false);
  }

  function refresh() {
    const id = store.get().documents.activeId, e = id && documents.getEntry(id);
    if (!e) { docId = null; lastText = null; lastKey = ''; nodes = []; return draw('No document open. Open or create a file to view its outline.'); }
    const strat = settings.get('markdown.anchorStrategy'), key = `${id}|${strat}`;
    if (e.doc.text !== lastText || key !== lastKey) {
      if (id !== docId) cur = -1;
      docId = id; lastText = e.doc.text; lastKey = key;
      try {
        nodes = buildNodes(render(lastText, { profile: getProfile(e.profile || settings.get('markdown.defaultProfile')).id, anchorStrategy: strat }).headings);
      } catch (err) {
        nodes = [];
        return draw(`Could not generate outline: ${err.message || 'Parse error'}. Check document syntax.`);
      }
    }
    draw();
  }


  const lineNow = (k) => {
    const v = documents.editorRun('view'), p = document.getElementById('prev');
    if (v && v.dom.offsetParent && k !== 'prev') {
      const d = v.state.doc;
      return k === 'src' ? d.lineAt(v.lineBlockAtHeight(v.scrollDOM.scrollTop + 4).from).number : d.lineAt(v.state.selection.main.head).number;
    }
    return p && p.offsetParent ? topLinePrev(p) : curLine;
  };
  function queue(k) {
    if (k !== 'caret' && Date.now() < hold) return;
    kind = k;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (el.isConnected && nodes.length) { curLine = lineNow(kind); mark(true); } });
  }

  const find = (key) => (key ? nodes.find((n) => n.id === key) : nodes[activeIndex(nodes, curLine)]);

  function goto(key) {
    const n = find(key);
    if (!n) return;
    documents.editorRun('flush');
    hold = Date.now() + 600; curLine = n.line; mark(true);
    const v = documents.editorRun('view'), p = document.getElementById('prev');
    if (v && v.dom.offsetParent) {
      const d = v.state.doc, l = d.line(Math.min(Math.max(n.line, 1), d.lines));
      v.dispatch({ selection: { anchor: l.from }, effects: v.constructor.scrollIntoView(l.from, { y: 'start', yMargin: 8 }), userEvent: 'select.goto' });
      requestAnimationFrame(() => v.focus());
    }
    const t = p && p.offsetParent && p.querySelector(`[data-src-line="${n.line}"]`);
    if (t) p.scrollTop += t.getBoundingClientRect().top - p.getBoundingClientRect().top - 8;
  }
  const copyLink = (key) => {
    const n = find(key);
    if (n) clip.writeText(headingLink(n)).then(() => toast('Heading link copied')).catch(() => toast('Could not copy the link.'));
  };
  function setColl(s) { coll.set(docId, s); draw(); }
  const toggle = (key) => { const n = find(key); if (n && n.kids) { const s = new Set(cs); if (!s.delete(n.id)) s.add(n.id); setColl(s); } };
  const setAll = (on) => setColl(on ? parentIds(nodes) : new Set());

  sc.addEventListener('scroll', () => { saved = sc.scrollTop; if (rows.length > VIRT) layout(); });
  sc.addEventListener('click', (e) => {
    const r = e.target.closest('.ol__row');
    if (!r || !r._n) return;
    cur = rows.indexOf(r._n);
    runCommand(e.target.closest('.ol__tw') ? 'outline.collapse' : 'outline.goto', r._n.id);
  });
  sc.addEventListener('contextmenu', (e) => {
    const r = e.target.closest('.ol__row');
    if (!r || !r._n) return;
    const n = r._n, open = !cs.has(n.id), run = (id, a) => () => runCommand(id, a);
    openContextMenu(e, [
      { label: 'Go to Heading', icon: 'hash', onSelect: run('outline.goto', n.id) }, { label: 'Copy Heading Link', icon: 'link', onSelect: run('outline.copy-link', n.id) }, '-',
      { label: open ? 'Collapse' : 'Expand', icon: open ? 'chevron-down' : 'chevron-right', disabled: !n.kids, onSelect: run('outline.collapse', n.id) },
      { label: 'Collapse All', icon: 'chevrons-down-up', onSelect: run('outline.collapse-all') }, { label: 'Expand All', icon: 'chevrons-up-down', onSelect: run('outline.expand-all') },
    ]);
  });
  sc.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !rows.length) return;
    const k = e.key, n = rows[cur];
    if (k === 'ArrowDown' || k === 'ArrowUp') cur = Math.min(rows.length - 1, Math.max(0, (cur < 0 ? Math.max(actRow, 0) : cur) + (k === 'ArrowDown' ? 1 : -1)));
    else if (k === 'Home') cur = 0;
    else if (k === 'End') cur = rows.length - 1;
    else if (k === 'Enter' && n) { e.preventDefault(); return runCommand('outline.goto', n.id); }
    else if (n && n.kids && ((k === 'ArrowLeft' && !cs.has(n.id)) || (k === 'ArrowRight' && cs.has(n.id)))) { e.preventDefault(); return runCommand('outline.collapse', n.id); }
    else return;
    e.preventDefault(); ensure(cur); layout();
  });
  if (window.ResizeObserver) new ResizeObserver(() => layout()).observe(sc);

  function wire() {
    const src = document.getElementById('src'), prev = document.getElementById('prev');
    let t = 0;
    const later = () => {
      clearTimeout(t);
      const delay = Math.min(2500, 400 + ((lastText ? lastText.length : 0) >> 9));
      t = setTimeout(() => {
        const doRefresh = () => { if (el.isConnected) { refresh(); queue('caret'); } };
        if (window.requestIdleCallback) window.requestIdleCallback(doRefresh, { timeout: 1000 });
        else doRefresh();
      }, delay);
    };
    documents.onDocChange((id) => { if (id === store.get().documents.activeId) later(); });
    store.subscribe((s) => s.documents.activeId, later);
    subscribeSettings(later);
    if (src) src.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('cm-scroller')) queue('src'); }, true);
    if (prev) prev.addEventListener('scroll', () => queue('prev'));
    document.addEventListener('selectionchange', () => { if (src && src.contains(document.activeElement)) queue('caret'); });
  }

  return {
    wire, goto, copyLink, toggle, setAll, has: () => nodes.length > 0,
    mount() { refresh(); queue('caret'); requestAnimationFrame(() => { sc.scrollTop = saved; layout(); }); return el; },
  };
}
