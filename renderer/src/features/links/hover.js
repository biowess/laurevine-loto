import { classifyLink, resolveLink, parseWiki } from '../../core/links/resolve.js';
import { headingLine, linkAt } from '../../core/links/follow.js';
import { excerpt } from '../../core/links/backlinks.js';
import { baseName } from '../../core/documents/paths.js';
import { readPath } from '../../services/doc-client.js';

const TEXT = /\.(md|markdown|mdown|txt)$/i;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Non-blocking link preview: preview hover (delay) and Ctrl/Cmd-hover in the source. Plain text only, pointer-events none.
export function registerHover(ctx, { indexNow, absOf, relOf }) {
  const { store, settings, ui: { h }, services: { documents: D } } = ctx;
  const pop = h('div', { class: 'lk-pv', role: 'tooltip', style: { display: 'none' } });
  document.body.append(pop);
  let tok = 0, timer = 0, curEl = null, curKey = '', pt = null, ptimer = 0;
  const groups = () => [...document.querySelectorAll('#groups > .md-group')];
  const docOf = (grp) => { const g = store.get().editorGroups.groups[Math.max(0, groups().indexOf(grp))]; return g && g.activeId; };

  async function textOf(rel) {
    const id = D.findByPath(absOf(rel)), t = id && store.get().documents.tabs.find((x) => x.id === id);
    if (id && t && !t.dirty) return D.getEntry(id).doc.text;
    const r = await readPath(absOf(rel)).catch(() => null);
    return r && r.ok ? r.doc.text : null;
  }

  async function info(href, id) {
    const kind = classifyLink(href), strategy = settings.get('markdown.anchorStrategy');
    if (kind === 'external' || kind === 'mailto') {
      let t = kind === 'mailto' ? 'Email link' : 'External link';
      try { if (kind === 'external') t = new URL(href).hostname || t; } catch { /* keep default */ }
      return { title: t, path: clip(href, 120), note: 'Opens outside the app.' };
    }
    const from = relOf(id), r = resolveLink(href, { from, index: kind === 'anchor' ? null : await indexNow(), strategy });
    if (r.status === 'unknown') return { title: 'Link', bad: 'Open a workspace to resolve this link.' };
    if (r.status === 'ambiguous') return { title: 'Ambiguous link', bad: `Matches ${r.matches.length} files: ${r.matches.slice(0, 3).join(', ')}${r.matches.length > 3 ? ', …' : ''}` };
    if (r.status === 'missing-file') return { title: 'Broken link', bad: `File not found: ${r.path || parseWiki(href).target}` };
    const rel = kind === 'anchor' ? from : r.path;
    if (rel && !TEXT.test(rel)) return { title: baseName(rel), path: rel, note: 'Opens with another app.' };
    const e = !rel && D.getEntry(id), text = rel ? await textOf(rel) : e && e.doc.text;
    if (text == null) return { title: 'Broken link', bad: 'The file could not be read.', path: rel };
    const at = r.anchor ? headingLine(text, r.anchor, strategy) : -1;
    if (r.anchor && at < 0) return { title: 'Broken link', bad: `Heading not found: ${r.anchor}`, path: rel };
    const x = excerpt(text, at, baseName(rel || (e && e.doc.name) || 'Untitled').replace(TEXT, ''));
    return { title: x.title, lines: x.lines, path: rel ? `${rel}${r.anchor ? `#${r.anchor}` : ''}` : r.anchor ? `#${r.anchor}` : '' };
  }

  const hide = () => { tok++; clearTimeout(timer); clearTimeout(ptimer); curEl = null; curKey = ''; pop.style.display = 'none'; };

  async function show(href, id, at) {
    const my = ++tok;
    let i;
    try { i = await info(href, id); } catch { i = { title: 'Link', bad: 'This link could not be previewed.' }; }
    if (my !== tok) return;
    pop.className = `lk-pv${i.bad ? ' is-bad' : ''}`;
    pop.replaceChildren(h('b', { class: 'lk-pv__t' }, clip(i.title, 80)),
      ...(i.bad ? [h('div', { class: 'lk-pv__r' }, i.bad)] : []),
      ...(i.lines && i.lines.length ? [h('div', { class: 'lk-pv__x' }, clip(i.lines.join('\n'), 260))] : []),
      ...(i.note ? [h('div', { class: 'lk-pv__n' }, i.note)] : []),
      ...(i.path ? [h('div', { class: 'lk-pv__p' }, i.path)] : []));
    pop.style.display = 'block';
    const w = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = `${Math.max(8, Math.min(at.left, innerWidth - w - 8))}px`;
    pop.style.top = `${at.bottom + 6 + ph > innerHeight ? Math.max(8, at.top - ph - 6) : at.bottom + 6}px`;
  }

  document.addEventListener('mouseover', (e) => {
    const root = e.target.closest && e.target.closest('#prev, .md-prev');
    const w = root && e.target.closest('.lt-wiki'), a = root && !w && e.target.closest('a'), el = w || a;
    if (el === curEl) return;
    if (!el) { if (curEl) hide(); return; }
    hide();
    const href = w ? w.dataset.wiki : a.getAttribute('href');
    if (!href) return;
    curEl = el;
    timer = setTimeout(() => { const r = el.getBoundingClientRect(); show(href, docOf(root.closest('.md-group')), r); }, 400);
  }, true);

  function probe() {
    if (!pt) return;
    const dom = document.elementFromPoint(pt.x, pt.y), ed = dom && dom.closest && dom.closest('.cm-editor'), v0 = D.editorRun('view'), v = ed && v0 && v0.constructor.findFromDOM(ed);
    const pos = v && v.posAtCoords({ x: pt.x, y: pt.y }), href = pos != null && linkAt(v.state.doc.toString(), pos);
    if (!href) return curKey && hide();
    const key = `${pos}:${href}`;
    if (key === curKey) return;
    hide(); curKey = key;
    show(href, docOf(ed.closest('.md-group')), { left: pt.x, top: pt.y, bottom: pt.y + 14 });
  }
  document.addEventListener('mousemove', (e) => {
    if (!(e.ctrlKey || e.metaKey) || !e.target.closest || !e.target.closest('.cm-editor')) { if (curKey) hide(); pt = null; return; }
    pt = { x: e.clientX, y: e.clientY };
    clearTimeout(ptimer); ptimer = setTimeout(probe, 150);
  }, true);
  document.addEventListener('keyup', (e) => { if (e.key === 'Control' || e.key === 'Meta') { pt = null; hide(); } }, true);
  document.addEventListener('keydown', (e) => { if (!['Control', 'Meta', 'Shift', 'Alt'].includes(e.key) && pop.style.display !== 'none') hide(); }, true);
  document.addEventListener('mousedown', hide, true);
  document.addEventListener('scroll', () => { if (pop.style.display !== 'none') hide(); }, true);
  window.addEventListener('blur', hide);
}
