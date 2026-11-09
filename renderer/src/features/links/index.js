import { createHistory } from '../../core/links/history.js';
import { registerHover } from './hover.js';
import { planFollow, headingLine, linkAt } from '../../core/links/follow.js';
import { classifyLink, indexFiles } from '../../core/links/resolve.js';
import { activeIndex } from '../../core/documents/groups.js';
import { baseName } from '../../core/documents/paths.js';
import * as W from '../../services/workspace-client.js';
import { createIntegrityPanel } from './integrity-panel.js';
import { mountReferenceUpdates } from './reference-updates.js';
import { uiActions } from '../../state/slices/ui.js';

const frames = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
const posix = (p) => p.replace(/\\/g, '/');
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const later = (fn, n = 8) => { const t = () => { if (!fn() && --n > 0) setTimeout(t, 120); }; setTimeout(t, 60); };

export function register(ctx) {
  const { commands, store, settings, ui, services: { documents: D } } = ctx;
  const hist = createHistory();
  let cur = null, ix = null, ixRoot = '', ixAt = 0, raf = 0;
  const prev = () => document.getElementById('prev');
  const view = () => D.editorRun('view');
  const gs = () => store.get().editorGroups;
  const root = () => store.get().workspace.root;
  const strategy = () => settings.get('markdown.anchorStrategy');
  const sync = () => { commands.invalidate('nav.back'); commands.invalidate('nav.forward'); };
  const jump = (l) => { hist.jump(l); sync(); };

  const relOf = (id) => {
    const t = store.get().documents.tabs.find((x) => x.id === id), w = root() && posix(root()), p = t && t.path && posix(t.path);
    return w && p && p.startsWith(`${w}/`) ? p.slice(w.length + 1) : '';
  };
  const absOf = (rel) => { const r = root(), sep = r.includes('\\') ? '\\' : '/'; return r.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep); };

  const snap = (gi = activeIndex(gs())) => {
    const g = gs().groups[gi], id = g && g.activeId, v = view(), p = prev();
    if (!id) return null;
    const live = !!v && gi === activeIndex(gs());
    return { id, head: live ? v.state.selection.main.head : cur && cur.id === id ? cur.head : null, st: live ? v.scrollDOM.scrollTop : null, top: gi === 0 && p ? p.scrollTop : null };
  };
  const track = () => { raf = 0; cur = snap(); };
  const soon = () => { if (!raf) raf = requestAnimationFrame(track); };
  document.addEventListener('selectionchange', () => { const a = document.activeElement; if (a && a.closest && a.closest('.cm-editor')) soon(); });
  document.addEventListener('scroll', (e) => { const t = e.target; if (t.classList && (t.classList.contains('cm-scroller') || t.id === 'prev')) soon(); }, true);
  store.subscribe((s) => s.documents.activeId, () => { if (cur && cur.id !== store.get().documents.activeId) jump(cur); cur = null; frames(track); });

  function place(l) {
    const v = view(), p = prev();
    if (!v) return;
    if (l.head != null) v.dispatch({ selection: { anchor: Math.min(l.head, v.state.doc.length) } });
    if (l.st != null) v.scrollDOM.scrollTop = l.st;
    if (l.top != null && p && p.clientHeight) p.scrollTop = l.top;
    if (store.get().ui.mode !== 'preview') v.focus();
    cur = snap();
  }
  function step(dir) {
    const l = hist[dir](snap(), (x) => D.getEntry(x.id));
    sync();
    if (!l) return;
    if (store.get().documents.activeId === l.id) return frames(() => place(l));
    cur = null; D.activate(l.id);
    setTimeout(() => place(l), 150);
  }

  const ask = (title, text, label) => new Promise((res) => {
    let ok = false;
    ui.openDialog({ title, icon: 'triangle-alert', width: 420, body: text, buttons: [{ label: 'Cancel' }, { label, primary: true, onClick: () => { ok = true; } }], onClose: () => res(ok) });
  });
  const choose = (matches) => new Promise((res) => {
    let hit = null;
    const d = ui.openDialog({
      title: 'Choose a note', icon: 'file-search', width: 460,
      body: ui.h('div', { class: 'lp-list' }, ...matches.map((m) => ui.h('button', { type: 'button', class: 'lp-item', onclick: () => { hit = m; d.close(); } }, m))),
      buttons: [{ label: 'Cancel' }], onClose: () => res(hit),
    });
  });

  async function indexNow() {
    const ws = root();
    if (!ws) return null;
    if (ws !== ixRoot || Date.now() - ixAt > 5000) {
      ixRoot = ws; ixAt = Date.now();
      ix = await W.listFiles({ showHidden: !!settings.get('explorer.showHidden'), refresh: true }).then((f) => indexFiles(f.files.map(posix)), () => null);
    }
    return ix;
  }

  function gotoHeading(id, anchor) {
    if (!anchor) return;
    const e = D.getEntry(id), line = e ? headingLine(e.doc.text, anchor, strategy()) : -1;
    if (line < 0) return ui.toast(`Heading not found: ${anchor}`, { timeout: 4000 });
    later(() => {
      const v = view(), p = prev();
      if (!v || store.get().documents.activeId !== id) return false;
      const d = v.state.doc, pos = d.line(Math.min(d.lines, line + 1)).from;
      v.dispatch({ selection: { anchor: pos }, effects: v.constructor.scrollIntoView(pos, { y: 'start', yMargin: 40 }) });
      const vis = !!p && p.clientHeight > 0, h = vis && p.querySelector(`[data-src-line="${line + 1}"]`);
      if (h) h.scrollIntoView({ block: 'start' });
      if (store.get().ui.mode !== 'preview') v.focus();
      cur = snap();
      return !vis || !!h;
    });
  }

  async function openAbs(abs, anchor, from) {
    cur = from; jump(from);
    await commands.execute('file.open-recent', abs);
    const id = D.findByPath(abs);
    if (id) gotoHeading(id, anchor);
  }

  async function follow(href, gi = activeIndex(gs())) {
    const from = snap(gi), kind = classifyLink(href);
    if (!from) return;
    if (kind === 'external' || kind === 'mailto') return /^(https?|mailto):/i.test(href) ? window.open(href, '_blank', 'noopener') : ui.toast('This link type cannot be opened.');
    const plan = planFollow(href, { from: relOf(from.id), index: kind === 'anchor' ? null : await indexNow(), strategy: strategy() });
    if (plan.act === 'none') return ui.toast(plan.msg, { timeout: 4000 });
    if (plan.act === 'anchor') { cur = from; jump(from); return gotoHeading(from.id, plan.anchor); }
    if (plan.act === 'choose') { const m = await choose(plan.matches); return m && openAbs(absOf(m), plan.anchor, from); }
    if (plan.act === 'external') {
      const abs = absOf(plan.path);
      return await ask('Open With Another App', `Open ${baseName(abs)} with the default application? Only open files you trust.`, 'Open') && W.openExternal(abs).catch((e) => ui.toast((e && e.message) || 'The file could not be opened.'));
    }
    if (plan.act === 'create') {
      if (!await ask('Create file', `${plan.path} does not exist. Create it in the workspace?`, 'Create')) return;
      const abs = absOf(plan.path);
      try { const r = await W.createFile(abs.replace(/[\\/][^\\/]*$/, ''), baseName(abs)); ixAt = 0; return openAbs(r.path, '', from); } catch (e) { return ui.toast((e && e.message) || 'The file could not be created.', { timeout: 5000 }); }
    }
    return openAbs(absOf(plan.path), plan.anchor, from);
  }

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const dom = e.target.closest && e.target.closest('.cm-editor'), v0 = view(), v = dom && v0 && v0.constructor.findFromDOM(dom);
    const pos = v && v.posAtCoords({ x: e.clientX, y: e.clientY }), href = pos != null && linkAt(v.state.doc.toString(), pos);
    if (!href) return;
    e.preventDefault(); e.stopPropagation();
    follow(href, Math.max(0, [...document.querySelectorAll('#groups > .md-group')].indexOf(dom.closest('.md-group'))));
  }, true);

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#prev, .md-prev');
    if (!t || e.button !== 0) return;
    const w = e.target.closest('.lt-wiki'), a = !w && e.target.closest('a'), href = w ? w.dataset.wiki : a && a.getAttribute('href');
    if (!href || ['external', 'mailto'].includes(classifyLink(href))) return;
    if (href[0] === '#') { const n = t.querySelector(`[id="${CSS.escape(dec(href.slice(1)))}"]`); if (!n || !/^H[1-6]$/.test(n.tagName)) return; }
    e.preventDefault(); e.stopPropagation();
    follow(href, Math.max(0, [...document.querySelectorAll('#groups > .md-group')].indexOf(t.closest('.md-group'))));
  }, true);

  const atCaret = () => {
    const v = view(), href = v && linkAt(v.state.doc.toString(), v.state.selection.main.head);
    return href ? follow(href) : ui.toast('The caret is not in a link.');
  };
  const reg = (id, title, icon, shortcut, run, extra) => commands.register({ id, title, icon, group: 'Navigate', shortcut, run, ...extra });
  reg('nav.back', 'Back', 'arrow-left', 'Alt+Left', () => step('back'), { enabled: () => hist.canBack(), reason: 'No earlier position' });
  reg('nav.forward', 'Forward', 'arrow-right', 'Alt+Right', () => step('forward'), { enabled: () => hist.canForward(), reason: 'No later position' });
  reg('link.open', 'Open Link at Caret', 'external-link', '', atCaret);
  reg('link.open-new-tab', 'Open Link in New Tab', 'external-link', '', atCaret);
  registerHover(ctx, { indexNow, absOf, relOf });

  const integrityPanel = createIntegrityPanel(ctx);
  ['left', 'right'].forEach((side) => {
    ctx.panels.register({
      id: 'integrity', side, icon: 'shield-check', title: 'Link Integrity',
      actions: [ui.kit.act('refresh-cw', 'ref.update')],
      render: () => integrityPanel.render(side),
    });
  });

  const showIntegrity = (tab) => {
    const s = store.get().ui.panels;
    ui.openPanel(s.right.open && s.right.view === 'integrity' ? 'right' : 'left', 'integrity');
    integrityPanel.open(tab);
  };

  const refCmd = (id, title, iconName, run) => commands.register({ id, title, icon: iconName, group: 'References', run });
  refCmd('ref.broken', 'Broken Links', 'unlink', () => showIntegrity('broken'));
  refCmd('ref.missing-files', 'Missing Files', 'file-x', () => showIntegrity('missing'));
  refCmd('ref.unused-assets', 'Unused Assets', 'file-warning', () => showIntegrity('unused'));
  refCmd('ref.update', 'Update References', 'refresh-cw', () => { integrityPanel.refresh(); showIntegrity(); ui.toast('Link integrity updated.'); });

  mountReferenceUpdates(ctx);
}

export { computeReferencePlan } from './reference-updates.js';